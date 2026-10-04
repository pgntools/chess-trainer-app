import { gameTag, type GameHeaders } from "./gameModel";
import { outcomesOf, playerOf, POINTS, roundPartsOf, type GameOutcome, type TournamentPlayer } from "./tournament";

/**
 * **A knockout, read from its games' tags** (CTA-128): who met whom in each
 * round, the score of each match and who went through — what a bracket is
 * drawn from. Like `lib/tournament.ts` it is pure and reads tags only.
 *
 * What it reads, as The Week in Chess writes a knockout:
 *
 * - **`Round "R.G"`** — round R, game G of its match. Every game two
 *   competitors play in a round is one match, tiebreaks included.
 * - **A double elimination** keeps its losers' bracket in rounds numbered
 *   from `losersFromRound` (TWIC's 51 and up: `"51.1"` is the losers'
 *   bracket's first round). Absent, there is one bracket.
 * - **A team knockout** — every game names a `WhiteTeam` and a `BlackTeam` —
 *   is a match between the teams (a team's federation its players', where
 *   every tag agrees — never its name); `G` is then a *leg* (a mini-match on every
 *   board at once), won on its board points, and the match's score is the
 *   legs won (½ for a drawn leg), its board points kept beside it.
 *
 * A match's winner is the side with the higher score; on a level score (an
 * Armageddon draw, a tiebreak the file leaves out), the side that plays on
 * in a later round of the same bracket; else none.
 *
 * **A match for third place** — in a bracket's last round, between two sides
 * that both lost in the round before — is marked `thirdPlace` and comes after
 * the final.
 */

/** One side of a match: a player — or, in a team event, the team, by its name. */
export type KnockoutSide = {
  competitor: TournamentPlayer;
  /** Game points — or, in a team event, the legs won. */
  score: number;
  /** A team event's board points over every leg. */
  boardPoints?: number;
};

/** One game of a match, as the file has it. */
export type KnockoutGame = {
  /** The game's index in the headers given. */
  game: number;
  /** `G` of `Round "R.G"`: the game of the match — a team event's leg. */
  part: number | undefined;
  /** The ids of the sides that had White and Black — players, or teams. */
  white: string;
  black: string;
  /** What it was worth to White. */
  outcome: GameOutcome;
};

export type KnockoutMatch = {
  /** Unique in the knockout: the bracket, the round and the two sides. */
  id: string;
  /** In the order the file first shows them: the side with White in the match's first game first. */
  sides: readonly [KnockoutSide, KnockoutSide];
  games: readonly KnockoutGame[];
  /** How many of its games are unfinished (`*`) — they score nothing. */
  unfinished: number;
  /** A team event's legs. */
  legs?: number;
  /** Which side went through: `0`, `1`, or `undefined` where the file does not tell. */
  winner: 0 | 1 | undefined;
  /** The match for third place: in the last round, between two of the round before's losers. */
  thirdPlace?: boolean;
};

export type KnockoutRound = {
  /** 1 for the bracket's first round — a losers' bracket's `51` is its round 1. */
  round: number;
  /** In bracket order: two matches whose winners meet next are side by side. */
  matches: readonly KnockoutMatch[];
};

export type KnockoutBracket = { rounds: readonly KnockoutRound[] };

export type Knockout = {
  /** Every game names its teams: the sides are teams, a match's score is legs. */
  teams: boolean;
  /** The bracket — a double elimination's winners' bracket. */
  winners: KnockoutBracket;
  /** A double elimination's losers' bracket; `undefined` for a plain knockout. */
  losers: KnockoutBracket | undefined;
  games: number;
  unfinished: number;
};

type Side = { competitor: TournamentPlayer; points: number; boardPoints: number };
type Building = {
  id: string;
  bracket: "winners" | "losers";
  round: number;
  sides: [Side, Side];
  games: KnockoutGame[];
  unfinished: number;
  /** A team event's legs: each leg's board points, by side. */
  legs: Map<number, [number, number]>;
};

const teamOf = (headers: GameHeaders, side: "White" | "Black"): TournamentPlayer | undefined => {
  const name = gameTag(headers, `${side}Team`);
  return name === undefined ? undefined : { id: name, name, federation: gameTag(headers, `${side}Country`) };
};

/**
 * Bracket order, from the last round back: the matches of a round sorted so
 * that the two whose winners meet in the next round sit side by side. A
 * match no later one names (a losers' bracket's newcomers) keeps the file's
 * order, after the rest.
 */
const inBracketOrder = (rounds: KnockoutMatch[][]): KnockoutMatch[][] => {
  const ordered = rounds.map((matches) => [...matches]);
  for (let index = ordered.length - 2; index >= 0; index -= 1) {
    const next = ordered[index + 1];
    const placed: KnockoutMatch[] = [];
    for (const later of next) {
      for (const side of later.sides) {
        const earlier = ordered[index].find((match) => !placed.includes(match) && match.sides.some((own) => own.competitor.id === side.competitor.id));
        if (earlier !== undefined) placed.push(earlier);
      }
    }
    ordered[index] = [...placed, ...ordered[index].filter((match) => !placed.includes(match))];
  }
  return ordered;
};

