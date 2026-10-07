import type { GameHeaders } from "../../../lib/gameModel";
import { participantsOf, type Participant } from "../../../lib/tournamentParticipants";

/*
  The participants table's samples (CTA-142): hand-made games read by
  `src/lib/`'s own `participantsOf`. Imported only by the block's gallery
  and its test.
*/

type Side = { name: string; title?: string; elo?: number; country?: string; team?: string };

const game = (round: number, white: Side, black: Side, result: string): GameHeaders => {
  const tags = (side: "White" | "Black", player: Side): GameHeaders => ({
    [side]: player.name,
    ...(player.title !== undefined && { [`${side}Title`]: player.title }),
    ...(player.elo !== undefined && { [`${side}Elo`]: String(player.elo) }),
    ...(player.country !== undefined && { [`${side}Country`]: player.country }),
    ...(player.team !== undefined && { [`${side}Team`]: player.team }),
  });
  return { Event: "Club championship", Round: String(round), ...tags("White", white), ...tags("Black", black), Result: result };
};

const ANNA = { name: "Muzychuk, Anna", title: "GM", elo: 2520, country: "UKR" };
const BORIS = { name: "Gelfand, Boris", title: "GM", elo: 2650, country: "ISR" };
const CARLA = { name: "Heredia, Carla", title: "WFM", elo: 2140, country: "ESP" };
const DAN = { name: "Levi, Dan" };

/** Four players, three rounds — titles, flags, an unrated player, an unfinished game. */
export const CLUB: readonly Participant[] = participantsOf([
  game(1, ANNA, DAN, "1-0"),
  game(1, BORIS, CARLA, "1/2-1/2"),
  game(2, CARLA, ANNA, "0-1"),
  game(2, DAN, BORIS, "0-1"),
  game(3, ANNA, BORIS, "1/2-1/2"),
  game(3, CARLA, DAN, "*"),
]);

/** A team event: each player's team. */
export const TEAMS: readonly Participant[] = participantsOf([
  game(1, { ...ANNA, team: "Kyiv" }, { ...BORIS, team: "Haifa" }, "1/2-1/2"),
  game(1, { ...DAN, team: "Haifa" }, { ...CARLA, team: "Kyiv" }, "0-1"),
]);

/** A long field: 60 players of a Swiss's top boards. */
export const LONG: readonly Participant[] = participantsOf(
  Array.from({ length: 60 }, (_, index) =>
    game(1 + (index % 5), { name: `Player ${index * 2 + 1}`, elo: 2000 + index }, { name: `Player ${index * 2 + 2}`, elo: 1990 + index }, index % 3 === 0 ? "1-0" : "1/2-1/2"),
  ),
);
