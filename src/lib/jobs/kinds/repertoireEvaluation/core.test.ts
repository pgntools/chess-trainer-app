import { describe, expect, it, vi } from "vitest";

import {
  analysisPositionsOf,
  computerAnalysisOptionsFrom,
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  moveVerdicts,
  type PositionResult,
} from "../../../computerAnalysis";
import { computerAnalysisTree } from "../../../computerAnalysisTree";
import { findNode, sanPathTo, type GameTree, type VariationNode } from "../../../gameTree";
import { parsePgnTree } from "../../../pgn";
import { TreeManager } from "../../../treeManager";
import {
  annotatedTreeOf,
  continuedInputOf,
  DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
  evaluatedPgnFileName,
  evaluatedRepertoireId,
  numberedLine,
  outputPlansOf,
  parseRepertoireEvaluationInput,
  parseRepertoireEvaluationReport,
  parseRepertoireEvaluationState,
  planOf,
  positionKeyOf,
  recordedEngineSettingsOf,
  REPERTOIRE_EVALUATION_REPORT_SCHEMA,
  RepertoireEvaluationError,
  reportOf,
  scoreForSide,
  stateFor,
  stepOf,
  type RepertoireEvaluationInput,
  type RepertoireEvaluationState,
  type RepertoireEvaluator,
} from "./core";
import type { JobEngineSettings } from "../../engineJobSettings";

/** An input over `pgn`, the defaults for the rest. */
const inputOf = (pgn: string, overrides: Partial<RepertoireEvaluationInput> = {}): RepertoireEvaluationInput => ({
  repertoireId: "rep1",
  name: "Queen's Gambit",
  pgn,
  engine: "stockfish-19-lite",
  preset: null,
  ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
  ...overrides,
});

/**
 * A fake engine: line 1 of each position from `scores` (White's view, by key),
 * 20 cp where it names none, its pv `pvs`' move or none. Every call recorded.
 */
const fakeEngine = (scores: Record<string, number> = {}, pvs: Record<string, string[]> = {}) => {
  const calls: string[] = [];
  const evaluate: RepertoireEvaluator = vi.fn(async ({ fen }) => {
    calls.push(positionKeyOf(fen));
    const key = positionKeyOf(fen);
    return { fen, lines: [{ score: { kind: "cp" as const, value: scores[key] ?? 20 }, depth: 20, pv: pvs[key] ?? [] }] };
  });
  return { evaluate, calls };
};

/** Every step of a job, to the end. */
const runToEnd = async (input: RepertoireEvaluationInput, evaluate: RepertoireEvaluator): Promise<RepertoireEvaluationState> => {
  let state = planOf(input)?.state;
  for (let guard = 0; guard < 500; guard += 1) {
    const step = await stepOf(state, input, evaluate);
    state = step.state;
    if (step.done) return state;
  }
  throw new Error("never done");
};

/** The FEN after `sans` from the start, as the tree writes it. */
const fenAfter = (pgn: string, sans: readonly string[]): string => {
  const tree = parsePgnTree(pgn);
  let nodes = tree.moves;
  let fen = tree.startFen;
  for (const san of sans) {
    const node = nodes.find((each) => each.san === san);
    if (node === undefined) throw new Error(`no ${san}`);
    fen = node.fen;
    nodes = node.children;
  }
  return fen;
};

/** Two move orders that meet after 2... e6 / 2... Nf6, then 3. Nc3 from there. */
const TRANSPOSING = "1. d4 (1. c4 e6 2. d4 Nf6 3. Nc3) 1... Nf6 2. c4 e6 3. Nc3 *";

