import { lazy } from "react";

import type { EvalSource } from "../types";
import { lichessEvalEntryOf, lookupLichessEval, positionResultOfLichessEval, writeLichessEval } from "./api";
import {
  LICHESS_EVAL_API_STORAGE_KEY,
  LICHESS_EVAL_SOURCE_ID,
  lichessEvalApiUrl,
  lichessEvalApiWriteUrl,
  resetLichessEvalApiSettings,
} from "./settings";

/**
 * **The lichess evaluation API as an eval source** (CTA-196) — the whole of
 * what the layer knows of it: on or off (`settings.ts`), a lookup
 * (`GET /fen`, its deepest eval when as deep as asked, its lines up to the
 * asked `MultiPV`), a write (`POST /evals`, while writing is ticked) and its
 * section of Settings → Engine.
 */
export const lichessEvalSource: EvalSource = {
  id: LICHESS_EVAL_SOURCE_ID,
  labelKey: "evalSources.lichess.name",
  storageKeys: [LICHESS_EVAL_API_STORAGE_KEY],
  isEnabled: () => lichessEvalApiUrl() !== undefined,
  async lookup({ fen, depth, multiPv }, signal) {
    const url = lichessEvalApiUrl();
    if (url === undefined) return { kind: "missing" };
    const answer = await lookupLichessEval(url, fen, signal);
    if (answer.kind !== "found") return answer;
    const result = positionResultOfLichessEval({ fen, multiPv }, answer.eval, depth);
    return result === undefined ? { kind: "missing" } : { kind: "found", result };
  },
  writesEnabled: () => lichessEvalApiWriteUrl() !== undefined,
  async record(result, meta, signal) {
    const url = lichessEvalApiWriteUrl();
    const entry = lichessEvalEntryOf(result, meta);
    // Nothing to send (a finished position, no line with a move) is not a refusal.
    if (url === undefined || entry === undefined) return true;
    return writeLichessEval(url, entry, signal);
  },
  SettingsSection: lazy(() => import("./LichessEvalApiSection")),
  reset: resetLichessEvalApiSettings,
};
