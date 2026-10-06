import type { TeamRoster } from "./TeamRosters";

/*
  The team rosters' samples (CTA-142) — as a team event's games read.
  Imported only by the block's gallery and its test.
*/

export const OLYMPIAD: readonly TeamRoster[] = [
  { team: "Uzbekistan", federation: "UZB", matchPoints: 19, boardPoints: 32, players: ["Abdusattorov, Nodirbek", "Sindarov, Javokhir", "Yakubboev, Nodirbek", "Vokhidov, Shamsiddin"] },
  { team: "India", federation: "IND", matchPoints: 18, boardPoints: 33.5, players: ["Gukesh, D", "Praggnanandhaa, R", "Erigaisi, Arjun", "Vidit, Santosh Gujrathi"] },
  { team: "FIDE", matchPoints: 11, boardPoints: 22, players: ["Esipenko, Andrey", "Artemiev, Vladislav"] },
];

/** A club team whose players' names run long. */
export const LONG_NAMES: readonly TeamRoster[] = [
  {
    team: "Schachgesellschaft Zürich und Umgebung 1809",
    matchPoints: 4,
    boardPoints: 9.5,
    players: ["Hauptspielerin-Mustermann, Anna-Lena Maria", "Ben", "Christoph von Ungarn-Schönberg"],
  },
];