describe("the plan (CTA-219)", () => {
  it("keys a position by its FEN's first four fields — the clocks dropped", () => {
    expect(positionKeyOf("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1")).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -",
    );
  });

  it("evaluates transpositions once: two lines that meet are one position, its moves judged once", async () => {
    const input = inputOf(TRANSPOSING);
    const planned = planOf(input);
    expect(planned).toBeDefined();
    const keys = planned!.state.positions.map((position) => position.key);
    expect(new Set(keys).size).toBe(keys.length);

    const meeting = positionKeyOf(fenAfter(TRANSPOSING, ["d4", "Nf6", "c4", "e6"]));
    expect(positionKeyOf(fenAfter(TRANSPOSING, ["c4", "e6", "d4", "Nf6"]))).toBe(meeting);
    const position = planned!.state.positions.find((each) => each.key === meeting)!;
    expect(position.pathCount).toBe(2);
    expect(position.paths).toEqual([
      ["d4", "Nf6", "c4", "e6"],
      ["c4", "e6", "d4", "Nf6"],
    ]);
    expect(position.moves).toEqual([expect.objectContaining({ san: "Nc3" })]);

    const { evaluate, calls } = fakeEngine();
    const state = await runToEnd(input, evaluate);
    expect(calls.filter((key) => key === meeting)).toHaveLength(1);
    expect(new Set(calls).size).toBe(calls.length);
    expect(calls).toHaveLength(keys.length);

    const report = reportOf(state, input)!;
    const nc3 = report.moves.filter((move) => move.san === "Nc3");
    expect(nc3).toHaveLength(1);
    expect(nc3[0]).toMatchObject({ path: ["d4", "Nf6", "c4", "e6", "Nc3"], otherPaths: 1, line: "1. d4 Nf6 2. c4 e6", move: "3. Nc3" });
  });

  it("plans only the positions the side's moves are judged by, up to the ply limit, the earliest first", () => {
    const pgn = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *";
    const plan = planOf(inputOf(pgn, { maxPlies: 3 }))!.state;
    // White's 1. e4 and 2. Nf3 (ply 3): before and after each — the start, e4, e5, Nf3.
    expect(plan.positions.map((position) => position.ply)).toEqual([0, 1, 2, 3]);
    expect(plan.positions[0].moves.map((move) => move.san)).toEqual(["e4"]);
    // Black's side: 1... e5 and 2... Nc6 judged with plies 4 → the positions after e4, e5, Nf3, Nc6.
    const black = planOf(inputOf(pgn, { side: "b", maxPlies: 4 }))!.state;
    expect(black.positions.map((position) => position.ply)).toEqual([1, 2, 3, 4]);
    // Lines asked for: the search's where a move is judged, one where only line 1 is read.
    expect(plan.positions.map((position) => position.multiPv)).toEqual([1, 1, 1, 1]);
    const multi = planOf(inputOf(pgn, { maxPlies: 3, search: { ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS.search, multiPv: 3 } }))!.state;
    expect(multi.positions.map((position) => position.multiPv)).toEqual([3, 1, 3, 1]);
  });

  it("does not read a PGN that does not read", async () => {
    const input = inputOf("1. e4 Ke7 *");
    expect(planOf(input)).toBeUndefined();
    expect(reportOf(null, input)).toBeUndefined();
    expect(annotatedTreeOf(null, input)).toBeUndefined();
    expect(outputPlansOf(null, input, "job1")).toEqual([]);
    await expect(stepOf(null, input, fakeEngine().evaluate)).rejects.toMatchObject({ code: "source" });
  });
});

