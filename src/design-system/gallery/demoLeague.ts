import type { CompetitorLabels, CrossTableRow, ResultEntry, StandingsRow, TieBreakColumn } from "../patterns/tables";

/*
  A made-up league for the competition tables' demos (CTA-120) —
  `StandingsTable`'s and `CrossTable`'s. The patterns know no domain, so
  neither does this: members meet round by round (the circle method, so
  everyone plays everyone once per cycle), a result is a deterministic
  function of who met whom and when, and the points and the tie-breaks are
  counted from the results — the rows agree with each other.
*/

type Outcome = "win" | "draw" | "loss" | "unfinished";
type Meeting = { round: number; opponent: number; outcome: Outcome };

export type DemoMember = {
  id: string;
  name: string;
  prefix?: string;
  suffix?: string;
  rating?: number;
  /** Every meeting, in round order. */
  meetings: Meeting[];
  points: number;
  /** The sum of the opponents' points, and the number of wins — the demos' two tie-breaks. */
  opponents: number;
  wins: number;
  rank: number;
};

/** A league: its members as they were named (a meeting's `opponent` is an index into them), and the same members ranked. */
export type DemoLeague = { members: DemoMember[]; ranked: DemoMember[] };

export type DemoLeagueOptions = {
  names: readonly string[];
  rounds: number;
  /** A member's extras, by its index. */
  extras?: (index: number) => Pick<DemoMember, "prefix" | "suffix" | "rating">;
  /** Some games are still being played. */
  unfinished?: boolean;
  /** A member sits a round out — it and its opponent have no game then. */
  absent?: (index: number, round: number) => boolean;
  /** The last round that has been played — later ones have no game yet. Default: every round. */
  playedRounds?: number;
};

const POINTS: Record<Outcome, number> = { win: 1, draw: 0.5, loss: 0, unfinished: 0 };
const REVERSED: Record<Outcome, Outcome> = { win: "loss", draw: "draw", loss: "win", unfinished: "unfinished" };

/** Who meets whom in `round` (1-based) — the circle method over an even number of seats; a seat past the members is a bye. */
const pairingsOf = (seats: number, round: number): [number, number][] => {
  const turn = (round - 1) % (seats - 1);
  const at = (position: number) => (position === seats - 1 ? seats - 1 : (position + turn) % (seats - 1));
  return Array.from({ length: seats / 2 }, (_, index) => [at(index), at(seats - 1 - index)] as [number, number]);
};

/** The league, ranked by points, then the opponents' points, then the wins, then the name. */
export const demoLeague = ({ names, rounds, extras, unfinished = false, absent, playedRounds = rounds }: DemoLeagueOptions): DemoLeague => {
  const seats = names.length + (names.length % 2);
  const members: DemoMember[] = names.map((name, index) => ({
    id: `m${index + 1}`,
    name,
    ...extras?.(index),
    meetings: [],
    points: 0,
    opponents: 0,
    wins: 0,
    rank: 0,
  }));

  for (let round = 1; round <= Math.min(rounds, playedRounds); round += 1) {
    for (const [a, b] of pairingsOf(seats, round)) {
      if (a >= names.length || b >= names.length) continue;
      if (absent?.(a, round) === true || absent?.(b, round) === true) continue;
      const roll = (a * 31 + b * 17 + round * 7) % 10;
      // The earlier name in the list is the stronger: it wins more often than it loses.
      const forFirst: Outcome = roll < 4 ? "win" : roll < 7 ? "draw" : roll < 9 || !unfinished ? "loss" : "unfinished";
      const [first, second] = a < b ? [a, b] : [b, a];
      members[first].meetings.push({ round, opponent: second, outcome: forFirst });
      members[second].meetings.push({ round, opponent: first, outcome: REVERSED[forFirst] });
    }
  }

  for (const member of members) {
    member.points = member.meetings.reduce((sum, meeting) => sum + POINTS[meeting.outcome], 0);
    member.wins = member.meetings.filter((meeting) => meeting.outcome === "win").length;
  }
  for (const member of members) {
    member.opponents = member.meetings
      .filter((meeting) => meeting.outcome !== "unfinished")
      .reduce((sum, meeting) => sum + members[meeting.opponent].points, 0);
  }

  const ranked = [...members].sort(
    (a, b) => b.points - a.points || b.opponents - a.opponents || b.wins - a.wins || a.name.localeCompare(b.name),
  );
  ranked.forEach((member, index) => {
    member.rank = index + 1;
  });
  return { members, ranked };
};

