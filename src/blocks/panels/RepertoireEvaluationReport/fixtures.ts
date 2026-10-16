import {
  REPERTOIRE_EVALUATION_REPORT_SCHEMA,
  REPERTOIRE_VERDICTS,
  type RepertoireEvaluationReport,
  type RepertoireReportMove,
  type RepertoireVerdict,
} from "../../../lib/jobs/kinds/repertoireEvaluation/core";

/*
  A repertoire evaluation's reports (CTA-219), typed with
  `lib/jobs/kinds/repertoireEvaluation/core.ts`'s own. Imported only by the
  block's gallery and its test.
*/

const cp = (value: number) => ({ kind: "cp" as const, value });

const move = (
  path: string[],
  line: string,
  label: string,
  verdict: RepertoireVerdict,
  extra: Partial<RepertoireReportMove> = {},
): RepertoireReportMove => ({
  id: path.join("_"),
  path,
  line,
  move: label,
  san: path.at(-1) ?? "",
  key: `key-${path.join("-")}`,
  verdict,
  otherPaths: 0,
  ...extra,
});

const countsOf = (moves: readonly RepertoireReportMove[]): Record<RepertoireVerdict, number> => {
  const counts = Object.fromEntries(REPERTOIRE_VERDICTS.map((verdict) => [verdict, 0])) as Record<RepertoireVerdict, number>;
  for (const each of moves) counts[each.verdict] += 1;
  return counts;
};

const reportOf = (moves: RepertoireReportMove[], extra: Partial<RepertoireEvaluationReport> = {}): RepertoireEvaluationReport => ({
  schema: REPERTOIRE_EVALUATION_REPORT_SCHEMA,
  repertoireId: "rep1",
  name: "Queen's Gambit Declined",
  side: "w",
  maxPlies: 20,
  thresholds: { inaccuracy: 50, mistake: 100, blunder: 300 },
  positions: { done: 24, total: 24 },
  counts: countsOf(moves),
  moves,
  ...extra,
});

/** A White repertoire, finished: a blunder, a missed mate, a mistake, an inaccuracy, then the good moves — one reached two ways. */
const FINISHED_MOVES: RepertoireReportMove[] = [
  move(["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O", "Nf3", "h6", "Bxf6", "Bxf6", "Qc2"], "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bxf6 Bxf6", "8. Qc2", "blunder", {
    before: cp(35),
    after: cp(-320),
    loss: 355,
    bestSan: "Rc1",
  }),
  move(["d4", "Nf6", "c4", "e5", "dxe5", "Ng4", "Bf4", "Bb4+", "Nd2", "Nc6", "Ngf3", "Qe7", "a3", "Ngxe5", "axb4"], "1. d4 Nf6 2. c4 e5 3. dxe5 Ng4 4. Bf4 Bb4+ 5. Nd2 Nc6 6. Ngf3 Qe7 7. a3 Ngxe5", "8. axb4", "missedMate", {
    before: { kind: "mate", value: 4 },
    after: cp(250),
    loss: 0,
    missedMateIn: 4,
    bestSan: "Nxe5",
  }),
  move(["d4", "d5", "c4", "c6", "Nf3", "Nf6", "e3", "Bf5", "Nc3", "e6", "Bd3"], "1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. e3 Bf5 5. Nc3 e6", "6. Bd3", "mistake", {
    before: cp(40),
    after: cp(-75),
    loss: 115,
    bestSan: "Nh4",
  }),
  move(["d4", "d5", "c4", "dxc4", "e3"], "1. d4 d5 2. c4 dxc4", "3. e3", "inaccuracy", { before: cp(45), after: cp(-10), loss: 55, bestSan: "e4" }),
  move(["d4"], "", "1. d4", "good", { before: cp(30), after: cp(28), loss: 2 }),
  move(["d4", "d5", "c4"], "1. d4 d5", "2. c4", "good", { before: cp(32), after: cp(30), loss: 2 }),
  move(["d4", "d5", "c4", "e6", "Nc3"], "1. d4 d5 2. c4 e6", "3. Nc3", "good", { before: cp(40), after: cp(38), loss: 2, otherPaths: 2 }),
  move(["d4", "Nf6", "c4"], "1. d4 Nf6", "2. c4", "good", { before: cp(30), after: cp(30), loss: 0 }),
];

export const FINISHED: RepertoireEvaluationReport = reportOf(FINISHED_MOVES);

/** The same, part-way: two moves not evaluated yet. */
export const IN_PROGRESS: RepertoireEvaluationReport = reportOf(
  [
    ...FINISHED_MOVES.slice(0, 5),
    move(["d4", "d5", "Bf4"], "1. d4 d5", "2. Bf4", "pending"),
    move(["d4", "Nf6", "Bg5"], "1. d4 Nf6", "2. Bg5", "pending"),
  ],
  { positions: { done: 14, total: 24 } },
);

/** A Black repertoire: its evals shown from Black's side. */
export const BLACK: RepertoireEvaluationReport = reportOf(
  [
    move(["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Bg5", "Qc7"], "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5", "6... Qc7", "mistake", {
      before: cp(30),
      after: cp(145),
      loss: 115,
      bestSan: "e6",
    }),
    move(["e4", "c5"], "1. e4", "1... c5", "good", { before: cp(30), after: cp(32), loss: 2 }),
  ],
  { side: "b", name: "Najdorf" },
);

/** Every move good: the flagged-only filter leaves none. */
export const ALL_GOOD: RepertoireEvaluationReport = reportOf(FINISHED_MOVES.filter((each) => each.verdict === "good"));

/** No move of the side within the ply limit. */
export const EMPTY: RepertoireEvaluationReport = reportOf([], { positions: { done: 0, total: 0 } });

/** A large repertoire: 300 moves, for paging. */
export const LARGE: RepertoireEvaluationReport = reportOf(
  Array.from({ length: 300 }, (_, index) => {
    const verdict: RepertoireVerdict = index % 17 === 0 ? "blunder" : index % 7 === 0 ? "inaccuracy" : "good";
    const san = `a${(index % 6) + 3}`;
    return move(["d4", `n${index}`, san], `1. d4 line ${index + 1}`, `2. ${san}`, verdict, { before: cp(20), after: cp(verdict === "good" ? 18 : -300), loss: verdict === "good" ? 2 : 320 });
  }).sort((a, b) => Number(b.verdict !== "good") - Number(a.verdict !== "good")),
  { positions: { done: 600, total: 600 } },
);
