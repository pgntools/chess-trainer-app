import type { SideValue } from "../../../design-system/components/forms";
import { trainingPositionsOf } from "../../../lib/accuracyTrainer";
import type { FindBestMoveRecord } from "../../../lib/findBestMove/model";
import { isOlderSessionTags, isSessionTags, sessionRecordOf } from "../../../lib/findBestMove/pgn";
import type { GameTree } from "../../../lib/gameTree";

/** A game loaded: its name and its tree — whether it trains is read from it as it stands (`trainingPositionsOf`). */
export type SessionSource = { name: string; tree: GameTree };

/**
 * **What a new session's setup reads from what is loaded** (CTA-239; v4's
 * format since CTA-244) — the form's Start and the setup's words alike: a
 * session's own PGN (its record, `null` one this build cannot read — an
 * older session's among them), or a game's positions to train for the
 * engine switch and the side — and whether Start can go.
 */
export type SetupReading = {
  /** A session's own PGN — its record; `null` its tags say session but it does not read; `undefined` a plain game. */
  session: FindBestMoveRecord | null | undefined;
  /** A plain game's positions to train, each side's and the side picked's. */
  count: number;
  white: number;
  black: number;
  forSide: number;
  /** A plain game with nothing to train — no engine lines while the engine is off. */
  refused: boolean;
  /** Start (or Resume) can go. */
  startable: boolean;
};

/** **The setup's reading** of a source, with the engine switch and the side as they are. */
export const setupReadingOf = (source: SessionSource | null, engine: boolean, side: SideValue): SetupReading => {
  const headers = source?.tree.headers ?? {};
  const session =
    source === null || (!isSessionTags(headers) && !isOlderSessionTags(headers)) ? undefined : (sessionRecordOf(headers)?.record ?? null);
  const positions = source === null || session !== undefined ? [] : trainingPositionsOf(source.tree, { unevaluated: engine });
  const white = positions.filter((position) => position.turn === "w").length;
  const black = positions.length - white;
  const forSide = side === "white" ? white : side === "black" ? black : white + black;
  const refused = source !== null && session === undefined && positions.length === 0;
  const startable = source !== null && (session === undefined ? forSide > 0 : session !== null);
  return { session, count: positions.length, white, black, forSide, refused, startable };
};
