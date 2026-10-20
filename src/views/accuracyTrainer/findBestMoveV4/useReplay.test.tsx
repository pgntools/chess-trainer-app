import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";

import { useReplay } from "./useReplay";

/* The replay unit (CTA-244): the board put on the plan's start, one step a delay, stopped once the reader moves it. No chess. */

const board = (stepDelayMs: number) =>
  renderHook(() => {
    const [nodeId, goToNode] = useState<string | null>("x");
    return { nodeId, goToNode, ...useReplay({ nodeId, goToNode, stepDelayMs }) };
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useReplay", () => {
  it("starts on the start and goes to each step in turn, one a delay", () => {
    const { result } = board(1000);
    act(() => result.current.play("a", ["b", "c"]));
    expect(result.current.nodeId).toBe("a");
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.nodeId).toBe("b");
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.nodeId).toBe("c");
  });

  it("stops once the reader moves the board — the rest is theirs", () => {
    const { result } = board(1000);
    act(() => result.current.play("a", ["b", "c"]));
    act(() => result.current.goToNode("elsewhere"));
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.nodeId).toBe("elsewhere");
  });

  it("goes straight to the last step with no delay, and stop() cancels what is left", () => {
    const straight = board(0);
    act(() => straight.result.current.play("a", ["b", "c"]));
    expect(straight.result.current.nodeId).toBe("c");
    const stopped = board(1000);
    act(() => stopped.result.current.play("a", ["b"]));
    act(() => stopped.result.current.stop());
    act(() => vi.advanceTimersByTime(2000));
    expect(stopped.result.current.nodeId).toBe("a");
  });
});