/** The knockout the games make. `losersFromRound` is where a double elimination's losers' bracket starts (TWIC: 51). */
export const knockoutOf = (games: readonly GameHeaders[], { losersFromRound }: { losersFromRound?: number } = {}): Knockout => {
  const teams = games.length > 0 && games.every((headers) => teamOf(headers, "White") !== undefined && teamOf(headers, "Black") !== undefined);
  const matches = new Map<string, Building>();
  /** Every federation a team's players' tags name — one, or the team has none. */
  const teamFederations = new Map<string, Set<string>>();
  let read = 0;
  let unfinished = 0;

  games.forEach((headers, game) => {
    const white = teams ? teamOf(headers, "White") : playerOf(headers, "White");
    const black = teams ? teamOf(headers, "Black") : playerOf(headers, "Black");
    const [fileRound, part] = roundPartsOf(gameTag(headers, "Round"));
    if (white === undefined || black === undefined || white.id === black.id || fileRound === undefined) return;

    const losers = losersFromRound !== undefined && fileRound >= losersFromRound;
    const bracket = losers ? "losers" : "winners";
    const round = losers ? fileRound - losersFromRound + 1 : fileRound;
    const pair = [white.id, black.id].sort();
    const id = `${bracket}-${round}-${pair.join("-")}`;
    const [whiteOutcome, blackOutcome] = outcomesOf(headers.Result);

    let match = matches.get(id);
    if (match === undefined) {
      const side = (competitor: TournamentPlayer): Side => ({ competitor, points: 0, boardPoints: 0 });
      match = { id, bracket, round, sides: [side(white), side(black)], games: [], unfinished: 0, legs: new Map() };
      matches.set(id, match);
    }
    // A tag one game leaves out is taken from the next game that has it.
    for (const seen of [white, black]) {
      const own = match.sides.find((side) => side.competitor.id === seen.id)!;
      own.competitor = {
        ...own.competitor,
        title: own.competitor.title ?? seen.title,
        rating: own.competitor.rating ?? seen.rating,
        federation: own.competitor.federation ?? seen.federation,
      };
      if (teams && seen.federation !== undefined) {
        const federations = teamFederations.get(seen.id) ?? new Set<string>();
        federations.add(seen.federation);
        teamFederations.set(seen.id, federations);
      }
    }

    read += 1;
    if (whiteOutcome === "unfinished") {
      unfinished += 1;
      match.unfinished += 1;
    }
    match.games.push({ game, part, white: white.id, black: black.id, outcome: whiteOutcome });
    const whiteIndex = match.sides[0].competitor.id === white.id ? 0 : 1;
    const gained: [number, number] = [0, 0];
    gained[whiteIndex] = POINTS[whiteOutcome];
    gained[1 - whiteIndex] = POINTS[blackOutcome];
    match.sides[0].boardPoints += gained[0];
    match.sides[1].boardPoints += gained[1];
    if (teams) {
      const leg = match.legs.get(part ?? 1) ?? [0, 0];
      match.legs.set(part ?? 1, [leg[0] + gained[0], leg[1] + gained[1]]);
    }
  });

  const built = [...matches.values()].map((match) => {
    let scores: [number, number] = [match.sides[0].boardPoints, match.sides[1].boardPoints];
    if (teams) {
      scores = [0, 0];
      for (const [a, b] of match.legs.values()) {
        scores[0] += a > b ? 1 : a === b ? 0.5 : 0;
        scores[1] += b > a ? 1 : a === b ? 0.5 : 0;
      }
    }
    return { building: match, scores };
  });

  /** A team, with the one federation its players share — or none. */
  const teamWithFederation = (team: TournamentPlayer): TournamentPlayer => {
    const federations = teamFederations.get(team.id);
    return { ...team, federation: federations?.size === 1 ? [...federations][0] : undefined };
  };

  /** Whether a competitor plays in a later round of the same bracket. */
  const playsOn = (competitor: string, bracket: string, round: number) =>
    built.some(({ building }) => building.bracket === bracket && building.round > round && building.sides.some((side) => side.competitor.id === competitor));

  const finished = built.map(({ building, scores }) => {
    const { bracket, round } = building;
    const [a, b] = building.sides.map((side) => playsOn(side.competitor.id, bracket, round));
    const winner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : a !== b ? (a ? 0 : 1) : undefined;
    const sideOf = (index: 0 | 1): KnockoutSide => ({
      competitor: teams ? teamWithFederation(building.sides[index].competitor) : building.sides[index].competitor,
      score: scores[index],
      ...(teams && { boardPoints: building.sides[index].boardPoints }),
    });
    const match: KnockoutMatch = {
      id: building.id,
      sides: [sideOf(0), sideOf(1)],
      games: building.games,
      unfinished: building.unfinished,
      ...(teams && { legs: building.legs.size }),
      winner,
    };
    return { bracket, round, match };
  });

  const bracketOf = (bracket: "winners" | "losers"): KnockoutBracket => {
    const own = finished.filter((entry) => entry.bracket === bracket);
    const last = Math.max(0, ...own.map((entry) => entry.round));
    const byRound = Array.from({ length: last }, (_, index) =>
      own.filter((entry) => entry.round === index + 1).map((entry) => entry.match),
    );
    // The last round's match between two of the round before's losers is for third place, after the final.
    if (last >= 2 && byRound[last - 1].length >= 2) {
      const losers = new Set(
        byRound[last - 2].flatMap((match) => (match.winner === undefined ? [] : [match.sides[1 - match.winner].competitor.id])),
      );
      const isThird = (match: KnockoutMatch) => match.sides.every((side) => losers.has(side.competitor.id));
      byRound[last - 1] = [
        ...byRound[last - 1].filter((match) => !isThird(match)),
        ...byRound[last - 1].filter(isThird).map((match) => ({ ...match, thirdPlace: true })),
      ];
    }
    return {
      rounds: inBracketOrder(byRound)
        .map((matchesOfRound, index) => ({ round: index + 1, matches: matchesOfRound }))
        .filter((round) => round.matches.length > 0),
    };
  };

  return {
    teams,
    winners: bracketOf("winners"),
    losers: losersFromRound === undefined ? undefined : bracketOf("losers"),
    games: read,
    unfinished,
  };
};
