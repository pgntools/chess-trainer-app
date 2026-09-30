/**
 * A game's `Result` tag as each player fared — the pure half of the player
 * plates (CTA-105), kept out of `PlayerPlate.tsx` the way the shared pieces
 * keep their logic (`moveSelection.ts`, `savedList.ts`): fast refresh only
 * works over a file that exports components alone.
 */

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
