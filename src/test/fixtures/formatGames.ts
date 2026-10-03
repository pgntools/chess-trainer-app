import type { GameHeaders } from "../../lib/gameModel";
import { readPgnTags, splitPgnGames } from "../../lib/pgn";
import knockoutPgn from "../../views/blog/articles/tournaments/chned26.pgn?raw";
import matchPgn from "../../views/blog/articles/tournaments/clutchlegends26.pgn?raw";
import doubleEliminationPgn from "../../views/blog/articles/tournaments/esportswcuppl26.pgn?raw";
import teamKnockoutPgn from "../../views/blog/articles/tournaments/fidewrbtf26.pgn?raw";

/*
  The other formats' fixtures (CTA-128) — the Blog's Tournaments demo
  files, from The Week in Chess, read as the helpers are meant to be fed:
  tags only. For `lib/knockout.ts`, `lib/match.ts` and their blocks' tests
  and fixtures; nothing shipped imports this. (The team Swiss's file, 1.6 MB,
  is left to its own test, `lib/teamTournament.test.ts`.)

    - chned26.pgn — the Dutch championship 2026, a 16-player knockout over
      four rounds, tiebreak games in the same rounds (1.3, 1.4, 2.5, …).
    - esportswcuppl26.pgn — the Esports World Cup 2026's play-in, a double
      elimination of 8: rounds 1–3 the winners' bracket, 51–54 the losers'.
    - clutchlegends26.pgn — Clutch Chess: The Legends 2026, Kasparov –
      Topalov, 12 Chess960 games.
    - fidewrbtf26.pgn — the FIDE World Blitz Team Championship 2026's final
      stage, a knockout of 16 teams, six boards, legs as `Round "R.G"`.
*/

const headersOf = (pgn: string): GameHeaders[] => splitPgnGames(pgn).map(readPgnTags);

export const KNOCKOUT_GAMES: readonly GameHeaders[] = headersOf(knockoutPgn);
export const DOUBLE_ELIMINATION_GAMES: readonly GameHeaders[] = headersOf(doubleEliminationPgn);
export const MATCH_GAMES: readonly GameHeaders[] = headersOf(matchPgn);
export const TEAM_KNOCKOUT_GAMES: readonly GameHeaders[] = headersOf(teamKnockoutPgn);
