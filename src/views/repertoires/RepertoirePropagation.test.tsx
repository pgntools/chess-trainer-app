import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";

import i18n from "../../i18n";
import { FAKE_TIMERS, renderSection, storeRepertoire } from "./repertoireTestKit";

/*
  **The propagation assertion, for the first shipped screen on the v2 core** —
  CTA-61's acceptance criterion 4, asserted the way CTA-60's
  `views/board/panelPropagation.test.tsx` asserts it for the five dev boards.

  The two shared components are **replaced by sentinels**: the panel skeleton
  (`views/board/core/BoardPanel`) and the board square (`views/shared/EngineBoardSquare`).
  If this screen grew a panel or a square of its own — a copy that looks
  perfectly reasonable in review — its sentinel would be missing here. What
  `RepertoireBoard.test.tsx` asserts about their insides is the other half.
*/
vi.mock("../board/core/BoardPanel", () => ({
  default: ({ testId, tabs }: { testId: string; tabs: readonly { id: string }[] }) => (
    <div data-testid="the-one-board-panel" data-panel-id={testId}>
      <span data-testid="panel-tab-ids">{tabs.map((tab) => tab.id).join(",")}</span>
    </div>
  ),
}));

vi.mock("../shared/EngineBoardSquare", () => ({
  default: ({ id }: { id: string }) => (
    <div data-testid="the-one-board-square" data-square-id={id} />
  ),
}));

vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);
vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../board/boardTestHarness");
  return openingsMock(
    importOriginal as () => Promise<typeof import("../../lib/openings")>,
  );
});

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the repertoire board is composed, not written", () => {
  it("renders the one shared panel and the one shared square, and nothing of its own", async () => {
    await storeRepertoire("r");

    await renderSection("/repertoires/r");

    const panels = screen.getAllByTestId("the-one-board-panel");
    expect(panels).toHaveLength(1);
    expect(panels[0]).toHaveAttribute("data-panel-id", "repertoire-board-panel");
    // The slots this screen fills.
    // No Engine tab since CTA-181 — the search settings are the top bar's; no
    // Settings tab since CTA-206 — the session's settings are the left panel's.
    expect(screen.getByTestId("panel-tab-ids").textContent).toBe("moves,map");

    const squares = screen.getAllByTestId("the-one-board-square");
    expect(squares).toHaveLength(1);
    expect(squares[0]).toHaveAttribute("data-square-id", "repertoire-board");
  });

  // The repertoire games (CTA-63) are under the same guarantee: the trainer
  // and a game's rules are modules, not a panel of their own.
  it.each(["end", "backtrack"])("plays the %s game on the same shared panel and square", async (game) => {
    vi.useFakeTimers(FAKE_TIMERS);
    try {
      await storeRepertoire("r");
      await renderSection(`/repertoires/r/games/${game}`);
      act(() => {
        vi.advanceTimersByTime(0);
      });

      const panels = screen.getAllByTestId("the-one-board-panel");
      expect(panels).toHaveLength(1);
      expect(panels[0]).toHaveAttribute("data-panel-id", "repertoire-game-panel");
      expect(screen.getByTestId("panel-tab-ids").textContent).toBe(
        game === "backtrack" ? "moves,score,map" : "moves,score",
      );

      const squares = screen.getAllByTestId("the-one-board-square");
      expect(squares).toHaveLength(1);
      expect(squares[0]).toHaveAttribute("data-square-id", "repertoire-game");
    } finally {
      vi.useRealTimers();
    }
  });
});
