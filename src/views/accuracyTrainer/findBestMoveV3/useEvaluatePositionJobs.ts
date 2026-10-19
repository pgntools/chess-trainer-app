import { useCallback, useMemo, useSyncExternalStore } from "react";
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
import { EVALUATE_POSITION_KIND, parseEvaluatePositionResult, type EvaluatePositionInput } from "../../../lib/jobs/kinds/evaluatePosition/core";
import { jobRuntime } from "../../../lib/jobs/runtime";
import { useJobRecords } from "../../jobs/useJobs";
import { useEngineChoice } from "../../shared/useEngineChoice";
import { useEngineSearchSettings } from "../../shared/useEngineSearchSettings";

/** Where a position's Evaluate Position job is, as the trainer reads it. */
export type PositionEngineState =
  /** No job for it. */
  | { kind: "none" }
  /** Queued or searching (or paused, waiting) — a Choose waits for it. */
  | { kind: "pending"; jobId: string }
  /** Searched: its result. */
  | { kind: "done"; jobId: string; result: PositionResult }
  /** Failed, cancelled or gone — graded with the tree's lines alone. */
  | { kind: "unavailable"; jobId: string };

/** A position to search, as the trainer names it. */
export type PositionToEvaluate = { fen: string; path: readonly string[]; label: string };

const resultOf = (record: JobRecord): PositionResult | undefined => {
  const output = record.outputs.find((each) => each.kind === "data" && each.key === "result");
  return output?.kind === "data" ? parseEvaluatePositionResult(output.value) : undefined;
};

const stateOf = (jobId: string, record: JobRecord | undefined, read: boolean): PositionEngineState => {
  if (record === undefined) return read ? { kind: "unavailable", jobId } : { kind: "pending", jobId };
  if (record.status === "done") {
    const result = resultOf(record);
    return result === undefined ? { kind: "unavailable", jobId } : { kind: "done", jobId, result };
  }
  if (record.status === "failed" || record.status === "cancelled") return { kind: "unavailable", jobId };
  return { kind: "pending", jobId };
};

/**
 * **Find Best Move v2's Evaluate Position jobs** (CTA-238) — the screen's
 * side of the kind: `evaluate` queues one for a position, with the search
 * the top bar's Engine menu sets (the board's engine and its selected
 * preset, depth, move time, Threads and Hash) and MultiPV `lines`; `stateOf`
 * reads where each of the session's jobs is, from the runtime's records;
 * `merges` lists the done ones — the Case's merges the session's autosave
 * must carry, so its write is never one from before their lines.
 */
export const useEvaluatePositionJobs = ({
  caseId,
  lines,
  jobIds,
}: {
  /** The session's Case — every job's subject. */
  caseId: string | undefined;
  lines: number;
  /** The session's jobs, by position. */
  jobIds: readonly (string | null)[];
}) => {
  const records = useJobRecords();
  const { engineId } = useEngineChoice();
  const { settings } = useEngineSearchSettings();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(subscribeEnginePresetSelections, enginePresetSelectionsSnapshot, enginePresetSelectionsSnapshot);

  const byId = useMemo(() => new Map((records ?? []).map((record) => [record.id, record])), [records]);
  const states = useMemo(
    () => jobIds.map((jobId): PositionEngineState => (jobId === null ? { kind: "none" } : stateOf(jobId, byId.get(jobId), records !== undefined))),
    [jobIds, byId, records],
  );
  const merges = useMemo(() => states.flatMap((state) => (state.kind === "done" ? [state.jobId] : [])), [states]);

  /** Queue the search of one position — its id, or `undefined` when the runtime refused it. */
  const evaluate = useCallback(
    async ({ fen, path, label }: PositionToEvaluate, title: string): Promise<string | undefined> => {
      if (caseId === undefined) return undefined;
      const engine = resolveEngine(engineId).id;
      const preset = selectedPresetOf(presets ?? [], selections ?? [], engine);
      const input: EvaluatePositionInput = {
        caseId,
        name: title,
        fen,
        path,
        label,
        engine,
        preset: { id: preset.id, name: preset.name, values: presetSentValues(preset) },
        search: { depth: settings.depth, moveTimeMs: settings.moveTimeMs, threads: settings.threads, hashMb: settings.hashMb, multiPv: lines },
      };
      const queued = await jobRuntime().enqueue(EVALUATE_POSITION_KIND, input);
      return "id" in queued ? queued.id : undefined;
    },
    [caseId, engineId, presets, selections, settings, lines],
  );

  return { states, merges, evaluate };
};