describe("a step (CTA-219)", () => {
  it("searches the first position with no result, by its key, and says how far it has got", async () => {
    const input = inputOf("1. e4 e5 2. Nf3 *");
    const { evaluate, calls } = fakeEngine();
    const planned = planOf(input)!;
    expect(planned.progress).toEqual({ done: 0, total: 4 });
    const first = await stepOf(planned.state, input, evaluate);
    expect(calls).toEqual([positionKeyOf(parsePgnTree(input.pgn).startFen)]);
    expect(first.progress).toEqual({ done: 1, total: 4, label: "1. e4" });
    expect(first.done).toBe(false);
    const second = await stepOf(first.state, input, evaluate);
    expect(second.progress.label).toBe("1... e5");
  });

  it("is safe to re-run: the same state searches the same position and stores the same result", async () => {
    const input = inputOf("1. e4 e5 2. Nf3 *");
    const { evaluate } = fakeEngine();
    const state = planOf(input)!.state;
    const once = await stepOf(state, input, evaluate);
    const again = await stepOf(state, input, evaluate);
    expect(again.state).toEqual(once.state);
  });

  it("never asks the engine about a mate on the board", async () => {
    const pgn = "1. f3 e5 2. g4 Qh4# *";
    const input = inputOf(pgn, { side: "b" });
    const { evaluate, calls } = fakeEngine();
    const state = await runToEnd(input, evaluate);
    const mated = positionKeyOf(fenAfter(pgn, ["f3", "e5", "g4", "Qh4#"]));
    expect(calls).not.toContain(mated);
    expect(state.results[mated].lines[0].score).toEqual({ kind: "mate", value: 0 });
    expect(reportOf(state, input)!.moves.find((move) => move.san === "Qh4#")?.verdict).toBe("good");
  });

  it("fails the step `engine` when the engine gives no scored line", async () => {
    const input = inputOf("1. e4 *");
    await expect(stepOf(null, input, async () => undefined)).rejects.toBeInstanceOf(RepertoireEvaluationError);
    await expect(stepOf(null, input, async ({ fen }) => ({ fen, lines: [] }))).rejects.toMatchObject({ code: "engine" });
  });
});

describe("the state (CTA-219)", () => {
  it("round-trips: parseState(planOf(x).state), and a state with results through JSON", async () => {
    const input = inputOf(TRANSPOSING);
    const planned = planOf(input)!.state;
    expect(parseRepertoireEvaluationState(planned)).toEqual(planned);
    const done = await runToEnd(input, fakeEngine().evaluate);
    expect(parseRepertoireEvaluationState(JSON.parse(JSON.stringify(done)))).toEqual(done);
  });

  it("reads another shape or kind version, or no state, as none", () => {
    const planned = planOf(inputOf("1. e4 *"))!.state;
    expect(parseRepertoireEvaluationState({ ...planned, version: 2 })).toBeUndefined();
    expect(parseRepertoireEvaluationState(planned, 2)).toBeUndefined();
    expect(parseRepertoireEvaluationState(null)).toBeUndefined();
    expect(parseRepertoireEvaluationState({ version: 1 })).toBeUndefined();
  });

  it("drops a result for no planned position, or one with no line", () => {
    const planned = planOf(inputOf("1. e4 *"))!.state;
    const key = planned.positions[0].key;
    const parsed = parseRepertoireEvaluationState({
      ...planned,
      results: {
        [key]: { fen: "ignored", lines: [{ score: { kind: "cp", value: 12 }, depth: 18, pv: ["e2e4"] }] },
        "8/8/8/8/8/8/8/8 w - -": { fen: "x", lines: [{ score: { kind: "cp", value: 1 }, depth: 1, pv: [] }] },
        [planned.positions[1].key]: { fen: "y", lines: [{ score: "bad" }] },
      },
    })!;
    expect(Object.keys(parsed.results)).toEqual([key]);
    expect(parsed.results[key]).toEqual({ fen: planned.positions[0].fen, lines: [{ score: { kind: "cp", value: 12 }, depth: 18, pv: ["e2e4"] }] });
  });

  it("re-plans a state from a changed repertoire rather than lending it its results", async () => {
    const before = inputOf("1. e4 e5 2. Nf3 *");
    const state = await runToEnd(before, fakeEngine({}, {}).evaluate);
    // Black's reply changed: every result of the old plan is a FEN's, but the plan is another's.
    const after = inputOf("1. e4 c5 2. Nf3 *");
    expect(stateFor(after, state)).toBeUndefined();
    expect(stateFor(before, state)).toBe(state);
    const report = reportOf(state, after)!;
    expect(report.moves.every((move) => move.verdict === "pending")).toBe(true);
    expect(report.positions.done).toBe(0);
    const { evaluate, calls } = fakeEngine();
    const stepped = await stepOf(state, after, evaluate);
    expect(stepped.state.fingerprint).toBe(planOf(after)!.state.fingerprint);
    expect(Object.keys(stepped.state.results)).toHaveLength(1);
    expect(calls).toHaveLength(1);
    // A changed side, ply limit or search re-plans as well.
    expect(stateFor({ ...before, side: "b" }, state)).toBeUndefined();
    expect(stateFor({ ...before, maxPlies: 2 }, state)).toBeUndefined();
    expect(stateFor({ ...before, search: { ...before.search, depth: 12 } }, state)).toBeUndefined();
  });
});

