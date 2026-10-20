import type { SideValue } from "../../../design-system/components/forms";
import { gamePositionsOf } from "../../../lib/accuracyTrainer";
import type { FindBestMoveRecord } from "../../../lib/findBestMove/model";
import { isSessionTags, sessionRecordOf } from "../../../lib/findBestMove/pgn";
import type { GameTree } from "../../../lib/gameTree";

/** A game loaded: its name and its tree — whether it trains is read from it as it stands (`gamePositionsOf`). */
export type SessionSource = { name: string; tree: GameTree };

/**
 * **What a new session's setup reads from what is loaded** (CTA-239; v4's
 * format since CTA-244) — the form's Start and the setup's words alike: a
 * session's own PGN (its record, `null` one this build cannot read), or a
 * game's positions to train for the side
 * — every one of a game with no engine line too (CTA-246) — and whether
 * Start can go.
 */
export type SetupReading = {
  /** A session's own PGN — its record; `null` its tags say session but it does not read; `undefined` a plain game. */
  session: FindBestMoveRecord | null | undefined;
  /** A plain game's positions to train, each side's and the side picked's. */
  count: number;
  white: number;
  black: number;
  forSide: number;
  /** A plain game with no engine line (CTA-246): trained all the same, the engine offered at each position. */
  noLines: boolean;
  /** Start (or Resume) can go. */
  startable: boolean;
};

/** **The setup's reading** of a source, with the side as it is. */
export const setupReadingOf = (source: SessionSource | null, side: SideValue): SetupReading => {
  const headers = source?.tree.headers ?? {};
  const session = source === null || !isSessionTags(headers) ? undefined : (sessionRecordOf(headers)?.record ?? null);
  const positions = source === null || session !== undefined ? [] : gamePositionsOf(source.tree);
  const white = positions.filter((position) => position.turn === "w").length;
  const black = positions.length - white;
  const forSide = side === "white" ? white : side === "black" ? black : white + black;
  const noLines = positions.length > 0 && positions.every((position) => position.topCount === 0);
  const startable = source !== null && (session === undefined ? forSide > 0 : session !== null);
  return { session, count: positions.length, white, black, forSide, noLines, startable };
};
