import { Chess, type Square } from "chess.js";

import type { PositionLine, PositionResult } from "./computerAnalysis";
import type { Score } from "./engineAnalysis";

/**
 * **The lichess evaluation database API** (CTA-193) — a FastAPI server over
 * lichess's Stockfish-evaluated positions (the `lichess-eval-db-api`
 * repository), which a Jobs V2 job asks about each position before searching
 * it with the engine. This module is the client, pure but for `fetch`:
 *
 * - **`GET /fen?fen=<4-field FEN>&best=true`** — the deepest eval of a
 *   position, its lines White's point of view (`cp` or `mate`, mate signed by
 *   who mates — `Score`'s own convention) and in UCI, the API's castling
 *   written king-takes-rook (`e1h1`), which {@link positionResultOfLichessEval}
 *   turns into the engine's `e1g1`. Not there is a 404.
 * - **`GET /health`** — `{ status: "ok", positions, … }`, what Connect checks.
 *
 * Every request gives up after {@link LICHESS_EVAL_API_TIMEOUT_MS}. The
 * settings (on or off, the address) are `lib/jobsSettings.ts`'s.
 */

/** How long a request waits for the API before calling it unreachable. */
export const LICHESS_EVAL_API_TIMEOUT_MS = 5000;

/** One line of an eval, as this app reads it: its score (White's view) and its moves in UCI. */
export type LichessEvalLine = { score: Score; moves: string[] };

/** The deepest eval the API holds for a position. */
export type LichessEval = { depth: number; lines: LichessEvalLine[] };

/** What a lookup came to: an eval, nothing for that position, or no usable answer at all. */
export type LichessEvalLookup = { kind: "found"; eval: LichessEval } | { kind: "missing" } | { kind: "unreachable" };

/**
 * **The FEN the API matches on**: its first four fields, the en passant square
 * written only when a capture there is legal — the dataset's form (after
 * 1.e4 c5, `-`, never `c6`). `null` for text that is not a position.
 */
export const lichessEvalFen = (fen: string): string | null => {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const [board, turn, castling, enPassant] = chess.fen().split(" ");
  const capture = enPassant !== "-" && chess.moves({ verbose: true }).some((move) => move.to === enPassant && move.isEnPassant());
  return [board, turn, castling, capture ? enPassant : "-"].join(" ");
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isInteger = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);

/** A line of the API's answer — exactly one of `cp` and `mate`, the moves split on spaces — or `undefined`. */
const lineFrom = (raw: unknown): LichessEvalLine | undefined => {
  if (!isRecord(raw)) return undefined;
  const { cp, mate, line } = raw;
  const score: Score | undefined = isInteger(mate) ? { kind: "mate", value: mate } : isInteger(cp) ? { kind: "cp", value: cp } : undefined;
  if (score === undefined) return undefined;
  const moves = typeof line === "string" ? line.trim().split(/\s+/).filter((move) => move !== "") : [];
  return { score, moves };
};

/** The deepest eval out of `GET /fen`'s body, or `undefined` when it is not that shape. */
export const lichessEvalFrom = (body: unknown): LichessEval | undefined => {
  if (!isRecord(body) || !Array.isArray(body.positions)) return undefined;
  const position: unknown = body.positions[0];
  if (!isRecord(position) || !Array.isArray(position.evals)) return undefined;
  const deepest: unknown = position.evals[0];
  if (!isRecord(deepest) || !isInteger(deepest.depth) || !Array.isArray(deepest.pvs)) return undefined;
  const lines = deepest.pvs.map(lineFrom);
  if (lines.length === 0 || lines.some((line) => line === undefined)) return undefined;
  return { depth: deepest.depth, lines: lines as LichessEvalLine[] };
};

/** `fetch` with the API's timeout, also given up when `signal` is. */
const fetchWithTimeout = async (url: string, signal?: AbortSignal): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LICHESS_EVAL_API_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};

