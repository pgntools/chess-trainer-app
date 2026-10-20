import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { ANALYSED_PGN, RUY_LOPEZ_38, START_FEN, applied, searchOf, sessionOfPgn } from "../../test/findBestMoveKit";
import { addLine, emptyTree } from "../gameTree";
import { lineMovesOf, positionFenOf, trainingPositionOf, type FindBestMoveRecord, type PositionKey } from "./model";
import { workFragmentOf } from "./pgn";
import { sessionEvents as e, sessionReducer, type SessionEvent } from "./reducer";

/*
  The session's transitions (CTA-244, the design note §4.3): each row of the
  event table, and the invariants after every event of a seeded random walk.
*/

/** White's positions 1 and 3 (1. e4, 2. Qh5) and Black's 2 (1... e5), N 2. */
const fresh = () => sessionOfPgn(ANALYSED_PGN);

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

/** The reader's lines from a position as a work tree. */
const workAt = (fen: string, ...lines: string[][]) =>
  lines.reduce((tree, sans) => addLine(tree, null, lineMovesOf(fen, sans)).tree, emptyTree(fen));

describe("sessionReducer — the event table", () => {
  it("starts on the first position, every one open and idle", () => {
    const record = fresh();
    expect(record.keys).toEqual([1, 2, 3]);
    expect(record.current).toBe(1);
    expect([...record.positions.values()].map((each) => [each.answer.kind, each.engine.kind])).toEqual([
      ["open", "idle"],
      ["open", "idle"],
      ["open", "idle"],
    ]);
  });

  it("goTo moves current, and leaves a reopened pass passed again", () => {
    const passed = applied(fresh(), [e.pass(1), e.next(), e.reopen(1)]);
    expect(passed.current).toBe(1);
    expect(passed.positions.get(1)?.answer.kind).toBe("reopened");
    const left = sessionReducer(passed, e.goTo(2));
    expect(left.current).toBe(2);
    expect(left.positions.get(1)?.answer.kind).toBe("passed");
  });

  it("goTo the position on screen, or a key not in the manifest, is no event", () => {
    const record = fresh();
    expect(sessionReducer(record, e.goTo(1))).toBe(record);
    expect(sessionReducer(record, e.goTo(9))).toBe(record);
  });

  it("workRecorded replaces the work; the same fragment, or a tree from another position, is no event", () => {
    const record = fresh();
    const work = workAt(START_FEN, ["e4", "e5"], ["d4"]);
    const recorded = sessionReducer(record, e.workRecorded(1, work));
    expect(workFragmentOf(recorded.positions.get(1)?.work ?? null)).toBe("1. e4 (1. d4) 1... e5");
    expect(sessionReducer(recorded, e.workRecorded(1, workAt(START_FEN, ["e4", "e5"], ["d4"])))).toBe(recorded);
    expect(sessionReducer(record, e.workRecorded(1, workAt(AFTER_E4, ["e5"])))).toBe(record);
    expect(sessionReducer(recorded, e.workRecorded(1, null)).positions.get(1)?.work).toBeNull();
  });

  it("firstMove wants the engine only where it is on and the lines are too few", () => {
    const off = fresh();
    expect(sessionReducer(off, e.firstMove(1))).toBe(off);
    const on = sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 5 } });
    expect(sessionReducer(on, e.firstMove(1)).positions.get(1)?.engine).toEqual({ kind: "wanted" });
    // Two of the engine's lines are enough for N 2.
    const enough = sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 2 } });
    expect(sessionReducer(enough, e.firstMove(1))).toBe(enough);
  });

  it("answer is final, takes one move or more, and wants the engine as firstMove does", () => {
    const record = fresh();
    expect(sessionReducer(record, e.answer(1, []))).toBe(record);
    const answered = sessionReducer(record, e.answer(1, ["e4", "d4"]));
    expect(answered.positions.get(1)?.answer).toEqual({ kind: "answered", moves: ["e4", "d4"] });
    expect(sessionReducer(answered, e.answer(1, ["Nf3"]))).toBe(answered);
    expect(sessionReducer(answered, e.pass(1))).toBe(answered);
    const on = sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 5 } });
    expect(sessionReducer(on, e.answer(1, ["e4"])).positions.get(1)?.engine.kind).toBe("wanted");
  });

  it("started after Next (CTA-247): a first move wants nothing, a grading wants the engine, a pass never", () => {
    const grade = sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 5, engineStart: "grade" } });
    expect(sessionReducer(grade, e.firstMove(1))).toBe(grade);
    // Results, or Next while answering — both the answer event.
    expect(applied(grade, [e.firstMove(1), e.answer(1, ["e4"])]).positions.get(1)?.engine.kind).toBe("wanted");
    expect(applied(grade, [e.firstMove(1), e.answer(1, ["e4"]), e.next()]).positions.get(1)?.engine.kind).toBe("wanted");
    expect(applied(grade, [e.firstMove(1), e.pass(1)]).positions.get(1)?.engine.kind).toBe("idle");
    // The engine off, a grading wants nothing either.
    const off = sessionOfPgn(ANALYSED_PGN, { settings: { moves: 5, engineStart: "grade" } });
    expect(sessionReducer(off, e.answer(1, ["e4"])).positions.get(1)?.engine.kind).toBe("idle");
  });

  it("a pass never waits, and reopen takes back a pass alone", () => {
    const on = sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 5 } });
    const passed = sessionReducer(on, e.pass(1));
    expect(passed.positions.get(1)).toMatchObject({ answer: { kind: "passed" }, engine: { kind: "idle" } });
    expect(sessionReducer(on, e.reopen(1))).toBe(on);
    const answered = sessionReducer(on, e.answer(2, ["e5"]));
    expect(sessionReducer(answered, e.reopen(2))).toBe(answered);
  });

  it("reopen opens the pass as the position on screen, leaving the one there", () => {
    const record = applied(fresh(), [e.pass(1), e.next(), e.pass(2), e.next(), e.reopen(1)]);
    expect(record.current).toBe(1);
    // Reopening another while one is reopened passes the first again.
    const again = sessionReducer(record, e.reopen(2));
    expect(again.current).toBe(2);
    expect(again.positions.get(1)?.answer.kind).toBe("passed");
    expect(again.positions.get(2)?.answer.kind).toBe("reopened");
  });

  it("next goes to the first open position after the one on screen, or nowhere", () => {
    const record = applied(fresh(), [e.answer(1, ["e4"]), e.next()]);
    expect(record.current).toBe(2);
    const last = applied(record, [e.answer(2, ["e5"]), e.next(), e.answer(3, ["Nf3"])]);
    expect(last.current).toBe(3);
    expect(sessionReducer(last, e.next())).toBe(last);
  });

  it("the engine axis: wanted → queued → searched, the result's lines merged, idempotent", () => {
    const on = applied(sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 4 } }), [e.firstMove(1)]);
    expect(sessionReducer(on, e.engineSearched(9, "j", searchOf(START_FEN, [])))).toBe(on);
    const queued = sessionReducer(on, e.engineQueued(1, "j1"));
    expect(queued.positions.get(1)?.engine).toEqual({ kind: "queued", jobId: "j1" });
    expect(sessionReducer(queued, e.engineQueued(1, "j2"))).toBe(queued);
    const result = searchOf(START_FEN, [{ pv: ["c2c4", "e7e5"], cp: 28 }, { pv: ["e2e4"], cp: 31 }]);
    const searched = sessionReducer(queued, e.engineSearched(1, "j1", result));
    expect(searched.positions.get(1)?.engine).toEqual({ kind: "searched", jobId: "j1" });
    // c4 is new, ranked in; e4 the lines hold already, so it keeps its own.
    expect(searched.positions.get(1)?.lines.map((line) => line.san)).toEqual(["e4", "c4", "d4", "Nf3"]);
    // The game's e4 scores above the worst listed line now: listed too (`withEngineResult`'s rule).
    expect(trainingPositionOf(searched, 1)?.topCount).toBe(4);
    expect(sessionReducer(searched, e.engineSearched(1, "j1", result))).toBe(searched);
    expect(sessionReducer(searched, e.engineFailed(1, "j1"))).toBe(searched);
  });

  it("engineFailed ends a wanted or queued search — but not another job's", () => {
    const on = applied(sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 4 } }), [e.firstMove(1)]);
    expect(sessionReducer(on, e.engineFailed(1)).positions.get(1)?.engine).toEqual({ kind: "failed" });
    const queued = sessionReducer(on, e.engineQueued(1, "j1"));
    expect(sessionReducer(queued, e.engineFailed(1, "other"))).toBe(queued);
    expect(sessionReducer(queued, e.engineFailed(1)).positions.get(1)?.engine).toEqual({ kind: "failed", jobId: "j1" });
    // Never asked twice: a failed position is never wanted again.
    const failed = sessionReducer(queued, e.engineFailed(1, "j1"));
    expect(sessionReducer(failed, e.firstMove(1))).toBe(failed);
  });

  it("settingsChanged changes the switches, and the same ones are no event", () => {
    const record = fresh();
    expect(sessionReducer(record, e.settingsChanged({ arrows: true }))).toBe(record);
    expect(sessionReducer(record, e.settingsChanged({ engineStart: "move" }))).toBe(record);
    expect(sessionReducer(record, e.settingsChanged({ engine: true })).settings).toEqual({ engine: true, arrows: true, engineStart: "move" });
    expect(sessionReducer(record, e.settingsChanged({ engineStart: "grade" })).settings).toEqual({ engine: false, arrows: true, engineStart: "grade" });
  });

  it("settingsChanged of when the engine starts leaves every position's engine as it is (CTA-247)", () => {
    const on = sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 5 } });
    const asked = applied(on, [e.firstMove(1), e.answer(2, ["e5"]), e.engineQueued(2, "j2")]);
    const switched = sessionReducer(asked, e.settingsChanged({ engineStart: "grade" }));
    expect(switched.positions).toBe(asked.positions);
    // A position wanted on its first move stays wanted — never asked twice, never dropped.
    expect(switched.positions.get(1)?.engine).toEqual({ kind: "wanted" });
    expect(switched.positions.get(2)?.engine).toEqual({ kind: "queued", jobId: "j2" });
    // Switched back, a move asks again where nothing was asked.
    const back = sessionReducer(switched, e.settingsChanged({ engineStart: "move" }));
    expect(sessionReducer(back, e.firstMove(3)).positions.get(3)?.engine.kind).toBe("wanted");
  });
});

