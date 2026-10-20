import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { JobRecord } from "@pgntools/jobs-runtime";

import type { PositionResult } from "../../../lib/computerAnalysis";
import { resolveEngine } from "../../../lib/engines";
import {
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
} from "../../../lib/enginePresetStore";
import { presetSentValues, selectedPresetOf } from "../../../lib/enginePresets";
import { positionFenOf, type FindBestMoveRecord, type PositionKey } from "../../../lib/findBestMove/model";
import { sessionEvents, type SessionEvent } from "../../../lib/findBestMove/reducer";
import {
  EVALUATE_POSITION_INPUT_VERSION,
  EVALUATE_POSITION_KIND,
  parseEvaluatePositionResult,
  type EvaluatePositionInput,
} from "../../../lib/jobs/kinds/evaluatePosition/core";
import { jobRuntime } from "../../../lib/jobs/runtime";
import { useJobRecords } from "../../jobs/useJobs";
import { useEngineChoice } from "../../shared/useEngineChoice";
import { useEngineSearchSettings } from "../../shared/useEngineSearchSettings";

const resultOf = (record: JobRecord): PositionResult | undefined => {
  const output = record.outputs.find((each) => each.kind === "data" && each.key === "result");
  return output?.kind === "data" ? parseEvaluatePositionResult(output.value) : undefined;
};

/**
 * **A session's engine jobs — the engine unit** (CTA-244, the design note
 * §6.2, §7). The record says which positions want their engine (`wanted`,
 * persisted, so a reload still asks); this unit does the rest:
 *
 * - **Queues** one Evaluate Position job for each — the Engine menu's search
 *   (the board's engine and its selected preset, depth, move time, Threads,
 *   Hash), MultiPV N — then writes `engineQueued`, or `engineFailed` when the
 *   runtime refuses. A position being queued is in flight here, so a render
 *   never queues it twice.
 * - **Watches** the queued jobs' records and **echoes** what became of them:
 *   `engineSearched` with a done job's result (the job writes the same event
 *   itself — the echo converges two tabs, and is idempotent), or
 *   `engineFailed` for a job failed, cancelled or gone.
 */
export const useSessionEngine = ({
  caseId,
  record,
  dispatch,
  titleOf,
  labelOf,
}: {
  caseId: string;
  record: FindBestMoveRecord;
  dispatch: (events: readonly SessionEvent[]) => Promise<unknown>;
  /** A job's title, by its position. */
  titleOf: (key: PositionKey) => string;
  /** The move to find, as the live progress names it ("12. White"). */
  labelOf: (key: PositionKey) => string;
}) => {
  const records = useJobRecords();
  const { engineId } = useEngineChoice();
  const { settings } = useEngineSearchSettings();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(subscribeEnginePresetSelections, enginePresetSelectionsSnapshot, enginePresetSelectionsSnapshot);

  const byId = useMemo(() => new Map((records ?? []).map((job) => [job.id, job])), [records]);
  // Jobs queued here whose record the runtime's list has not shown yet — pending, not gone. Dropped once it shows.
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  if ([...fresh].some((id) => byId.has(id))) setFresh(new Set([...fresh].filter((id) => !byId.has(id))));

  /** One position's search queued — its job's id, or `undefined` when the runtime refused it. */
  const enqueue = useCallback(
    async (key: PositionKey): Promise<string | undefined> => {
      const fen = positionFenOf(record.game, key);
      if (fen === undefined) return undefined;
      const engine = resolveEngine(engineId).id;
      const preset = selectedPresetOf(presets ?? [], selections ?? [], engine);
      const input: EvaluatePositionInput = {
        version: EVALUATE_POSITION_INPUT_VERSION,
        caseId,
        key,
        name: titleOf(key),
        fen,
        label: labelOf(key),
        engine,
        preset: { id: preset.id, name: preset.name, values: presetSentValues(preset) },
        search: { depth: settings.depth, moveTimeMs: settings.moveTimeMs, threads: settings.threads, hashMb: settings.hashMb, multiPv: record.wanted },
      };
      const queued = await jobRuntime().enqueue(EVALUATE_POSITION_KIND, input);
      if (!("id" in queued)) return undefined;
      setFresh((current) => new Set([...current, queued.id]));
      return queued.id;
    },
    [record.game, record.wanted, caseId, engineId, presets, selections, settings, titleOf, labelOf],
  );

  // Every position that wants its engine, queued once.
  const inFlight = useRef(new Set<PositionKey>());
  useEffect(() => {
    for (const key of record.keys) {
      if (record.positions.get(key)?.engine.kind !== "wanted" || inFlight.current.has(key)) continue;
      inFlight.current.add(key);
      void enqueue(key)
        .then((jobId) => dispatch([jobId === undefined ? sessionEvents.engineFailed(key) : sessionEvents.engineQueued(key, jobId)]))
        .finally(() => inFlight.current.delete(key));
    }
  }, [record, enqueue, dispatch]);

  // What became of each queued job, echoed into the record.
  useEffect(() => {
    if (records === undefined) return;
    const events: SessionEvent[] = [];
    for (const key of record.keys) {
      const engine = record.positions.get(key)?.engine;
      if (engine?.kind !== "queued") continue;
      const job = byId.get(engine.jobId);
      if (job === undefined) {
        if (!fresh.has(engine.jobId)) events.push(sessionEvents.engineFailed(key, engine.jobId));
        continue;
      }
      if (job.status === "done") {
        const result = resultOf(job);
        events.push(result === undefined ? sessionEvents.engineFailed(key, engine.jobId) : sessionEvents.engineSearched(key, engine.jobId, result));
      } else if (job.status === "failed" || job.status === "cancelled") {
        events.push(sessionEvents.engineFailed(key, engine.jobId));
      }
    }
    if (events.length > 0) void dispatch(events);
  }, [records, byId, fresh, record, dispatch]);

  /** Whether a position's engine is still to answer — queued or searching. */
  const searchingAt = (key: PositionKey): boolean => {
    const kind = record.positions.get(key)?.engine.kind;
    return kind === "wanted" || kind === "queued";
  };

  return { searchingAt };
};