/*
  The shared fixture: one line of White's, with evals that make an
  inaccuracy, a mistake, a blunder and a good move, line 1 of each position
  before a move naming another move (so each flagged one has a "best").
*/
const SHARED = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 *";
const SHARED_SCORES: Record<string, number> = {};
const SHARED_PVS: Record<string, string[]> = {};
{
  const line = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5"];
  // After each ply (0 the start), White's view.
  const scores = [30, -30, 40, -30, 30, -100, 20, -300, 30, 35];
  const pvs = [["d2d4"], [], ["d2d4"], [], ["f1b5"], [], ["d2d3"], [], ["e4d5"], []];
  scores.forEach((cp, ply) => {
    const key = positionKeyOf(fenAfter(SHARED, line.slice(0, ply)));
    SHARED_SCORES[key] = cp;
    SHARED_PVS[key] = pvs[ply];
  });
}

describe("verdicts agree with computerAnalysis (CTA-219)", () => {
  it("judges each move as moveVerdicts does on the same evals — kind, loss, best and both scores", async () => {
    const input = inputOf(SHARED);
    const { evaluate } = fakeEngine(SHARED_SCORES, SHARED_PVS);
    const state = await runToEnd(input, evaluate);
    const report = reportOf(state, input)!;

    const tree = parsePgnTree(SHARED);
    const options = computerAnalysisOptionsFrom({ side: "w", thresholds: input.thresholds });
    const positions = analysisPositionsOf(tree, options);
    const results: PositionResult[] = await Promise.all(positions.map((position) => evaluate({ fen: position.fen, turn: position.turn, multiPv: 1 }).then((result) => result!)));
    const verdicts = moveVerdicts(positions, results, options);

    expect(verdicts.map((verdict) => verdict.kind)).toEqual(["inaccuracy", "inaccuracy", "mistake", "blunder", null]);
    expect(report.moves).toHaveLength(verdicts.length);
    for (const verdict of verdicts) {
      const move = report.moves.find((each) => each.san === verdict.san)!;
      expect(move.verdict).toBe(verdict.kind ?? "good");
      expect(move.loss).toBe(verdict.loss);
      expect(move.bestSan).toBe(verdict.bestSan);
      expect(move.before).toEqual(verdict.best);
      expect(move.after).toEqual(verdict.played);
    }
  });

  it("puts the flagged moves first, worst first, each with its best move, then the rest", async () => {
    const input = inputOf(SHARED);
    const state = await runToEnd(input, fakeEngine(SHARED_SCORES, SHARED_PVS).evaluate);
    const report = reportOf(state, input)!;
    expect(report.schema).toBe(REPERTOIRE_EVALUATION_REPORT_SCHEMA);
    expect(report.moves.map((move) => [move.move, move.verdict, move.bestSan])).toEqual([
      ["4. Ng5", "blunder", "d3"],
      ["3. Bc4", "mistake", "Bb5"],
      ["2. Nf3", "inaccuracy", "d4"],
      ["1. e4", "inaccuracy", "d4"],
      ["5. exd5", "good", undefined],
    ]);
    expect(report.counts).toEqual({ blunder: 1, missedMate: 0, mistake: 1, inaccuracy: 2, good: 1, pending: 0 });
    expect(report.positions).toEqual({ done: 10, total: 10 });
    expect(parseRepertoireEvaluationReport(JSON.parse(JSON.stringify(report)))).toEqual(report);
    expect(parseRepertoireEvaluationReport({ schema: "other@1", moves: [], counts: {} })).toBeUndefined();
  });

  it("writes the same NAGs and comments as computerAnalysisTree on the same evals", async () => {
    const input = inputOf(SHARED);
    const { evaluate } = fakeEngine(SHARED_SCORES, SHARED_PVS);
    const state = await runToEnd(input, evaluate);
    const annotated = annotatedTreeOf(state, input)!;

    const tree = parsePgnTree(SHARED);
    const options = computerAnalysisOptionsFrom({ side: "w", thresholds: input.thresholds });
    const positions = analysisPositionsOf(tree, options);
    const results = await Promise.all(positions.map((position) => evaluate({ fen: position.fen, turn: position.turn, multiPv: 1 })));
    const light = computerAnalysisTree({
      source: tree,
      positions,
      results,
      verdicts: moveVerdicts(positions, results, options),
      variant: "light",
      engine: "Stockfish",
      options,
    });
    let node: VariationNode | undefined = annotated.moves[0];
    let theirs: VariationNode | undefined = light.moves[0];
    while (node !== undefined && theirs !== undefined) {
      expect(node.nags, node.san).toEqual(theirs.nags);
      expect(node.comments, node.san).toEqual(theirs.comments);
      node = node.children[0];
      theirs = theirs.children[0];
    }
  });
});

