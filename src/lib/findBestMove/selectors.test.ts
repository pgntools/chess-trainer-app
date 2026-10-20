import { describe, expect, it } from "vitest";

import { ANALYSED_PGN, PARTIAL_PGN, RUY_LOPEZ_38, START_FEN, applied, searchOf, sessionOfPgn } from "../../test/findBestMoveKit";
import { sessionEvents as e } from "./reducer";
import {
  REPLAY_MAX_PLIES,
  achievementsOf,
  engineFailedAt,
  engineOfferedAt,
  engineRetryOfferedAt,
  gradeOf,
  isDone,
  materialOf,
  nextOpen,
  phaseOf,
  positionAtPath,
  progressOf,
  replayPlan,
  resultsOf,
  summaryOf,
} from "./selectors";

/* What the panels read (CTA-244, the design note §4.4–§4.5): pure functions of the record. */

const fresh = () => sessionOfPgn(ANALYSED_PGN);
const engineOn = () => sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 4 } });

describe("phaseOf — every row of the phase table", () => {
  it("open: answering on screen, unanswered elsewhere", () => {
    const record = fresh();
    expect(phaseOf(record, 1)).toBe("answering");
    expect(phaseOf(record, 2)).toBe("unanswered");
    expect(phaseOf(record, 9)).toBeUndefined();
  });

  it("reopened: answering; passed: passed", () => {
    const record = applied(fresh(), [e.pass(1), e.next()]);
    expect(phaseOf(record, 1)).toBe("passed");
    expect(phaseOf(applied(record, [e.reopen(1)]), 1)).toBe("answering");
  });

  it("answered: waiting while wanted or queued, graded when idle, searched or failed — failed flagged", () => {
    const wanted = applied(engineOn(), [e.answer(1, ["e4"])]);
    expect(phaseOf(wanted, 1)).toBe("waiting");
    expect(gradeOf(wanted, 1)).toBeNull();
    const queued = applied(wanted, [e.engineQueued(1, "j")]);
    expect(phaseOf(queued, 1)).toBe("waiting");
    const searched = applied(queued, [e.engineSearched(1, "j", searchOf(START_FEN, [{ pv: ["c2c4"], cp: 28 }]))]);
    expect(phaseOf(searched, 1)).toBe("graded");
    expect(engineFailedAt(searched, 1)).toBe(false);
    const failed = applied(queued, [e.engineFailed(1, "j")]);
    expect(phaseOf(failed, 1)).toBe("graded");
    expect(engineFailedAt(failed, 1)).toBe(true);
    const idle = applied(fresh(), [e.answer(1, ["e4"])]);
    expect(phaseOf(idle, 1)).toBe("graded");
  });
});

describe("gradeOf, resultsOf, summaryOf", () => {
  it("grades an answer against the top N, a pass as one", () => {
    const record = applied(fresh(), [e.answer(1, ["e4", "d4"]), e.next(), e.pass(2), e.next()]);
    expect(gradeOf(record, 1)).toMatchObject({ found: 2, inPlace: 2, target: 2, passed: false });
    expect(gradeOf(record, 2)).toMatchObject({ passed: true, found: 0 });
    expect(gradeOf(record, 3)).toBeNull();
  });

  it("lists every answered or passed position and the one being answered, in game order", () => {
    const record = applied(fresh(), [e.goTo(3), e.answer(3, ["Nf3"]), e.goTo(2)]);
    expect(resultsOf(record).map(({ key, state }) => [key, state])).toEqual([
      [2, "answering"],
      [3, "graded"],
    ]);
  });

  it("sums up the graded positions and the passes", () => {
    const record = applied(fresh(), [e.answer(1, ["e4", "d4"]), e.next(), e.pass(2)]);
    expect(summaryOf(record)).toMatchObject({ answered: 1, passed: 1 });
  });
});

