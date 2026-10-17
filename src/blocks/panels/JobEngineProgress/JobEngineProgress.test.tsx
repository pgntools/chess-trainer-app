import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { stubReducedMotion } from "../../../test/reducedMotion";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import JobEngineProgress from "./JobEngineProgress";
import { DEEP, HEARD_RECENTLY, MATE, SILENT, SILENT_NOW, STARTING } from "./fixtures";

/* A running Jobs V2 job's live engine progress (CTA-190). */

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const value = (part: string) => screen.getByTestId(`live-facts-${part}`).textContent;

describe("JobEngineProgress", () => {
  it("shows the move searched, depth / selective depth, nodes, speed, time, hash and the best line with its score", async () => {
    render(<JobEngineProgress live={DEEP} testId="live" />);
    const section = screen.getByRole("region", { name: "Engine" });
    expect(within(section).getByTestId("live-move")).toHaveTextContent("Searching 7. Nf3");
    expect(value("depth")).toBe("22/31");
    expect(value("nodes")).toBe("3.1M");
    expect(value("nps")).toBe("2.4M nodes/s");
    expect(value("time")).toBe("12.3 s");
    expect(value("hash")).toBe("46% full");
    expect(screen.getByTestId("live-line")).toHaveTextContent("Best line +0.35 Nc6 Bb5 a6 Ba4 Nf6 O-O");
    await expectNoAxeViolations();
  });

  it("leaves out what the engine has not said, and names the last position when no move is judged from it", () => {
    render(<JobEngineProgress live={STARTING} testId="live" />);
    expect(screen.getByTestId("live-move")).toHaveTextContent("Searching the final position");
    expect(value("depth")).toBe("0");
    expect(screen.queryByTestId("live-facts-nodes")).toBeNull();
    expect(screen.queryByTestId("live-facts-nps")).toBeNull();
    expect(screen.queryByTestId("live-facts-hash")).toBeNull();
    expect(screen.getByTestId("live-line")).toHaveTextContent("Best line –");
  });

  it("writes a mate as a mate", () => {
    render(<JobEngineProgress live={MATE} testId="live" />);
    expect(screen.getByTestId("live-line")).toHaveTextContent("-M3 Qh4+ g3 Qxg3#");
  });

  it("announces the move and every tenth depth — never each update", () => {
    const { rerender } = render(<JobEngineProgress live={{ ...DEEP, depth: 7 }} testId="live" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Engine searching 7. Nf3.");
    rerender(<JobEngineProgress live={{ ...DEEP, depth: 9, nodes: 9_000_000 }} testId="live" />);
    expect(status).toHaveTextContent("Engine searching 7. Nf3.");
    rerender(<JobEngineProgress live={{ ...DEEP, depth: 22 }} testId="live" />);
    expect(status).toHaveTextContent("Engine searching 7. Nf3, depth 20.");
  });

  describe("that the engine is alive (CTA-194)", () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const alive = () => screen.getByTestId("live-alive");
    const mark = () => screen.getByTestId("live-pulse");

    it("says how long ago the engine was heard — just now, in seconds, in minutes — never announced", async () => {
      const { rerender } = render(<JobEngineProgress live={DEEP} now={DEEP.heardAt + 400} testId="live" />);
      expect(alive()).toHaveTextContent("Engine alive · heard just now");
      rerender(<JobEngineProgress live={DEEP} now={HEARD_RECENTLY} testId="live" />);
      expect(alive()).toHaveTextContent("Engine alive · heard 3 s ago");
      rerender(<JobEngineProgress live={SILENT} now={SILENT_NOW} testId="live" />);
      expect(alive()).toHaveTextContent("Engine alive · heard 42 s ago");
      rerender(<JobEngineProgress live={SILENT} now={SILENT.heardAt + 150_000} testId="live" />);
      expect(alive()).toHaveTextContent("Engine alive · heard 2 min ago");
      expect(screen.getByRole("status")).not.toHaveTextContent(/heard/);
      expect(mark()).toHaveAttribute("aria-hidden", "true");
      await expectNoAxeViolations();
    });

    it("counts the seconds on its own clock when given none", () => {
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
      vi.setSystemTime(DEEP.heardAt);
      render(<JobEngineProgress live={DEEP} testId="live" />);
      expect(alive()).toHaveTextContent("heard just now");
      act(() => vi.advanceTimersByTime(5_000));
      expect(alive()).toHaveTextContent("heard 5 s ago");
    });

    it("beats once each time the engine is heard — a heartbeat too — never cutting a beat short", () => {
      const at = DEEP.heardAt;
      const view = (heardAt: number) => (
        <AppThemeWithLang>
          <JobEngineProgress live={{ ...DEEP, heardAt }} now={heardAt} testId="live" />
        </AppThemeWithLang>
      );
      const { rerender } = render(view(at));
      expect(mark()).toHaveAttribute("data-pulse", "0");
      expect(mark()).toHaveAttribute("data-beating", "false");
      rerender(view(at + 250)); // an info line
      expect(mark()).toHaveAttribute("data-pulse", "1");
      expect(mark()).toHaveAttribute("data-beating", "true");
      rerender(view(at + 500)); // another, while the beat is under way
      expect(mark()).toHaveAttribute("data-pulse", "1");
      rerender(view(at + 15_250)); // a heartbeat, 15 s on
      expect(mark()).toHaveAttribute("data-pulse", "2");
    });

    it("stays still under reduced motion — the words carry it", () => {
      stubReducedMotion();
      const view = (heardAt: number) => (
        <AppThemeWithLang>
          <JobEngineProgress live={{ ...DEEP, heardAt }} now={heardAt + 3_000} testId="live" />
        </AppThemeWithLang>
      );
      const { rerender } = render(view(DEEP.heardAt));
      rerender(view(DEEP.heardAt + 15_000));
      expect(mark()).toHaveAttribute("data-beating", "false");
      expect(alive()).toHaveTextContent("Engine alive · heard 3 s ago");
    });
  });

  it("speaks Hebrew, the numbers and moves kept left to right", async () => {
    await i18n.changeLanguage("he");
    render(<JobEngineProgress live={DEEP} testId="live" />);
    expect(screen.getByRole("region", { name: "מנוע" })).toBeInTheDocument();
    expect(screen.getByTestId("live-move").querySelector("bdi")).toHaveAttribute("dir", "ltr");
    expect(value("nps")).toBe("2.4M צמתים/שנ׳");
    expect(screen.getByTestId("live-alive")).toHaveTextContent(/המנוע פעיל · נשמע/);
  });
});
