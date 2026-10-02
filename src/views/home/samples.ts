import collectionPgn from "../../data/frontPage/collection.pgn?raw";
import gamePgn from "../../data/frontPage/game.pgn?raw";
import repertoirePgn from "../../data/frontPage/repertoire.pgn?raw";
import { demoTreeOfGameTree, demoTreeOfOpeningTree, type DemoNode } from "../../lib/demoTree";
import { openingTreeOf } from "../../lib/openingTree";
import { parsePgnGames, parsePgnTree } from "../../lib/pgn";

/**
 * **The front page's sample data** (CTA-126) — what its demo boards replay,
 * shipped as three PGN files under `src/data/frontPage/` (that folder's
 * README says what each is and how to swap one):
 *
 * - **the game** — one game, its moves and any side lines;
 * - **the repertoire** — a tree of lines, its branches weighted by their `prc`
 *   play chances (`lib/playChance.ts`), as the repertoire trainer plays them;
 * - **the collection** — a slice of a Library collection's games, merged into
 *   the opening tree the Library's opening-moves filter draws
 *   (`lib/openingTree.ts`).
 *
 * The files are bundled as text (`?raw`, ~17 KB together) and parsed the first
 * time a board asks, once.
 */

export const SAMPLE_IDS = ["game", "repertoire", "collection"] as const;
export type SampleId = (typeof SAMPLE_IDS)[number];

export type DemoSample = {
  root: DemoNode;
  /** The position the tree starts from; the standard start when absent. */
  startFen?: string;
};

const STANDARD_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const fromTree = (pgn: string): DemoSample => {
  const tree = parsePgnTree(pgn);
  return {
    root: demoTreeOfGameTree(tree),
    ...(tree.startFen !== STANDARD_START ? { startFen: tree.startFen } : {}),
  };
};

const fromCollection = (pgn: string): DemoSample => ({
  root: demoTreeOfOpeningTree(
    openingTreeOf(
      parsePgnGames(pgn).map((game) => ({
        line: game.moves.map((move) => move.san),
        result: game.headers.Result?.trim() || "*",
      })),
    ),
  ),
});

let samples: Record<SampleId, DemoSample> | undefined;

/** Every sample, parsed on the first call and kept. */
export const demoSamples = (): Record<SampleId, DemoSample> =>
  (samples ??= {
    game: fromTree(gamePgn),
    repertoire: fromTree(repertoirePgn),
    collection: fromCollection(collectionPgn),
  });