describe("the annotated tree and the outputs (CTA-219)", () => {
  const ids = (tree: GameTree) =>
    new TreeManager<VariationNode>(tree.moves).toArray().map((node) => [node.id, sanPathTo(tree, node.id).join(" ")]);

  it("keeps every node's id and everything it had, an [%eval] on each searched move, a verdict on each judged one", async () => {
    const pgn = "1. e4 {Best by test} e5 (1... c5 2. Nf3) 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 *";
    const input = inputOf(pgn);
    const state = await runToEnd(input, fakeEngine(SHARED_SCORES, SHARED_PVS).evaluate);
    const annotated = annotatedTreeOf(state, input, { annotator: "Stockfish 19 Lite" })!;
    const source = parsePgnTree(pgn);
    expect(ids(annotated)).toEqual(ids(source));

    const e4 = annotated.moves[0];
    expect(e4.comments?.[0]).toBe("[%eval -0.30,20] Best by test");
    expect(e4.nags).toEqual([6]);
    expect(e4.comments?.at(-1)).toBe("Inaccuracy. d4 was best.");
    // The start position's eval, in the opening comment.
    expect(annotated.comments?.join(" ")).toContain("[%eval 0.30,20]");
    // A side line's own move judged too: 2. Nf3 after 1... c5.
    const sideNf3 = findNode(annotated, e4.children[1].children[0].id)!;
    expect(sideNf3.san).toBe("Nf3");
    expect(sideNf3.comments?.join(" ")).toContain("[%eval");
    expect(annotated.headers.Annotator).toBe("Stockfish 19 Lite [repertoire evaluation]");
    expect(annotatedTreeOf(state, input)!.headers.Annotator).toBeUndefined();
  });

  it("plans the report always, and a new repertoire and a PGN file when ticked — the same ids every time", async () => {
    const input = inputOf(SHARED, { outputs: { repertoire: true, pgnFile: true } });
    const state = await runToEnd(input, fakeEngine(SHARED_SCORES, SHARED_PVS).evaluate);
    const plans = outputPlansOf(state, input, "Job-42");
    expect(plans.map((plan) => plan.key)).toEqual(["report", "repertoire", "pgn-file"]);
    expect(plans[0]).toMatchObject({ kind: "data", schema: REPERTOIRE_EVALUATION_REPORT_SCHEMA });
    expect(plans[1]).toMatchObject({ kind: "repertoire", repertoireId: "rjob42e", name: "Queen's Gambit — evaluated" });
    expect(plans[2]).toMatchObject({ kind: "artifact", name: "Queen's Gambit-evaluated.pgn", mimeType: "application/x-chess-pgn" });
    const pgn = (plans[1] as { pgn: string }).pgn;
    expect(pgn).toContain("$4");
    expect(parsePgnTree(pgn).moves[0].san).toBe("e4");
    expect(outputPlansOf(state, input, "Job-42")).toEqual(plans);
    expect(outputPlansOf(state, inputOf(SHARED), "Job-42").map((plan) => plan.key)).toEqual(["report"]);
    expect(evaluatedRepertoireId("Job-42")).toBe(evaluatedRepertoireId("job42"));
    expect(evaluatedPgnFileName('a/b:c* "d"')).toBe("a b c d-evaluated.pgn");
    expect(evaluatedPgnFileName("  ")).toBe("repertoire-evaluated.pgn");
  });
});

