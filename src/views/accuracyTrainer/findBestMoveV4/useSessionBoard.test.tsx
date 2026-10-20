import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import type { FindBestMoveRecord } from "../../../lib/findBestMove/model";
import { workFragmentOf } from "../../../lib/findBestMove/pgn";
import { sessionEvents as e, type SessionEvent } from "../../../lib/findBestMove/reducer";
import { addLine, emptyTree, findNode, sanPathTo } from "../../../lib/gameTree";
import { lineMovesOf } from "../../../lib/findBestMove/model";
import { ANALYSED_PGN, PLAIN_WORDS, RUY_LOPEZ_38, START_FEN, applied, sessionOfPgn } from "../../../test/findBestMoveKit";
import { useSessionBoard } from "./useSessionBoard";

/*
  The board unit (CTA-244): the core over the board's projection of the
  record, loaded when the position on screen moves; the reader's moves there;
  where the board moves and edits; the work read back and written a moment
  after; a first move asking for the engine; the replay's start.
*/

const AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

const mount = (record: FindBestMoveRecord, stepDelayMs = 0) => {
  const dispatch = vi.fn<(events: readonly SessionEvent[]) => Promise<undefined>>(async () => undefined);
  const hook = renderHook(({ record: current }) => useSessionBoard({ record: current, dispatch, words: PLAIN_WORDS, stepDelayMs }), {
    initialProps: { record },
  });
  return { ...hook, dispatch };
};

/** Drop a piece on the board, as the board's handler takes it. */
const drop = (result: { current: ReturnType<typeof useSessionBoard> }, from: string, to: string) => {
  let accepted = false;
  act(() => {
    accepted = result.current.board.onPieceDrop({ sourceSquare: from, targetSquare: to });
  });
  return accepted;
};

/** Every event the hook dispatched, flat. */
const dispatched = (dispatch: ReturnType<typeof mount>["dispatch"]) => dispatch.mock.calls.flatMap(([events]) => events);

afterEach(() => {
  vi.useRealTimers();
});

describe("useSessionBoard", () => {
  it("opens on the position, every move before it and its own work under it, facing the side to move", () => {
    const work = addLine(emptyTree(AFTER_E5), null, lineMovesOf(AFTER_E5, ["Nf3", "Nc6"])).tree;
    const { result } = mount(applied(sessionOfPgn(ANALYSED_PGN), [e.goTo(3), e.workRecorded(3, work)]));
    const { core } = result.current;
    expect(sanPathTo(core.tree, result.current.positionNodeId)).toEqual(["e4", "e5"]);
    expect(core.nodeId).toBe(result.current.positionNodeId);
    expect(core.orientation).toBe("white");
    expect(result.current.candidates).toEqual(["Nf3"]);
    expect(result.current.onPosition).toBe(true);
  });

  it("moves on the position or inside a line from it, and edits strictly under it", () => {
    const { result } = mount(applied(sessionOfPgn(ANALYSED_PGN), [e.goTo(3)]));
    expect(drop(result, "g1", "f3")).toBe(true);
    const nf3 = result.current.core.nodeId;
    expect(result.current.canMove).toBe(true);
    expect(result.current.editableAt(nf3)).toBe(true);
    expect(result.current.editableAt(result.current.positionNodeId)).toBe(false);
    // Back before the position: no move, no edit.
    const e4 = result.current.core.tree.moves[0].id;
    act(() => result.current.core.goToNode(e4));
    expect(result.current.canMove).toBe(false);
    expect(result.current.editableAt(e4)).toBe(false);
    expect(result.current.editableAt(null)).toBe(false);
  });

  it("lists the reader's moves in their order — one moved or deleted with its line — and New move goes back to the position", () => {
    const { result } = mount(sessionOfPgn(ANALYSED_PGN));
    drop(result, "e2", "e4");
    drop(result, "e7", "e5");
    act(() => result.current.newMove());
    expect(result.current.onPosition).toBe(true);
    drop(result, "d2", "d4");
    expect(result.current.candidates).toEqual(["e4", "d4"]);
    act(() => result.current.moveCandidate(1, "up"));
    expect(result.current.candidates).toEqual(["d4", "e4"]);
    act(() => result.current.removeCandidate(1));
    expect(result.current.candidates).toEqual(["d4"]);
    expect(findNode(result.current.core.tree, result.current.core.tree.moves[0].id)?.san).toBe("d4");
  });

  it("reads the work back as an event, and writes it a moment after the board changes", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { result, dispatch } = mount(sessionOfPgn(ANALYSED_PGN));
    drop(result, "e2", "e4");
    drop(result, "e7", "e5");
    const flushed = result.current.flushWork();
    expect(flushed).toMatchObject({ type: "workRecorded", key: 1 });
    expect(workFragmentOf(flushed.type === "workRecorded" ? flushed.work : null)).toBe("1. e4 e5");
    // A burst of moves is one write, a moment after the last.
    dispatch.mockClear();
    act(() => vi.advanceTimersByTime(599));
    expect(dispatch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(dispatched(dispatch)).toEqual([flushed]);
  });

  it("writes the work once more as it goes", () => {
    const { result, dispatch, unmount } = mount(sessionOfPgn(ANALYSED_PGN));
    drop(result, "d2", "d4");
    dispatch.mockClear();
    unmount();
    expect(dispatched(dispatch)).toEqual([expect.objectContaining({ type: "workRecorded", key: 1 })]);
  });

  it("asks for the engine on a first move only where it is needed", () => {
    const off = mount(sessionOfPgn(ANALYSED_PGN));
    drop(off.result, "e2", "e4");
    expect(dispatched(off.dispatch).filter((event) => event.type === "firstMove")).toEqual([]);
    const on = mount(sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 5 } }));
    drop(on.result, "e2", "e4");
    expect(dispatched(on.dispatch).filter((event) => event.type === "firstMove")).toEqual([e.firstMove(1)]);
  });

  it("loads the next position when the record moves on — straight there, or from where the replay starts", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const record = sessionOfPgn(RUY_LOPEZ_38, { side: "w", settings: { engine: true } });
    const { result, rerender } = mount(record, 1000);
    expect(result.current.shownKey).toBe(1);

    // Straight there: on the position node.
    rerender({ record: applied(record, [e.goTo(3)]) });
    expect(result.current.shownKey).toBe(3);
    expect(sanPathTo(result.current.core.tree, result.current.core.nodeId)).toEqual(["e4", "e5"]);

    // Moving on from 3 with the replay: the board starts there and plays out to 5.
    act(() => result.current.setReplayFrom(3));
    rerender({ record: applied(record, [e.goTo(5)]) });
    expect(sanPathTo(result.current.core.tree, result.current.core.nodeId)).toEqual(["e4", "e5"]);
    act(() => vi.advanceTimersByTime(1000));
    expect(sanPathTo(result.current.core.tree, result.current.core.nodeId)).toEqual(["e4", "e5", "Nf3"]);
    act(() => vi.advanceTimersByTime(1000));
    expect(sanPathTo(result.current.core.tree, result.current.core.nodeId)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(result.current.core.nodeId).toBe(result.current.positionNodeId);
  });

  it("faces Black at Black's position", () => {
    const { result } = mount(sessionOfPgn(ANALYSED_PGN, { side: "b" }));
    expect(result.current.core.orientation).toBe("black");
    expect(result.current.core.fen).not.toBe(START_FEN);
  });
});
