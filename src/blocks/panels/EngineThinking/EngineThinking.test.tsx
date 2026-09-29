import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import EngineThinking from "./EngineThinking";
import { DEEP } from "./fixtures";
import { THINKING_DOTS_MS } from "./thinkingDots";

/* Play's status line (CTA-73): dots that move while the engine thinks. */

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const text = () => screen.getByTestId("analysis-play-status").textContent ?? "";

describe("EngineThinking", () => {
  it("moves its dots on while thinking, one to three and round again", () => {
    render(<EngineThinking thinking depth={0} testId="analysis-play" />);
    expect(text()).toBe("Engine is thinking.");
    act(() => vi.advanceTimersByTime(THINKING_DOTS_MS));
    expect(text()).toBe("Engine is thinking..");
    act(() => vi.advanceTimersByTime(THINKING_DOTS_MS));
    expect(text()).toBe("Engine is thinking...");
    act(() => vi.advanceTimersByTime(THINKING_DOTS_MS));
    expect(text()).toBe("Engine is thinking.");
  });

  it("says it is the reader's move, with no dots, when not thinking", () => {
    render(<EngineThinking thinking={false} depth={12} testId="analysis-play" />);
    expect(text()).toBe("Your move");
    expect(screen.queryByTestId("analysis-play-depth")).toBeNull();
  });

  it("is one status line, its spinner decoration, the depth beside it", async () => {
    vi.useRealTimers();
    render(<EngineThinking thinking depth={DEEP.depth} testId="analysis-play" />);
    expect(screen.getByRole("status")).toHaveTextContent("Engine is thinking");
    expect(screen.getByTestId("analysis-play-depth")).toHaveTextContent(String(DEEP.depth));
    expect(screen.queryByRole("progressbar")).toBeNull();
    await expectNoAxeViolations(screen.getByTestId("analysis-play-status"));
  });
});
