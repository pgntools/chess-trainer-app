import { describe, expect, it } from "vitest";

import {
  EVALUATE_POSITION_STATE_VERSION,
  parseEvaluatePositionInput,
  parseEvaluatePositionResult,
  parseEvaluatePositionState,
} from "./core";

/*
  Evaluate Position's core (CTA-238): its input and state read leniently,
  its data output read back.
*/

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const RESULT = { fen: START, lines: [{ score: { kind: "cp", value: 30 }, depth: 20, pv: ["e2e4", "e7e5"] }] };

describe("parseEvaluatePositionInput", () => {
  it("reads an input, the search held to its bounds", () => {
    expect(
      parseEvaluatePositionInput({
        caseId: "c1",
        name: "Evaluate position — Alice – Bob, 1. White",
        fen: START,
        path: ["e4", 3, "e5"],
        label: "1. White",
        engine: "stockfish-19-lite",
        preset: { id: "p", name: "Deep", values: { Contempt: 10, Bad: {} } },
        search: { depth: 22, moveTimeMs: 2000, threads: 1, hashMb: 32, multiPv: 999 },
      }),
    ).toMatchObject({
      caseId: "c1",
      fen: START,
      path: ["e4", "e5"],
      label: "1. White",
      engine: "stockfish-19-lite",
      preset: { id: "p", name: "Deep", values: { Contempt: 10 } },
      search: { depth: 22, moveTimeMs: 2000, threads: 1, hashMb: 32 },
    });
  });

  it("refuses an input with no Case or no position that reads, and fills the rest", () => {
    expect(parseEvaluatePositionInput({ fen: START })).toBeUndefined();
    expect(parseEvaluatePositionInput({ caseId: "c", fen: "not a fen" })).toBeUndefined();
    expect(parseEvaluatePositionInput(null)).toBeUndefined();
    expect(parseEvaluatePositionInput({ caseId: "c", fen: START })).toMatchObject({ name: "", path: [], label: "", preset: null });
  });
});

describe("parseEvaluatePositionState", () => {
  it("reads its own version, a result that does not read as none", () => {
    expect(parseEvaluatePositionState({ result: RESULT, engine: { id: "e", name: "E" } }, EVALUATE_POSITION_STATE_VERSION)).toEqual({
      result: RESULT,
      engine: { id: "e", name: "E", version: "" },
    });
    expect(parseEvaluatePositionState({ result: { fen: START, lines: [] } }, EVALUATE_POSITION_STATE_VERSION)).toEqual({ result: null, engine: null });
    expect(parseEvaluatePositionState({}, EVALUATE_POSITION_STATE_VERSION + 1)).toBeUndefined();
  });
});

describe("parseEvaluatePositionResult", () => {
  it("reads a result back, or nothing", () => {
    expect(parseEvaluatePositionResult(RESULT)).toEqual(RESULT);
    expect(parseEvaluatePositionResult({ fen: START })).toBeUndefined();
  });
});
