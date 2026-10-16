import { describe, expect, it, vi } from "vitest";

import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type PositionResult } from "../../../computerAnalysis";
import { findNode, mainline, treeToPgn } from "../../../gameTree";
import { parsePgnTree } from "../../../pgn";
import {
  ANALYSIS_CASE_ENTITY,
  ANALYSIS_PROJECT_ENTITY,
  analysisOf,
  COMPUTER_ANALYSIS_KIND,
  ComputerAnalysisError,
  COMPUTER_ANALYSIS_KIND_VERSION,
  mergedPgnOf,
  moveLabelOf,
  outputNameOf,
  outputPlansOf,
  parseInput,
  parseState,
  planOf,
  progressOf,
  readInput,
  sourceTreeOf,
  stepOf,
  subjectsOf,
  titleOf,
  type ComputerAnalysisInput,
  type ComputerAnalysisState,
  type PositionEvaluator,
} from "./core";
import coreSource from "./core.ts?raw";

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';

const inputOf = (patch: Partial<ComputerAnalysisInput> = {}): ComputerAnalysisInput => ({
  source: { projectId: "p", caseId: "c", name: " Alice – Bob ", pgn: PGN },
  options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
  preset: { id: "deep", name: "Deep", values: { "Move Overhead": 250 } },
  target: { kind: "project", projectId: "p" },
  ...patch,
});

const resultAt = (fen: string, cp = 20): PositionResult => ({ fen, lines: [{ score: { kind: "cp", value: cp }, depth: 20, pv: [] }] });

/** An evaluator answering +0.20 for every position, each call recorded. */
const evaluator = () => vi.fn<PositionEvaluator>(async (position) => resultAt(position.fen));

/** A state run to its end, step by step. */
const finished = async (input: ComputerAnalysisInput): Promise<ComputerAnalysisState> => {
  let state = planOf(input)!.state;
  const evaluate = evaluator();
  for (;;) {
    const step = (await stepOf(state, input, evaluate))!;
    state = step.state;
    if (step.done) return state;
  }
};

