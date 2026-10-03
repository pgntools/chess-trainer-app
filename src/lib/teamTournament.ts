import { gameTag, type GameHeaders } from "./gameModel";
import { outcomesOf, POINTS, roundPartsOf, type GameOutcome } from "./tournament";

/**
 * **A team tournament, read from its games' tags** (CTA-128): a Swiss or a
 * round robin of teams — the Olympiad's kind — where each round two teams
 * meet on every board at once. Each game names its teams (`WhiteTeam`,
 * `BlackTeam`); every game two teams play in a round (`Round "R.n"`, n the
 * board, or the file's running count of them) is one match. Pure, tags only.
 *
 * A match is won on **board points** — the games' points summed — and is
 * worth **match points**: 2 for a win, 1 for a draw, as at the Olympiad. The
 * standings rank by match points, then board points. A match with an
 * unfinished game is unfinished: it shows its board points so far and
 * scores no match point.
 */

export type TeamMatch = {
  round: number;
  /** The other team's name. */
  opponent: string;
  /** This team's board points, and the opponent's. */
  boardPoints: number;
  opponentBoardPoints: number;
  /** How many games the file holds of it. */
  boards: number;
  /** The match as this team saw it. */
  outcome: GameOutcome;
};

export type TeamStanding = {
  /** 1-based, no two alike. */
  rank: number;
  /** The team's name — what tells two teams apart. */
  team: string;
  matchPoints: number;
  boardPoints: number;
  /** One entry per round: the team's match of that round (none where the file holds no game of it). */
  rounds: readonly (readonly TeamMatch[])[];
};

export type TeamTournament = {
  rounds: number;
  /** How many games were read, and how many teams' matches. */
  games: number;
  matches: number;
  unfinished: number;
  standings: readonly TeamStanding[];
};

/** Match points for a won and a drawn match — the Olympiad's 2 and 1. */
export const TEAM_MATCH_POINTS = { win: 2, draw: 1 } as const;

type Meeting = { round: number; teams: [string, string]; points: [number, number]; boards: number; unfinished: boolean };

/** The team tournament the games make. A game that names no two different teams, or no round, is left out. */
export const teamTournamentOf = (games: readonly GameHeaders[]): TeamTournament => {
  const meetings = new Map<string, Meeting>();
  let read = 0;
  let unfinishedGames = 0;

  for (const headers of games) {
    const white = gameTag(headers, "WhiteTeam");
    const black = gameTag(headers, "BlackTeam");
    const [round] = roundPartsOf(gameTag(headers, "Round"));
    if (white === undefined || black === undefined || white === black || round === undefined) continue;

    const teams = [white, black].sort() as [string, string];
    const key = `${round}-${teams.join("\u0000")}`;
    const meeting = meetings.get(key) ?? { round, teams, points: [0, 0], boards: 0, unfinished: false };
    meetings.set(key, meeting);

    const [whiteOutcome, blackOutcome] = outcomesOf(headers.Result);
    read += 1;
    meeting.boards += 1;
    if (whiteOutcome === "unfinished") {
      unfinishedGames += 1;
      meeting.unfinished = true;
    }
    const whiteIndex = teams[0] === white ? 0 : 1;
    meeting.points[whiteIndex] += POINTS[whiteOutcome];
    meeting.points[1 - whiteIndex] += POINTS[blackOutcome];
  }

  const rounds = Math.max(0, ...[...meetings.values()].map((meeting) => meeting.round));
  const byTeam = new Map<string, TeamMatch[]>();
  for (const meeting of meetings.values()) {
    meeting.teams.forEach((team, index) => {
      const own = meeting.points[index];
      const other = meeting.points[1 - index];
      const outcome: GameOutcome = meeting.unfinished ? "unfinished" : own > other ? "win" : own < other ? "loss" : "draw";
      const list = byTeam.get(team) ?? [];
      list.push({ round: meeting.round, opponent: meeting.teams[1 - index], boardPoints: own, opponentBoardPoints: other, boards: meeting.boards, outcome });
      byTeam.set(team, list);
    });
  }

  const unranked = [...byTeam.entries()].map(([team, matches]) => ({
    team,
    matchPoints: matches.reduce(
      (sum, match) => sum + (match.outcome === "win" ? TEAM_MATCH_POINTS.win : match.outcome === "draw" ? TEAM_MATCH_POINTS.draw : 0),
      0,
    ),
    boardPoints: matches.reduce((sum, match) => sum + match.boardPoints, 0),
    rounds: Array.from({ length: rounds }, (_, index) => matches.filter((match) => match.round === index + 1)),
  }));
  unranked.sort((a, b) => b.matchPoints - a.matchPoints || b.boardPoints - a.boardPoints || a.team.localeCompare(b.team));

  return {
    rounds,
    games: read,
    matches: meetings.size,
    unfinished: unfinishedGames,
    standings: unranked.map((standing, index) => ({ rank: index + 1, ...standing })),
  };
};