describe("achievementsOf and materialOf (CTA-249) — derived, never stored", () => {
  const piecesAt = (record: ReturnType<typeof fresh>, key: number) => achievementsOf(record, key)?.map(({ category, piece }) => [category, piece]);

  it("wins a piece per category from the graded answer", () => {
    // 1. e4 d4 Nf3 — the top 3 in order; the game's move e4 is no mistake (A4 none); e4's line is the move alone (B1 a Pawn).
    const record = applied(fresh(), [e.answer(1, ["e4", "d4", "Nf3"])]);
    expect(piecesAt(record, 1)).toEqual([
      ["order", "queen"],
      ["best", "rook"],
      ["clean", "queen"],
      ["game", null],
      ["line", "pawn"],
    ]);
    expect(record.positions.get(1)).not.toHaveProperty("achievements");
  });

  it("is none for a pass and for a position graded without its engine; nothing while not graded", () => {
    const passed = applied(fresh(), [e.pass(1), e.next()]);
    expect(achievementsOf(passed, 1)?.every(({ piece }) => piece === null)).toBe(true);
    const failed = applied(engineOn(), [e.answer(1, ["e4"]), e.engineQueued(1, "j"), e.engineFailed(1, "j")]);
    expect(achievementsOf(failed, 1)?.every(({ piece }) => piece === null)).toBe(true);
    expect(achievementsOf(applied(engineOn(), [e.answer(1, ["e4"])]), 1)).toBeNull();
    expect(achievementsOf(fresh(), 1)).toBeNull();
  });

  it("sums the session's material over the graded positions", () => {
    const record = applied(fresh(), [e.answer(1, ["e4", "d4", "Nf3"]), e.next(), e.pass(2)]);
    const material = materialOf(record);
    expect(material.material).toBe(9 + 5 + 9 + 1);
    expect(material.counts).toEqual({ pawn: 1, knight: 0, bishop: 0, rook: 1, queen: 2 });
    expect(materialOf(fresh()).material).toBe(0);
  });
});

describe("progressOf and isDone — the lobby's, from the record alone", () => {
  it("counts answered and passed, the found over the graded only", () => {
    const record = applied(engineOn(), [e.answer(1, ["e4"]), e.next(), e.pass(2)]);
    // Position 1 waits for its engine: not counted in Found yet.
    expect(progressOf(record)).toEqual({ total: 3, answered: 1, passed: 1, found: 0, inPlace: 0, target: 0, done: false });
    expect(isDone(record)).toBe(false);
    const done = applied(record, [e.engineFailed(1), e.next(), e.answer(3, ["Nf3"])]);
    expect(isDone(done)).toBe(true);
    expect(progressOf(done)).toMatchObject({ answered: 2, passed: 1, done: true });
  });
});

describe("nextOpen", () => {
  it("is the first open key after the one on screen — past answered, passed and reopened ones", () => {
    const record = sessionOfPgn(RUY_LOPEZ_38, { settings: { engine: true } });
    expect(nextOpen(record)).toBe(2);
    const later = applied(record, [e.answer(2, ["e5"]), e.pass(3), e.goTo(4), e.pass(4), e.goTo(1), e.pass(1), e.goTo(5), e.reopen(4)]);
    // On 4, reopened: 5 is open after it.
    expect(later.current).toBe(4);
    expect(nextOpen(later)).toBe(5);
    expect(nextOpen(applied(later, [e.goTo(38)]))).toBeUndefined();
  });
});