describe("the computer-analysis kind's core (CTA-218)", () => {
  it("names the kind and the entity types as the Jobs module's registries do (CTA-215)", () => {
    expect(COMPUTER_ANALYSIS_KIND).toBe("analysis.computer-analysis");
    expect([ANALYSIS_CASE_ENTITY, ANALYSIS_PROJECT_ENTITY]).toEqual(["analysis-case", "analysis-project"]);
  });

  describe("its input", () => {
    it("reads a request: the name trimmed, the options clamped as a form's, the preset and target kept", () => {
      const input = parseInput(inputOf())!;
      expect(input).toMatchObject({
        source: { projectId: "p", caseId: "c", name: "Alice – Bob", pgn: PGN },
        preset: { id: "deep", name: "Deep", values: { "Move Overhead": 250 } },
        target: { kind: "project", projectId: "p" },
      });
      expect(parseInput(JSON.parse(JSON.stringify(input)))).toEqual(input);
    });

    it("refuses one with nothing to run, and a merge into the Case with more than one variant", () => {
      expect(parseInput(inputOf({ options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: [] } }))).toBeUndefined();
      expect(parseInput(inputOf({ source: { projectId: "p", caseId: "c", name: "x", pgn: "*" } }))).toBeUndefined();
      expect(parseInput(inputOf({ target: { kind: "case" }, options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light", "full"] } }))).toBeUndefined();
      expect(parseInput(inputOf({ target: { kind: "case" } }))?.target).toEqual({ kind: "case" });
      expect(parseInput(null)).toBeUndefined();
      expect(parseInput({ ...inputOf(), source: { ...inputOf().source, caseId: "" } })).toBeUndefined();
    });

    it("reads leniently as Jobs V2 read its rows: a target or preset that will not read, and `linked`", () => {
      const raw = inputOf();
      expect(readInput({ ...raw, target: { kind: "other" } })?.target).toEqual({ kind: "project", projectId: "p" });
      expect(readInput({ ...raw, preset: undefined })?.preset).toEqual({ id: "", name: "", values: {} });
      expect(readInput({ ...raw, preset: { values: { Hash: 16, bad: { no: 1 } } } })?.preset.values).toEqual({ Hash: 16 });
      expect(readInput({ ...raw, target: { kind: "linked", projectId: "p2" } })?.target).toEqual({ kind: "other", projectId: "p2" });
      // Leniency alone: nothing to run is the checked reader's refusal, not this one's.
      expect(readInput({ ...raw, options: { outputs: [] } })).toBeDefined();
    });

    it("titles a job by its source's name, its subjects the Case — and the other Project when its results go there", () => {
      const input = parseInput(inputOf())!;
      expect(titleOf(input)).toBe("Alice – Bob");
      expect(subjectsOf(input)).toEqual([{ type: "analysis-case", id: "c" }]);
      expect(subjectsOf(parseInput(inputOf({ target: { kind: "other", projectId: "p2" } }))!)).toEqual([
        { type: "analysis-case", id: "c" },
        { type: "analysis-project", id: "p2" },
      ]);
    });
  });

  describe("its plan and state", () => {
    it("plans every position the options name, an empty checkpoint, and its progress", () => {
      const { state, progress } = planOf(parseInput(inputOf())!)!;
      expect(state.positions.map((position) => position.san)).toEqual(["e4", "e5", "Nf3", "Nc6", undefined]);
      expect(state.checkpoint).toEqual([null, null, null, null, null]);
      expect(progress).toEqual({ done: 0, total: 5, label: "1. e4" });
    });

    it("parses its own plan's state back — through JSON too", () => {
      const { state } = planOf(parseInput(inputOf())!)!;
      expect(parseState(state, COMPUTER_ANALYSIS_KIND_VERSION)).toEqual(state);
      expect(parseState(JSON.parse(JSON.stringify(state)), COMPUTER_ANALYSIS_KIND_VERSION)).toEqual(state);
    });

    it("keeps a checkpoint entry only for its own position, pads it, and re-plans what will not read or another version", () => {
      const { state } = planOf(parseInput(inputOf())!)!;
      const line = { score: { kind: "cp", value: 12 }, depth: 18, pv: ["e7e5"] };
      const stored = {
        positions: state.positions,
        checkpoint: [
          { fen: state.positions[0].fen, lines: [line] },
          { fen: "another fen", lines: [line] },
          { fen: state.positions[2].fen, lines: [{ score: { kind: "pawns", value: 1 } }] },
        ],
      };
      expect(parseState(stored, COMPUTER_ANALYSIS_KIND_VERSION)?.checkpoint).toEqual([
        { fen: state.positions[0].fen, lines: [line] },
        null,
        null,
        null,
        null,
      ]);
      expect(parseState({ positions: [{ fen: 1 }] }, COMPUTER_ANALYSIS_KIND_VERSION)).toBeUndefined();
      expect(parseState(state, COMPUTER_ANALYSIS_KIND_VERSION + 1)).toBeUndefined();
      expect(parseState(null, COMPUTER_ANALYSIS_KIND_VERSION)).toBeUndefined();
    });

    it("numbers a position's move as a reader does, and counts its progress off the checkpoint", () => {
      const { state } = planOf(parseInput(inputOf())!)!;
      expect(moveLabelOf(state.positions[0])).toBe("1. e4");
      expect(moveLabelOf(state.positions[1])).toBe("1... e5");
      expect(moveLabelOf(state.positions[4])).toBeUndefined();
      const one = { ...state, checkpoint: state.checkpoint.map((entry, index) => (index === 0 ? resultAt(state.positions[0].fen) : entry)) };
      expect(progressOf(one)).toEqual({ done: 1, total: 5, label: "1... e5" });
    });
  });

  describe("a step", () => {
    it("evaluates the first position without a result and writes it at its index", async () => {
      const input = parseInput(inputOf())!;
      const { state } = planOf(input)!;
      const evaluate = evaluator();
      const step = (await stepOf(state, input, evaluate))!;
      expect(evaluate).toHaveBeenCalledTimes(1);
      expect(evaluate.mock.calls[0][0]).toMatchObject({ fen: state.positions[0].fen, analysed: true, multiPv: 1 });
      expect(evaluate.mock.calls[0][1]).toBe(0);
      expect(step).toMatchObject({ done: false, progress: { done: 1, total: 5 }, checkpointed: { index: 0 } });
      expect(step.state.checkpoint[0]).toEqual(resultAt(state.positions[0].fen));
      // The state it started from is untouched: a re-run from it does the same step again.
      expect(state.checkpoint[0]).toBeNull();
      expect((await stepOf(state, input, evaluator()))?.state).toEqual(step.state);
    });

    it("skips what has a result, is done after the last, and is done at once when nothing is left", async () => {
      const input = parseInput(inputOf())!;
      const { state } = planOf(input)!;
      const resumed = { ...state, checkpoint: state.checkpoint.map((entry, index) => (index < 4 ? resultAt(state.positions[index].fen) : entry)) };
      const evaluate = evaluator();
      const step = (await stepOf(resumed, input, evaluate))!;
      expect(evaluate.mock.calls.map(([, index]) => index)).toEqual([4]);
      expect(step.done).toBe(true);
      const again = (await stepOf(step.state, input, evaluate))!;
      expect(again).toEqual({ state: step.state, progress: { done: 5, total: 5 }, done: true });
      expect(evaluate).toHaveBeenCalledTimes(1);
    });

    it("answers nothing when the evaluator was stopped", async () => {
      const input = parseInput(inputOf())!;
      expect(await stepOf(planOf(input)!.state, input, async () => undefined)).toBeUndefined();
    });

    it("throws `source` when the input reads other positions than the state's, and `engine` for a result about another FEN", async () => {
      const input = parseInput(inputOf())!;
      const { state } = planOf(input)!;
      const other = parseInput(inputOf({ source: { ...input.source, pgn: "1. d4 d5 2. c4 e6 *" } }))!;
      await expect(stepOf(state, other, evaluator())).rejects.toEqual(new ComputerAnalysisError("source"));
      await expect(stepOf(state, input, async () => resultAt("8/8/8/8/8/8/8/K6k w - - 0 1"))).rejects.toMatchObject({ code: "engine" });
    });
  });

  describe("its outputs", () => {
    it("plans each ticked variant as a new Case with a deterministic id, named after the source", async () => {
      const input = parseInput(inputOf({ options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light", "full"] } }))!;
      const plans = outputPlansOf(await finished(input), input, "job-1");
      expect(plans).toEqual([
        { key: "case:light", kind: "new-case", variant: "light", projectId: "p", caseId: "job-1:light", name: "Alice – Bob - computer analysis (light)" },
        { key: "case:full", kind: "new-case", variant: "full", projectId: "p", caseId: "job-1:full", name: "Alice – Bob - computer analysis (full)" },
      ]);
      expect(outputPlansOf(await finished(input), input, "job-1")).toEqual(plans);
      expect(outputNameOf("Alice – Bob", "full")).toBe("Alice – Bob - computer analysis (full)");
    });

    it("plans another Project's Cases there, and a merge into the source Case as one plan", async () => {
      const other = parseInput(inputOf({ target: { kind: "other", projectId: "p2" } }))!;
      expect(outputPlansOf(await finished(other), other, "j")[0]).toMatchObject({ projectId: "p2", caseId: "j:light" });
      const merge = parseInput(inputOf({ target: { kind: "case" } }))!;
      expect(outputPlansOf(await finished(merge), merge, "j")).toEqual([
        { key: "merge:light", kind: "merge", variant: "light", projectId: "p", caseId: "c" },
      ]);
    });

    it("plans nothing for an unfinished state — it throws `source`", () => {
      const input = parseInput(inputOf())!;
      expect(() => outputPlansOf(planOf(input)!.state, input, "j")).toThrow(ComputerAnalysisError);
    });

    it("annotates whatever tree it is given, keeping the reader's moves, side lines and comments", async () => {
      const input = parseInput(inputOf())!;
      const state = await finished(input);
      const now = parsePgnTree(`${PGN.replace("2. Nf3", "2. Nf3 {my plan}").replace(" Nc6", " Nc6 (2... d6 {solid})")}`);
      const merged = analysisOf(state, input, now, "light", { id: "sf", name: "Stockfish 19 Lite", version: "19" });
      const line = mainline(merged);
      expect(line.map((node) => node.san)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
      expect(line[2].comments?.some((text) => text.includes("my plan"))).toBe(true);
      expect(line.every((node) => node.comments?.some((text) => text.includes("[%eval")))).toBe(true);
      const side = findNode(merged, line[2].id)?.children[1];
      expect(side?.san).toBe("d6");
      expect(side?.comments).toEqual(["solid"]);
      expect(line[0].id).toBe(mainline(now)[0].id);
      expect(merged.headers.Annotator).toBe("Stockfish 19 Lite [light]");
      expect(sourceTreeOf(input)).toBe(sourceTreeOf(input));
    });

    it("merges into a PGN as a PGN edit, the one variant asked", async () => {
      const input = parseInput(inputOf({ target: { kind: "case" } }))!;
      const state = await finished(input);
      const merged = mergedPgnOf(state, input, PGN);
      expect(merged).toContain("[%eval");
      expect(mergedPgnOf(state, input, "1. e4 e5 *")).toContain("[%eval");
      expect(treeToPgn(parsePgnTree(merged!))).toBe(merged);
    });
  });

  it("is pure: it imports no store, database, engine or eval source", () => {
    const imports = [...coreSource.matchAll(/from "([^"]+)"/g)].map(([, path]) => path);
    expect(imports.length).toBeGreaterThan(0);
    for (const path of imports) expect(path).not.toMatch(/Store|Db$|idb|engines|engineSession|uciEngine|hostedEngine|engineServer|evalSources|react/);
  });
});