/* ─── The invariants, over a seeded random walk ───────────────────────── */

/** mulberry32 — a small seeded generator, so the walk is the same every run. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)];

const randomEvent = (random: () => number, record: FindBestMoveRecord): SessionEvent => {
  const key: PositionKey = pick(random, [...record.keys, 99]);
  const fen = positionFenOf(record.game, key) ?? START_FEN;
  const job = pick(random, ["j1", "j2"]);
  return pick(random, [
    () => e.goTo(key),
    () => e.workRecorded(key, random() < 0.3 ? null : workAt(fen, [pick(random, new Chess(fen).moves())])),
    () => e.firstMove(key),
    () => e.answer(key, random() < 0.2 ? [] : ["e4", "d4"].slice(0, 1 + Math.floor(random() * 2))),
    () => e.pass(key),
    () => e.reopen(key),
    () => e.next(),
    () => e.engineQueued(key, job),
    () => e.engineSearched(key, job, searchOf(fen, [{ pv: ["a2a3"], cp: -10 }])),
    () => e.engineFailed(key, random() < 0.5 ? undefined : job),
    () => e.settingsChanged({ engine: random() < 0.5 }),
    () => e.settingsChanged({ engineStart: random() < 0.5 ? "move" : "grade" }),
  ])();
};

/** Every invariant of the design note §4.3, between a record and the next. */
const expectInvariants = (before: FindBestMoveRecord, after: FindBestMoveRecord) => {
  expect(after.keys).toContain(after.current);
  expect([...after.positions.keys()]).toEqual([...after.keys]);
  const reopened = after.keys.filter((key) => after.positions.get(key)?.answer.kind === "reopened");
  expect(reopened.length).toBeLessThanOrEqual(1);
  if (reopened.length === 1) expect(reopened[0]).toBe(after.current);
  for (const key of after.keys) {
    const was = before.positions.get(key)!;
    const now = after.positions.get(key)!;
    if (now.answer.kind === "answered") expect(now.answer.moves.length).toBeGreaterThan(0);
    if (was.answer.kind === "answered") expect(now.answer).toEqual(was.answer);
    if (was.engine.kind === "searched" || was.engine.kind === "failed") expect(now.engine).toEqual(was.engine);
    if (was.engine.kind !== "idle") expect(now.engine.kind).not.toBe("idle");
    // The lines only grow, and only through a search.
    expect(now.lines.length).toBeGreaterThanOrEqual(was.lines.length);
    if (now.lines !== was.lines) expect(now.engine.kind).toBe("searched");
    if (now.work !== null) expect(now.work.startFen.split(" ").slice(0, 4)).toEqual(positionFenOf(after.game, key)!.split(" ").slice(0, 4));
  }
};

describe("sessionReducer — the invariants", () => {
  it("hold after every event of 300 seeded walks of 40 events", () => {
    const random = seeded(244);
    const starts = [
      sessionOfPgn(ANALYSED_PGN),
      sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 5 } }),
      sessionOfPgn(RUY_LOPEZ_38, { settings: { engine: true, moves: 3 } }),
      sessionOfPgn(RUY_LOPEZ_38, { settings: { engine: true, moves: 3, engineStart: "grade" } }),
    ];
    for (let walk = 0; walk < 300; walk += 1) {
      let record = starts[walk % starts.length];
      for (let step = 0; step < 40; step += 1) {
        const next = sessionReducer(record, randomEvent(random, record));
        expectInvariants(record, next);
        record = next;
      }
    }
  });
});
