import { arenaOf, type Arena, type ArenaScoring } from "../../../lib/arena";
import type { GameHeaders } from "../../../lib/gameModel";

/*
  The arena table's samples (CTA-204): hand-made games tagged as Lichess
  exports them, read by `src/lib/`'s own `arenaOf` — so a change to its shape
  breaks them at compile time. Imported only by the block's gallery and its
  test.
*/

type Side = { name: string; title?: string; elo?: number; country?: string };

/** One game, `minute` minutes in — who went berserk, and how many plies it lasted. */
type FixtureGame = { minute: number; white: Side; black: Side; result: string; berserk?: "white" | "black"; plies?: number };

const headersOf = ({ minute, white, black, result, berserk }: FixtureGame, event: string): GameHeaders => {
  const tags = (side: "White" | "Black", player: Side): GameHeaders => ({
    [side]: player.name,
    ...(player.title !== undefined && { [`${side}Title`]: player.title }),
    ...(player.elo !== undefined && { [`${side}Elo`]: String(player.elo) }),
    ...(player.country !== undefined && { [`${side}Country`]: player.country }),
  });
  return {
    Event: event,
    Site: `https://lichess.org/fixture${minute}`,
    Round: "-",
    ...tags("White", white),
    ...tags("Black", black),
    Result: result,
    UTCDate: "2026.06.27",
    UTCTime: `${String(19 + Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00`,
    ...(berserk === "white" && { WhiteBerserk: "true" }),
    ...(berserk === "black" && { BlackBerserk: "true" }),
  };
};

/** An arena of these games, scored both ways — newest first, as Lichess exports them. */
const arenasOf = (games: readonly FixtureGame[], event: string): Readonly<Record<ArenaScoring, Arena>> => {
  const newestFirst = [...games].reverse();
  const headers = newestFirst.map((game) => headersOf(game, event));
  const plies = newestFirst.map((game) => game.plies ?? 60);
  return { lichess: arenaOf(headers, { scoring: "lichess", plies }), game: arenaOf(headers, { scoring: "game", plies }) };
};

const PENGUIN: Side = { name: "penguingim1", title: "GM", elo: 3180, country: "USA" };
const FALCON: Side = { name: "BrightFalcon", title: "IM", elo: 3147 };
const MSB: Side = { name: "msb2", title: "GM", elo: 3175, country: "GER" };
const YOO: Side = { name: "yyoochess", title: "GM", elo: 3202, country: "USA" };
const ROB: Side = { name: "rob188", title: "IM", elo: 3102, country: "ARM" };
/** No title, no rating, no federation. */
const NEWCOMER: Side = { name: "newcomer" };

/**
 * Six players, one of every mark: a run of wins on fire (penguingim1), a
 * berserked win — on fire too — and one too short for its point
 * (BrightFalcon), a draw on fire, a draw in the first 10 moves and a draw in
 * a draw streak (msb2), a lost berserk, an unfinished game, and a player
 * with no title, rating or flag.
 */
export const TITLED_ARENA = arenasOf(
  [
    { minute: 0, white: PENGUIN, black: NEWCOMER, result: "1-0" },
    { minute: 0, white: FALCON, black: ROB, result: "1-0", berserk: "white" },
    { minute: 0, white: MSB, black: YOO, result: "1/2-1/2" },
    { minute: 3, white: YOO, black: PENGUIN, result: "0-1" },
    { minute: 3, white: ROB, black: MSB, result: "1/2-1/2", plies: 18 },
    { minute: 3, white: NEWCOMER, black: FALCON, result: "0-1", berserk: "black", plies: 12 },
    { minute: 6, white: PENGUIN, black: ROB, result: "1-0", berserk: "white" },
    { minute: 6, white: FALCON, black: YOO, result: "1-0", berserk: "white" },
    { minute: 6, white: MSB, black: NEWCOMER, result: "1/2-1/2", plies: 30 },
    { minute: 9, white: ROB, black: PENGUIN, result: "1/2-1/2" },
    { minute: 9, white: YOO, black: FALCON, result: "1-0", berserk: "black" },
    { minute: 9, white: NEWCOMER, black: MSB, result: "0-1" },
    { minute: 12, white: PENGUIN, black: MSB, result: "1-0" },
    { minute: 12, white: ROB, black: YOO, result: "*" },
  ],
  "Titled Arena June '26",
);

/** Hebrew names, for the RTL pass — every game finished, so there is nothing unfinished for the legend. */
export const HEBREW_ARENA = arenasOf(
  [
    { minute: 0, white: { name: "טל, מיכאל", title: "GM", elo: 2705, country: "ISR" }, black: { name: "כהן, דנה", title: "WIM", elo: 2310 }, result: "1-0" },
    { minute: 4, white: { name: "כהן, דנה", title: "WIM", elo: 2310 }, black: { name: "לוי, יואב", elo: 2150 }, result: "1-0", berserk: "white" },
    { minute: 8, white: { name: "לוי, יואב", elo: 2150 }, black: { name: "טל, מיכאל", title: "GM", elo: 2705, country: "ISR" }, result: "0-1" },
    { minute: 12, white: { name: "כהן, דנה", title: "WIM", elo: 2310 }, black: { name: "טל, מיכאל", title: "GM", elo: 2705, country: "ISR" }, result: "1/2-1/2" },
  ],
  "ארנה",
);

/**
 * A big arena — 120 players, 40 games each, made up but scored by the real
 * rules — for paging and a long, wrapping score sheet.
 */
export const BIG_ARENA = (() => {
  const players: Side[] = Array.from({ length: 120 }, (_, index) => ({
    name: `player${String(index + 1).padStart(3, "0")}`,
    ...(index % 3 === 0 && { title: ["GM", "IM", "FM", "NM"][index % 4] }),
    elo: 3200 - index * 7,
  }));
  const games: FixtureGame[] = [];
  for (let minute = 0; minute < 40; minute += 1) {
    for (let pair = 0; pair < 60; pair += 1) {
      const white = players[(pair * 2 + minute) % 120];
      const black = players[(pair * 2 + 1 + minute * 3) % 120];
      if (white === black) continue;
      // Stronger players win more: a deterministic coin from the pair and the minute.
      const coin = (pair * 31 + minute * 17) % 10;
      const result = coin < 5 ? "1-0" : coin < 7 ? "1/2-1/2" : "0-1";
      games.push({ minute, white, black, result, ...(coin === 0 && { berserk: "white" as const }) });
    }
  }
  return arenasOf(games, "Big Arena");
})();

/** One game — two rows. */
export const ONE_GAME = arenasOf([{ minute: 0, white: PENGUIN, black: FALCON, result: "0-1" }], "One game");

/** A file with no game in it. */
export const EMPTY: Arena = arenaOf([], { scoring: "lichess" });
