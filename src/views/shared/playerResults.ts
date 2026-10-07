/**
 * A game's `Result` tag as each player fared — the pure half of the player
 * plates (CTA-105), kept out of `PlayerPlate.tsx` the way the shared pieces
 * keep their logic (`moveSelection.ts`, `savedList.ts`): fast refresh only
 * works over a file that exports components alone.
 */

import { gameTag, type GameHeaders } from "../../lib/gameModel";
import { eloOf } from "../../lib/libraryCollections";
import { SAVED_ANALYSIS_PLAYER } from "../../lib/savedAnalyses";
import type { PlayerPlates } from "./PlayerPlate";

/** What a drawn game's plate shows for either player — the half sign, one character. */
const HALF = "½";

/**
 * A PGN `Result` tag as each player fared — what their plate shows. `1-0`
 * and `0-1` are the win and the loss, `1/2-1/2` the half sign for both, and
 * anything else — `*`, the undecided or the unreadable — nothing at all.
 */
export const playerResultsOf = (result: string): { white?: string; black?: string } => {
  if (result === "1-0") return { white: "1", black: "0" };
  if (result === "0-1") return { white: "0", black: "1" };
  if (result === "1/2-1/2") return { white: HALF, black: HALF };
  return {};
};

/**
 * The plates of a game's players, from its tags (CTA-148, the Analysis
 * Board's — the Library's reads its own row): name, Elo and the result each
 * fared. **None** (`undefined`) unless the tags name someone — a position, or
 * an analysis written with the placeholder players (`Analysis`) or the
 * spec's unknown (`?`), is not a game. One player named plates the other as
 * `?`, as the Library's board does.
 */
export const playerPlatesOf = (headers: GameHeaders): PlayerPlates | undefined => {
  const named = (key: string) => {
    const name = gameTag(headers, key);
    return name === SAVED_ANALYSIS_PLAYER ? undefined : name;
  };
  const white = named("White");
  const black = named("Black");
  if (white === undefined && black === undefined) return undefined;
  const results = playerResultsOf(gameTag(headers, "Result") ?? "*");
  return {
    white: { name: white ?? "?", elo: eloOf(gameTag(headers, "WhiteElo")), result: results.white },
    black: { name: black ?? "?", elo: eloOf(gameTag(headers, "BlackElo")), result: results.black },
  };
};
