import { lazy } from "react";

import type { EvalSource } from "../types";
import { lichessEvalEntryOf, lookupLichessEval, positionResultOfLichessEval, writeLichessEval } from "./api";
import {
  LICHESS_EVAL_API_STORAGE_KEY,
  LICHESS_EVAL_SOURCE_ID,
  ensureLichessEvalApiChecked,
  lichessEvalApiConnection,
  lichessEvalApiMinWriteDepth,
  lichessEvalApiUrl,
  lichessEvalApiWriteUrl,
  resetLichessEvalApiSettings,
  storeLichessEvalApi,
  subscribeLichessEvalApi,
} from "./settings";

/**
 * **The lichess evaluation API as an eval source** (CTA-196) — the whole of
 * what the layer knows of it: on or off (`settings.ts`), a lookup
 * (`GET /fen` with `min_depth` the search's depth — CTA-256 —, its evals as
 * deep as asked merged up to the asked `MultiPV` — a hit only with that many
 * lines, or every legal move, CTA-253), a write (`POST /evals`, while writing is ticked, of a
 * search at least as deep as its minimum depth to write — CTA-202), its
 * tab of Settings → Engine and the connection its tab's dot shows (CTA-199).
 */
export const lichessEvalSource: EvalSource = {
  id: LICHESS_EVAL_SOURCE_ID,
  labelKey: "evalSources.lichess.name",
  titleKey: "evalSources.lichess.title",
  storageKeys: [LICHESS_EVAL_API_STORAGE_KEY],
  isEnabled: () => lichessEvalApiUrl() !== undefined,
  async lookup({ fen, depth, multiPv }, signal) {
    const url = lichessEvalApiUrl();
    if (url === undefined) return { kind: "missing" };
    const answer = await lookupLichessEval(url, fen, signal, depth);
    if (answer.kind !== "found") return answer;
    const result = positionResultOfLichessEval({ fen, multiPv }, answer.evals, depth);
    return result === undefined ? { kind: "missing" } : { kind: "found", result };
  },
  writesEnabled: () => lichessEvalApiWriteUrl() !== undefined,
  async record(result, meta, signal) {
    const url = lichessEvalApiWriteUrl();
    const entry = lichessEvalEntryOf(result, meta);
    // Nothing to send (a finished position, no line with a move, a search shallower than the minimum) is not a refusal.
    if (url === undefined || entry === undefined || entry.depth < lichessEvalApiMinWriteDepth()) return true;
    return writeLichessEval(url, entry, signal);
  },
  SettingsSection: lazy(() => import("./LichessEvalApiSection")),
  connection: {
    read: lichessEvalApiConnection,
    subscribe: subscribeLichessEvalApi,
    ensureChecked: ensureLichessEvalApiChecked,
    setEnabled: (enabled) => void storeLichessEvalApi(enabled),
  },
  reset: resetLichessEvalApiSettings,
};