/**
 * **Ask the API for a position's deepest eval.** A 404 — and a 422, a FEN it
 * will not take — is `missing`; a timeout, a network error, another status,
 * a body that is not JSON or not the API's shape is `unreachable`. Never throws.
 */
export const lookupLichessEval = async (baseUrl: string, fen: string, signal?: AbortSignal): Promise<LichessEvalLookup> => {
  const query = lichessEvalFen(fen);
  if (query === null) return { kind: "missing" };
  try {
    const response = await fetchWithTimeout(`${baseUrl}/fen?fen=${encodeURIComponent(query)}&best=true`, signal);
    if (response.status === 404 || response.status === 422) return { kind: "missing" };
    if (!response.ok) return { kind: "unreachable" };
    const found = lichessEvalFrom(await response.json().catch(() => undefined));
    return found === undefined ? { kind: "unreachable" } : { kind: "found", eval: found };
  } catch {
    return { kind: "unreachable" };
  }
};

/** What `GET /health` answered: the positions it holds and how long it took, or why it is no use. */
export type LichessEvalHealth =
  | { ok: true; positions: number; latencyMs: number }
  | { ok: false; reason: "unreachable" | "not-an-eval-api" };

/** **Check the API** — `GET /health`, `{ status: "ok", positions }` within the timeout. Never throws. */
export const checkLichessEvalApi = async (baseUrl: string): Promise<LichessEvalHealth> => {
  try {
    const sent = performance.now();
    const response = await fetchWithTimeout(`${baseUrl}/health`);
    const body: unknown = response.ok ? await response.json().catch(() => undefined) : undefined;
    const latencyMs = Math.round(performance.now() - sent);
    return isRecord(body) && body.status === "ok" && isInteger(body.positions)
      ? { ok: true, positions: body.positions, latencyMs }
      : { ok: false, reason: "not-an-eval-api" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
};

/**
 * A line's UCI moves as the engine writes them, as far as they are legal from
 * `fen`: the API's king-takes-rook castling (`e1h1`, `e8a8`) becomes the
 * king's two-square move (`e1g1`, `e8c8`); the line ends at a move that does
 * not play.
 */
const engineMovesOf = (fen: string, moves: readonly string[]): string[] => {
  const chess = new Chess(fen);
  const played: string[] = [];
  for (const uci of moves) {
    const from = uci.slice(0, 2);
    let to = uci.slice(2, 4);
    const piece = chess.get(from as Square);
    const target = chess.get(to as Square);
    if (piece?.type === "k" && target?.type === "r" && target.color === piece.color) {
      to = `${to[0] > from[0] ? "g" : "c"}${from[1]}`;
    }
    try {
      chess.move({ from, to, promotion: uci.slice(4) || undefined });
    } catch {
      break;
    }
    played.push(`${from}${to}${uci.slice(4)}`);
  }
  return played;
};

/**
 * **An API eval as a position's result** — when it is as deep as the job asks
 * (`depth >= minDepth`): its lines, the first `multiPv`, each with the eval's
 * depth and its moves as the engine writes them. A line that has no playable
 * move is dropped, and with no line 1 left there is no result. `undefined`
 * also for a shallower eval: the engine searches it then.
 */
export const positionResultOfLichessEval = (
  position: { fen: string; multiPv: number },
  found: LichessEval,
  minDepth: number,
): PositionResult | undefined => {
  if (found.depth < minDepth) return undefined;
  let lines: PositionLine[];
  try {
    lines = found.lines
      .slice(0, Math.max(1, position.multiPv))
      .map((line) => ({ score: line.score, depth: found.depth, pv: engineMovesOf(position.fen, line.moves) }));
  } catch {
    return undefined;
  }
  // Lines past one that does not play are out of order: they end there.
  const gap = lines.findIndex((line) => line.pv.length === 0);
  const kept = gap === -1 ? lines : lines.slice(0, gap);
  return kept.length === 0 ? undefined : { fen: position.fen, lines: kept };
};
