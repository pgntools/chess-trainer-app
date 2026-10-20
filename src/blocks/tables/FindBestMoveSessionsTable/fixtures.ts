import type { FindBestMoveSessionRow } from "../../../lib/findBestMove/rows";

/*
  The sessions lobby's sample rows (CTA-239), typed with `src/lib/`'s own row,
  so a change to it breaks them at compile time. Imported only by the block's
  gallery and its test.
*/

const row = (id: string, name: string, updatedAt: string, session?: FindBestMoveSessionRow["session"]): FindBestMoveSessionRow => ({
  id,
  name,
  updatedAt,
  ...(session === undefined ? {} : { session }),
});

const progress = (fields: Partial<NonNullable<FindBestMoveSessionRow["session"]>["progress"]>) => ({
  total: 12,
  answered: 0,
  passed: 0,
  found: 0,
  inPlace: 0,
  target: 0,
  done: false,
  ...fields,
});

/** One of every kind: just started, under way, done, Black's, and a Case that is not a session. */
export const SESSION_ROWS: readonly FindBestMoveSessionRow[] = [
  row("fresh", "Alice – Bob — Find Best Move", "2026-10-19T18:30:00.000Z", { side: "both", wanted: 3, progress: progress({}) }),
  row("going", "Carlsen – Nakamura — Find Best Move", "2026-10-18T09:15:00.000Z", {
    side: "w",
    wanted: 3,
    progress: progress({ total: 20, answered: 7, passed: 2, found: 15, inPlace: 9, target: 21 }),
  }),
  row("done", "Tal – Botvinnik — Find Best Move", "2026-10-12T20:00:00.000Z", {
    side: "b",
    wanted: 1,
    progress: progress({ total: 8, answered: 8, found: 6, inPlace: 6, target: 8, done: true }),
  }),
  row("passes", "Kasparov – Karpov — Find Best Move", "2026-10-10T08:00:00.000Z", {
    side: "w",
    wanted: 5,
    progress: progress({ total: 4, passed: 4, done: true }),
  }),
  row("old", "Fischer – Spassky — Find Best Move", "2026-10-01T12:00:00.000Z"),
];

/** An older session — Find Best Move v3's (CTA-244): known as one, never resumed. */
export const OLDER_ROW: FindBestMoveSessionRow = { ...row("v3", "Anand – Gelfand — Find Best Move", "2026-09-30T12:00:00.000Z"), older: true };

/** A name at its longest, and Hebrew ones for RTL. */
export const LONG_ROWS: readonly FindBestMoveSessionRow[] = [
  row("long", `${"Vachier-Lagrave – Nepomniachtchi, Tata Steel Masters, Wijk aan Zee ".repeat(2)}— Find Best Move`, "2026-10-19T18:30:00.000Z", {
    side: "both",
    wanted: 10,
    progress: progress({ total: 120, answered: 61, passed: 3, found: 402, inPlace: 177, target: 610 }),
  }),
  row("he", "אליס – בוב — מציאת המסע הטוב ביותר", "2026-10-18T09:15:00.000Z", {
    side: "w",
    wanted: 3,
    progress: progress({ answered: 2, found: 4, inPlace: 2, target: 6 }),
  }),
];

/** Many sessions — the pager and the sort over them. */
export const manyRows = (count: number): FindBestMoveSessionRow[] =>
  Array.from({ length: count }, (_, at) =>
    row(`s${at}`, `Game ${at + 1} — Find Best Move`, new Date(Date.UTC(2026, 9, 1) - at * 3_600_000).toISOString(), {
      side: at % 3 === 0 ? "both" : at % 3 === 1 ? "w" : "b",
      wanted: (at % 5) + 1,
      progress: progress({ total: 10 + (at % 7), answered: at % 10, passed: at % 3, found: at % 11, inPlace: at % 4, target: 11, done: at % 10 === 9 }),
    }),
  );