describe("continued with other engine settings (CTA-236)", () => {
  const current: JobEngineSettings = {
    engine: "stockfish-19-lite",
    preset: { id: "fast", name: "Fast", values: { Contempt: 10 } },
    depth: 14,
    moveTimeMs: 2_000,
    threads: 1,
    hashMb: 32,
  };
  const continues = { jobId: "old", title: "Queen's Gambit", createdAt: "2026-10-01T10:00:00.000Z" };

  it("reads the engine settings a stored input carries — and none it does not", () => {
    const preset = { id: "deep", name: "Deep", values: { "Move Overhead": 250 } };
    expect(recordedEngineSettingsOf(inputOf("1. d4 *", { preset }))).toEqual({
      engine: "stockfish-19-lite",
      preset,
      depth: DEFAULT_REPERTOIRE_EVALUATION_SETTINGS.search.depth,
      moveTimeMs: DEFAULT_REPERTOIRE_EVALUATION_SETTINGS.search.moveTimeMs,
      threads: DEFAULT_REPERTOIRE_EVALUATION_SETTINGS.search.threads,
      hashMb: DEFAULT_REPERTOIRE_EVALUATION_SETTINGS.search.hashMb,
    });
    // No preset (`null`) and no search: an older record never chose them.
    expect(recordedEngineSettingsOf({ repertoireId: "rep1", pgn: "", engine: "stockfish-19-lite", preset: null })).toEqual({ engine: "stockfish-19-lite" });
  });

  it("keeps the repertoire and the form, takes the current engine, preset and search, and plans from the results so far", async () => {
    const input = inputOf(SHARED, { maxPlies: 6, search: { ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS.search, multiPv: 2 } });
    const planned = planOf(input)!.state;
    // Two positions searched under the old settings.
    const { evaluate } = fakeEngine();
    let state: RepertoireEvaluationState = planned;
    for (let at = 0; at < 2; at += 1) state = (await stepOf(state, input, evaluate)).state;

    const next = continuedInputOf(input, state, current, continues);
    expect(next).toMatchObject({ repertoireId: "rep1", name: "Queen's Gambit", pgn: SHARED, side: "w", maxPlies: 6, engine: "stockfish-19-lite" });
    expect(next.preset).toEqual(current.preset);
    expect(next.search).toEqual({ depth: 14, moveTimeMs: 2_000, threads: 1, hashMb: 32, multiPv: 2 });
    expect(next.continues).toEqual(continues);
    // The search changed, so the old state is another plan's — the seed carries its results over.
    expect(stateFor(next, state)).toBeUndefined();
    const read = parseRepertoireEvaluationInput(JSON.parse(JSON.stringify(next)))!;
    expect(read.seed).toEqual(state.results);
    const seeded = planOf(read)!;
    expect(seeded.progress.done).toBe(2);
    expect(seeded.state.results).toEqual(state.results);
    // Only the rest is searched, and the seeded state is this input's own.
    const rest = fakeEngine();
    const end = await runToEnd(read, rest.evaluate);
    expect(rest.calls).toHaveLength(planned.positions.length - 2);
    expect(rest.calls).not.toContain(Object.keys(state.results)[0]);
    expect(stateFor(read, end)).toBe(end);
  });

  it("ignores a seed's result for no planned position, under another key, or with no line", () => {
    const fen = fenAfter(SHARED, ["e4"]);
    const result = { fen, lines: [{ score: { kind: "cp" as const, value: 10 }, depth: 20, pv: [] }] };
    const read = parseRepertoireEvaluationInput({
      ...inputOf(SHARED, { maxPlies: 2 }),
      seed: { [positionKeyOf(fen)]: result, wrong: result, [positionKeyOf(fenAfter(SHARED, ["e4", "e5"]))]: { fen: fenAfter(SHARED, ["e4", "e5"]), lines: [] }, "8/8/8/8/8/8/8/K6k w - -": { fen: "8/8/8/8/8/8/8/K6k w - - 0 1", lines: result.lines } },
    })!;
    expect(Object.keys(read.seed ?? {})).toEqual([positionKeyOf(fen), "8/8/8/8/8/8/8/K6k w - -"]);
    expect(planOf(read)!.state.results).toEqual({ [positionKeyOf(fen)]: result });
    expect(parseRepertoireEvaluationInput({ ...inputOf(SHARED), seed: [] })).not.toHaveProperty("seed");
  });
});