describe("a partial analysis (CTA-245)", () => {
  // White's positions: 1. e4 (lines), 2. Nf3 and 3. Nxe5 (none), 4. Nxc6 (lines) — the engine off.
  const white = () => sessionOfPgn(PARTIAL_PGN, { side: "w" });

  it("keeps every analysed position of the side in the manifest", () => {
    expect(white().keys).toEqual([1, 3, 5, 7]);
    expect(sessionOfPgn(PARTIAL_PGN, { settings: { engine: true } }).keys).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("goes on from a pass to the very next position — 1, 2, 3, 4 — and Results skips none", () => {
    let record = white();
    const visited = [record.current];
    while (nextOpen(record) !== undefined) {
      record = applied(record, [e.pass(record.current), e.next()]);
      visited.push(record.current);
    }
    expect(visited).toEqual([1, 3, 5, 7]);
    // The three passed, then the one being answered.
    expect(resultsOf(record).map((row) => [row.key, row.state])).toEqual([[1, "passed"], [3, "passed"], [5, "passed"], [7, "answering"]]);
  });

  it("offers the engine where the lines are too few while it is off — never once it is on, asked or answered", () => {
    const record = white();
    // N 2: 1. e4 has three top lines, 2. Nf3 none.
    expect(engineOfferedAt(record, 1)).toBe(false);
    expect(engineOfferedAt(record, 3)).toBe(true);
    expect(engineOfferedAt(applied(record, [e.goTo(3), e.answer(3, ["d4"])]), 3)).toBe(false);
    // Turned on, the first move asks: no offer, the engine wanted.
    const accepted = applied(record, [e.goTo(3), e.settingsChanged({ engine: true }), e.firstMove(3)]);
    expect(accepted.positions.get(3)?.engine).toEqual({ kind: "wanted" });
    expect(engineOfferedAt(accepted, 5)).toBe(false);
  });

  it("grades a position with no line against nothing, the engine declined", () => {
    const record = applied(white(), [e.goTo(3), e.answer(3, ["d4"])]);
    expect(phaseOf(record, 3)).toBe("graded");
    expect(gradeOf(record, 3)).toMatchObject({ target: 0, found: 0 });
  });
});

describe("positionAtPath", () => {
  it("is the deepest key up to the one on screen whose path leads to the board's", () => {
    const record = applied(fresh(), [e.goTo(3)]);
    expect(positionAtPath(record, [])).toBe(1);
    expect(positionAtPath(record, ["e4"])).toBe(2);
    expect(positionAtPath(record, ["e4", "e5", "Nf3", "Nc6"])).toBe(3);
    // Never one past the one on screen, even where the reader's line follows the game.
    expect(positionAtPath(applied(record, [e.goTo(2)]), ["e4", "e5"])).toBe(2);
  });
});

describe("replayPlan — capped", () => {
  const record = sessionOfPgn(RUY_LOPEZ_38, { settings: { engine: true } });

  it("plays a gap of one or two plies out in full", () => {
    expect(replayPlan(record, 5, 6)).toEqual({ start: 4, sans: ["Bb5"] });
    expect(replayPlan(record, 5, 7)).toEqual({ start: 4, sans: ["Bb5", "a6"] });
  });

  it(`jumps a longer gap to its last ${REPLAY_MAX_PLIES} plies`, () => {
    expect(replayPlan(record, 5, 13)).toEqual({ start: 10, sans: ["Re1", "b5"] });
  });

  it("plays nothing backwards — straight there", () => {
    expect(replayPlan(record, 13, 5)).toEqual({ start: 4, sans: [] });
  });
});

describe("engineRetryOfferedAt (CTA-250) — Evaluate again, where a graded position lacks its engine", () => {
  const white = () => sessionOfPgn(PARTIAL_PGN, { side: "w" });

  it("offers it where the search was lost — failed, cancelled or gone — and again once lost again", () => {
    const failed = applied(engineOn(), [e.answer(1, ["e4"]), e.engineQueued(1, "j"), e.engineFailed(1, "j")]);
    expect(engineRetryOfferedAt(failed, 1)).toBe(true);
    const again = applied(failed, [e.engineRetry(1)]);
    expect(engineRetryOfferedAt(again, 1)).toBe(false);
    expect(phaseOf(again, 1)).toBe("waiting");
    expect(engineRetryOfferedAt(applied(again, [e.engineQueued(1, "j2"), e.engineFailed(1, "j2")]), 1)).toBe(true);
  });

  it("offers it where the engine was never asked and there is nothing to compare — the offer declined", () => {
    // 2. Nf3's position (key 3) has no line: graded with target 0.
    const declined = applied(white(), [e.goTo(3), e.answer(3, ["Nf3"])]);
    expect(gradeOf(declined, 3)?.target).toBe(0);
    expect(engineRetryOfferedAt(declined, 3)).toBe(true);
    // 1. e4's has lines, if fewer than N: graded against them, nothing offered.
    const graded = applied(white(), [e.answer(1, ["e4"])]);
    expect(gradeOf(graded, 1)?.target).toBeGreaterThan(0);
    expect(engineRetryOfferedAt(graded, 1)).toBe(false);
  });

  it("offers nothing at a search that landed, a pass, a position answering, waiting or not there", () => {
    const searched = applied(engineOn(), [e.answer(1, ["e4"]), e.engineQueued(1, "j"), e.engineSearched(1, "j", searchOf(START_FEN, [{ pv: ["c2c4"], cp: 28 }]))]);
    expect(engineRetryOfferedAt(searched, 1)).toBe(false);
    const passed = applied(white(), [e.goTo(3), e.pass(3)]);
    expect(engineRetryOfferedAt(passed, 3)).toBe(false);
    expect(engineRetryOfferedAt(white(), 1)).toBe(false);
    expect(engineRetryOfferedAt(applied(engineOn(), [e.answer(1, ["e4"])]), 1)).toBe(false);
    expect(engineRetryOfferedAt(white(), 99)).toBe(false);
  });

  it("counts the position once its new search lands — graded, its pieces won (CTA-249)", () => {
    const failed = applied(engineOn(), [e.answer(1, ["e4"]), e.engineFailed(1)]);
    expect(achievementsOf(failed, 1)?.every(({ piece }) => piece === null)).toBe(true);
    const searched = applied(failed, [e.engineRetry(1), e.engineQueued(1, "j2"), e.engineSearched(1, "j2", searchOf(START_FEN, [{ pv: ["e2e4"], cp: 40 }]))]);
    expect(phaseOf(searched, 1)).toBe("graded");
    expect(engineFailedAt(searched, 1)).toBe(false);
    expect(achievementsOf(searched, 1)?.some(({ piece }) => piece !== null)).toBe(true);
  });
});
