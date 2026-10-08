import type { TeamRoster } from "./TeamRosters";

/*
  The team rosters' samples (CTA-142) — as a team event's games read, with
  each titled player's title (CTA-164). Imported only by the block's gallery
  and its test.
*/

export const OLYMPIAD: readonly TeamRoster[] = [
  {
    team: "Uzbekistan",
    federation: "UZB",
    matchPoints: 19,
    boardPoints: 32,
    players: [
      { name: "Abdusattorov, Nodirbek", title: "GM" },
      { name: "Sindarov, Javokhir", title: "GM" },
      { name: "Yakubboev, Nodirbek" },
      { name: "Vokhidov, Shamsiddin" },
    ],
  },
  {
    team: "India",
    federation: "IND",
    matchPoints: 18,
    boardPoints: 33.5,
    players: [
      { name: "Gukesh, D", title: "GM" },
      { name: "Praggnanandhaa, R" },
      { name: "Erigaisi, Arjun" },
      { name: "Vidit, Santosh Gujrathi" },
    ],
  },
  {
    team: "FIDE",
    matchPoints: 11,
    boardPoints: 22,
    players: [
      { name: "Esipenko, Andrey", title: "IM" },
      { name: "Artemiev, Vladislav" },
    ],
  },
];

/** A club team whose players' names run long. */
export const LONG_NAMES: readonly TeamRoster[] = [
  {
    team: "Schachgesellschaft Zürich und Umgebung 1809",
    matchPoints: 4,
    boardPoints: 9.5,
    players: [{ name: "Hauptspielerin-Mustermann, Anna-Lena Maria", title: "WIM" }, { name: "Ben" }, { name: "Christoph von Ungarn-Schönberg" }],
  },
];
