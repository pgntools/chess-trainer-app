import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mainline } from "../../../lib/gameTree";
import { parsePgnTree } from "../../../lib/pgn";
import { storeSoundSettings } from "../../../lib/soundSettings";
import { useBoardCore, type BoardCoreStart } from "./useBoardCore";
import { useMoveSounds } from "./useMoveSounds";

vi.mock("../../../lib/moveSoundPlayer", () => ({ playMoveSound: vi.fn(), preloadMoveSounds: vi.fn() }));
const { playMoveSound, preloadMoveSounds } = await import("../../../lib/moveSoundPlayer");
const played = vi.mocked(playMoveSound);

/** The core with its sounds — what `BoardShell` composes for every board. */
const board = (start?: BoardCoreStart) =>
  renderHook(() => {
    const core = useBoardCore(start);
    useMoveSounds(core);
    return core;
  });

const drop = (core: { onPieceDrop: (args: { sourceSquare: string; targetSquare: string | null }) => boolean }, from: string, to: string) =>
  act(() => {
    core.onPieceDrop({ sourceSquare: from, targetSquare: to });
  });

/** The kinds played so far, in order. */
const kinds = () => played.mock.calls.map(([kind]) => kind);

const GAME = parsePgnTree("1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O Bc5 5. Bxf7+ Kxf7 *");

beforeEach(() => {
  played.mockClear();
});

/*
  The move sounds (CTA-260): one move forward sounds, by its kind — played or
  stepped to; a step back, a jump, a load and the first render are silent;
  the reader's settings decide.
*/
describe("useMoveSounds", () => {
  it("says nothing on the first render, even for a game opened at a move, and fetches the files", () => {
    board({ tree: GAME, ply: 4 });
    expect(played).not.toHaveBeenCalled();
    expect(preloadMoveSounds).toHaveBeenCalled();
  });

  it("plays each move's kind as the reader plays it — a move, a capture, a check, castling", () => {
    const { result } = board();
    drop(result.current, "e2", "e4");
    drop(result.current, "d7", "d5");
    drop(result.current, "e4", "d5");
    drop(result.current, "d8", "d5");
    drop(result.current, "g1", "f3");
    drop(result.current, "d5", "e5");
    expect(kinds()).toEqual(["move", "move", "capture", "capture", "move", "check"]);
  });

  it("plays the promotion once the picker is answered, and the game's end for a mate", () => {
    const { result } = board({ fen: "k7/4P3/8/8/8/8/8/K7 w - - 0 1" });
    drop(result.current, "e7", "e8");
    expect(played).not.toHaveBeenCalled();
    act(() => result.current.resolvePromotion("q"));
    expect(kinds()).toEqual(["promote"]);

    const mate = board({ fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2" });
    drop(mate.result.current, "d8", "h4");
    expect(kinds()).toEqual(["promote", "game-end"]);
  });

  it("plays a reply played for the board — the engine's or the trainer's — as a move", () => {
    const { result } = board();
    act(() => result.current.playVariation(["e4"]));
    expect(kinds()).toEqual(["move"]);
  });

  it("plays a step forward through the game, one move at a time, at the reader's volume", () => {
    storeSoundSettings({ volume: 40 });
    const { result } = board({ tree: GAME });
    const moves = mainline(GAME);
    act(() => result.current.goToNode(moves[0].id));
    act(() => result.current.goToPly(2));
    act(() => result.current.goToNode(moves[5].id));
    expect(kinds()).toEqual(["move", "move"]);
    expect(played.mock.calls.every(([, volume]) => volume === 0.4)).toBe(true);
    played.mockClear();
    for (const move of moves.slice(6, 9)) act(() => result.current.goToNode(move.id));
    expect(kinds()).toEqual(["castle", "move", "check"]);
  });

  it("says nothing for a step back, a jump of several moves, or the start", () => {
    const { result } = board({ tree: GAME, ply: 6 });
    act(() => result.current.goToPly(5));
    act(() => result.current.goToPly(1));
    act(() => result.current.goToPly(8));
    act(() => result.current.goToNode(null));
    expect(played).not.toHaveBeenCalled();
  });

  it("says nothing for a game loaded, even when the board then opens at its first move", () => {
    const { result } = board();
    drop(result.current, "e2", "e4");
    played.mockClear();
    act(() => {
      result.current.loadTree(GAME);
      result.current.goToNode(mainline(GAME)[0].id);
    });
    act(() => result.current.reset());
    expect(played).not.toHaveBeenCalled();
  });

  it("is silent everywhere with the master switch off, or at no volume", () => {
    storeSoundSettings({ enabled: false });
    const { result } = board({ tree: GAME });
    drop(result.current, "d2", "d4");
    act(() => result.current.goToNode(null));
    act(() => result.current.goToNode(mainline(GAME)[0].id));
    expect(played).not.toHaveBeenCalled();
    storeSoundSettings({ enabled: true, volume: 0 });
    act(() => result.current.goToNode(mainline(GAME)[1].id));
    expect(played).not.toHaveBeenCalled();
  });

  it("with stepping off, plays the moves played and not the steps — a move already in the tree replayed too", () => {
    storeSoundSettings({ stepping: false });
    const { result } = board({ tree: GAME });
    act(() => result.current.goToNode(mainline(GAME)[0].id));
    expect(played).not.toHaveBeenCalled();
    drop(result.current, "e7", "e5");
    expect(kinds()).toEqual(["move"]);
    act(() => result.current.goToNode(mainline(GAME)[0].id));
    act(() => result.current.playVariation(["e5"]));
    expect(kinds()).toEqual(["move", "move"]);
  });
});
