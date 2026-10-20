import { gamePositionsOf, sessionPositionsOf, type TrainingSide } from "../accuracyTrainer";
import { turnOf } from "../computerAnalysis";
import { ANALYSED_PLIES_TAG, ANALYSED_SIDE_TAG } from "../computerAnalysisTree";
import type { GameHeaders } from "../gameModel";
import { mainline, type GameTree } from "../gameTree";
import { DEFAULT_ENGINE_START, SESSION_FORMAT_VERSION, storedLinesOf, type FindBestMoveRecord, type PositionRecord } from "./model";

/**
 * **A session started** (CTA-244, the design note §3.1) — pure: from a game
 * (its positions for the side, R1, R4) or from one position (R2). The
 * recorded game is copied here and never edited after (R5): the manifest is
 * fixed now.
 */

/**
 * A new session's settings: how many best moves to find and the next-move
 * arrows. The engine is not one of them (CTA-246): a game's session starts
 * with it off — the first move where the lines are too few offers it — and a
 * position's with it on.
 */
export type NewSessionSettings = { moves: number; arrows: boolean };

/** The tags an analysis writes about itself — not the session's game's. */
const ANALYSIS_TAGS: readonly string[] = [ANALYSED_PLIES_TAG, ANALYSED_SIDE_TAG, "Annotator"];

/** The source game's own tags a session keeps — its analysis's left out. */
export const sourceHeadersOf = (headers: Readonly<GameHeaders>): GameHeaders =>
  Object.fromEntries(Object.entries(headers).filter(([name]) => !ANALYSIS_TAGS.includes(name)));

const openPosition = (key: number, lines: PositionRecord["lines"]): PositionRecord => ({
  key,
  lines,
  answer: { kind: "open" },
  engine: { kind: "idle" },
  work: null,
});

/**
 * **A session from a game** — its positions for the side
 * (`gamePositionsOf`: every analysed one — one with no side lines needs the
 * engine, CTA-245 — and every one of a game with no engine line, CTA-246),
 * each with the lines the game gives; the first on screen; the engine off.
 * `undefined` with none.
 */
export const sessionFromGame = ({
  tree,
  name,
  side,
  settings,
}: {
  tree: GameTree;
  name: string;
  side: TrainingSide;
  settings: NewSessionSettings;
}): FindBestMoveRecord | undefined => {
  const positions = sessionPositionsOf(gamePositionsOf(tree), side);
  const first = positions[0];
  if (first === undefined) return undefined;
  return {
    version: SESSION_FORMAT_VERSION,
    name,
    side,
    wanted: settings.moves,
    settings: { engine: false, arrows: settings.arrows, engineStart: DEFAULT_ENGINE_START },
    game: { startFen: tree.startFen, moves: mainline(tree).map((node) => node.san) },
    keys: positions.map((position) => position.ply),
    current: first.ply,
    positions: new Map(positions.map((position) => [position.ply, openPosition(position.ply, storedLinesOf(position))])),
  };
};

/**
 * **A session from one position** (the New session form's Board editor): no
 * game, one position — the side to move's — with no line of its own, so the
 * engine finds them (the session's engine on).
 */
export const sessionFromPosition = ({ fen, name, settings }: { fen: string; name: string; settings: NewSessionSettings }): FindBestMoveRecord => ({
  version: SESSION_FORMAT_VERSION,
  name,
  side: turnOf(fen),
  wanted: settings.moves,
  settings: { engine: true, arrows: settings.arrows, engineStart: DEFAULT_ENGINE_START },
  game: { startFen: fen, moves: [] },
  keys: [1],
  current: 1,
  positions: new Map([[1, openPosition(1, [])]]),
});