/** A meeting as a cell's result: its outcome, and the words read in the glyph's place. */
const entryOf = (league: DemoLeague, meeting: Meeting): ResultEntry => ({
  outcome: meeting.outcome,
  label: `Round ${meeting.round}, against ${league.members[meeting.opponent].name}: ${meeting.outcome}`,
});

const competitorOf = (member: DemoMember) => ({
  id: member.id,
  rank: member.rank,
  name: member.name,
  prefix: member.prefix,
  suffix: member.suffix,
  rating: member.rating,
  points: member.points,
  tieBreaks: { opponents: member.opponents, wins: member.wins },
});

/** The league as `StandingsTable`'s rows: a cell per round, a round with no game a `none` mark. */
export const standingsRowsOf = (league: DemoLeague, rounds: number): StandingsRow[] =>
  league.ranked.map((member) => ({
    ...competitorOf(member),
    rounds: Array.from({ length: rounds }, (_, index) => {
      const played = member.meetings.filter((meeting) => meeting.round === index + 1);
      return played.length > 0
        ? played.map((meeting) => entryOf(league, meeting))
        : [{ outcome: "none" as const, label: `Round ${index + 1}: no game` }];
    }),
  }));

/** The league as `CrossTable`'s rows: every result against each other member, in round order. */
export const crossTableRowsOf = (league: DemoLeague): CrossTableRow[] =>
  league.ranked.map((member) => ({
    ...competitorOf(member),
    results: Object.fromEntries(
      league.members
        .filter((other) => other !== member)
        .map((other) => [
          other.id,
          member.meetings.filter((meeting) => league.members[meeting.opponent] === other).map((meeting) => entryOf(league, meeting)),
        ]),
    ),
  }));

/** The demos' headings: abbreviations in view, their full names read. */
export const DEMO_LABELS: CompetitorLabels = {
  rank: { header: "#", name: "Rank" },
  name: "Member",
  rating: { header: "Rtg", name: "Rating" },
  points: { header: "Pts", name: "Points" },
};

/** The demos' two tie-breaks: the opponents' points to one decimal, the wins as they are. */
export const DEMO_TIE_BREAKS: TieBreakColumn[] = [
  { id: "opponents", header: "Opp", name: "Opponents' points", format: (value) => value.toFixed(1) },
  { id: "wins", header: "W", name: "Wins" },
];

/** What the two glyphs that are not numbers mean. */
export const DEMO_LEGEND: ResultEntry[] = [
  { outcome: "unfinished", label: "unfinished game" },
  { outcome: "none", label: "no game" },
];

export const DEMO_NAMES = [
  "Ada Lovelace",
  "Alan Turing",
  "Grace Hopper",
  "Edsger Dijkstra",
  "Barbara Liskov",
  "Donald Knuth",
  "Frances Allen",
  "John Backus",
] as const;

export const DEMO_HEBREW_NAMES = ["עדה לאבלייס", "אלן טיורינג", "גרייס הופר", "אדסחר דייקסטרה", "ברברה ליסקוב", "דונלד קנות'"] as const;

export const DEMO_LONG_NAMES = [
  "Augusta Ada King, Countess of Lovelace, née Byron — the first to publish an algorithm meant for a machine",
  "Alan Mathison Turing of King's College, Cambridge, and the Victoria University of Manchester",
  "Rear Admiral Grace Brewster Murray Hopper",
  "Edsger Wybe Dijkstra",
] as const;

/** `count` made-up names — "Member 1" … */
export const demoNames = (count: number): string[] => Array.from({ length: count }, (_, index) => `Member ${index + 1}`);