describe("the input (CTA-219)", () => {
  it("is invalid without the repertoire's id or its PGN, and reads the rest leniently", () => {
    expect(parseRepertoireEvaluationInput({ pgn: "1. e4 *" })).toBeUndefined();
    expect(parseRepertoireEvaluationInput({ repertoireId: "r", pgn: 3 })).toBeUndefined();
    expect(parseRepertoireEvaluationInput("nope")).toBeUndefined();
    const read = parseRepertoireEvaluationInput({
      repertoireId: "r",
      pgn: "1. e4 *",
      side: "b",
      maxPlies: 500,
      search: { depth: 99, multiPv: 2 },
      thresholds: { inaccuracy: 80, mistake: 40, blunder: 300 },
      outputs: { repertoire: true, pgnFile: "yes" },
      preset: { id: "p", name: "Deep", values: { Contempt: 10, Bad: {} } },
    })!;
    expect(read).toMatchObject({
      repertoireId: "r",
      name: "",
      side: "b",
      maxPlies: 80,
      search: { depth: 40, multiPv: 2 },
      thresholds: { inaccuracy: 80, mistake: 80, blunder: 300 },
      outputs: { repertoire: true, pgnFile: false },
      preset: { id: "p", name: "Deep", values: { Contempt: 10 } },
    });
    expect(read.engine).toBe(DEFAULT_COMPUTER_ANALYSIS_OPTIONS.engine);
    expect(parseRepertoireEvaluationInput(read)).toEqual(read);
  });
});

describe("the report's words (CTA-219)", () => {
  it("numbers a line from its start, and turns a score to the side's view", () => {
    const start = parsePgnTree("*").startFen;
    expect(numberedLine(start, ["e4", "c5", "Nf3"])).toBe("1. e4 c5 2. Nf3");
    expect(numberedLine(start, ["c5", "Nf3"], 2)).toBe("1... c5 2. Nf3");
    expect(scoreForSide({ kind: "cp", value: 35 }, "b")).toEqual({ kind: "cp", value: -35 });
    expect(scoreForSide({ kind: "mate", value: -2 }, "w")).toEqual({ kind: "mate", value: -2 });
  });
});
