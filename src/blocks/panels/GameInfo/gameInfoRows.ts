import { gameTag, type Game } from "../../../lib/gameModel";

/** The tags worth naming, in display order, with their label key under `gamePanel.info`. */
const NAMED_TAGS = [
  ["Event", "event"],
  ["Site", "site"],
  ["Date", "date"],
  ["Round", "round"],
  ["White", "white"],
  ["Black", "black"],
  ["Result", "result"],
  ["ECO", "eco"],
  ["Opening", "opening"],
  ["TimeControl", "timeControl"],
  ["Termination", "termination"],
] as const;

const NAMED = new Set<string>(NAMED_TAGS.map(([tag]) => tag));

/** One tag to show: its name, its label key (absent for a tag shown under its own name), its value. */
export type GameInfoRow = { tag: string; labelKey?: string; value: string };

/**
 * A game's tags as the Info tab lists them: the named tags that hold a value,
 * in the spec's order, then every other tag in the file's order. A
 * placeholder value reads as absent (`gameTag`).
 */
export const gameInfoRows = (game: Game): GameInfoRow[] => {
  const named = NAMED_TAGS.flatMap(([tag, labelKey]) => {
    const value = gameTag(game.headers, tag);
    return value === undefined ? [] : [{ tag, labelKey, value }];
  });
  const extra = Object.keys(game.headers)
    .filter((tag) => !NAMED.has(tag))
    .flatMap((tag) => {
      const value = gameTag(game.headers, tag);
      return value === undefined ? [] : [{ tag, value }];
    });
  return [...named, ...extra];
};
