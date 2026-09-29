import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import i18n from "../../i18n";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { stubReducedMotion } from "../../test/reducedMotion";
import type { Score } from "../../lib/engineAnalysis";
import EvalBar from "./EvalBar";

/*
  The bar is two rectangles, so the assertions are on the numbers it publishes
  (`data-white-share`, `data-score`) rather than on rendered pixels — jsdom has
  no layout and a percentage height would come back as the string we set.
*/

/*
  Several of these tests render more than one bar to compare them, so each render
  is scoped to its own container rather than queried off the whole screen.
*/
const renderBar = (
  score: Score | null,
  orientation: "white" | "black" = "white",
) => {
  // `render`'s own bound queries still search the whole body, so the container
  // is what scopes a query to this bar rather than to every bar rendered so far.
  const { container } = render(
    <AppThemeWithLang>
      <EvalBar score={score} orientation={orientation} label="Evaluation" />
    </AppThemeWithLang>,
  );
  return within(container).getByTestId("eval-bar");
};

const share = (element: HTMLElement) =>
  Number(element.getAttribute("data-white-share"));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the evaluation bar", () => {
  it("sits at the centre before the engine has said anything", () => {
    expect(share(renderBar(null))).toBeCloseTo(0.5, 4);
  });

  it("fills towards White as White's score grows", () => {
    const level = share(renderBar({ kind: "cp", value: 0 }));
    const ahead = share(renderBar({ kind: "cp", value: 400 }));
    const behind = share(renderBar({ kind: "cp", value: -400 }));

    expect(ahead).toBeGreaterThan(level);
    expect(behind).toBeLessThan(level);
  });

  it("shows a mate as mate-in-N, not as a centipawn number", () => {
    expect(renderBar({ kind: "mate", value: 4 })).toHaveAttribute(
      "data-score",
      "M4",
    );
    expect(renderBar({ kind: "mate", value: -2 })).toHaveAttribute(
      "data-score",
      "-M2",
    );
  });

  it("names the score in its accessible label", () => {
    renderBar({ kind: "cp", value: 155 });
    expect(screen.getByLabelText("Evaluation: +1.55")).toBeInTheDocument();
  });

  it("turns over with the board, so the played side is nearest the player", () => {
    // White at the bottom for a White-facing board, at the top when flipped —
    // the direction of the flex column is what carries that.
    expect(renderBar({ kind: "cp", value: 100 }, "white")).toHaveStyle({
      flexDirection: "column-reverse",
    });
    expect(renderBar({ kind: "cp", value: 100 }, "black")).toHaveStyle({
      flexDirection: "column",
    });
  });
});

describe("the eval bar's motion (CTA-113)", () => {
  /** The element's own rule — jsdom's computed style leaves the `transition` shorthand out. */
  const ownRule = (element: HTMLElement) => {
    const name = [...element.classList].pop() ?? "";
    return [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).find((text) => text.startsWith(`.${name} `)) ?? "";
  };

  it("slides through the theme's transition, and not at all under reduced motion", () => {
    const moving = renderBar({ kind: "cp", value: 120 });
    expect(ownRule(within(moving).getByTestId("eval-bar-white"))).toMatch(/transition: height 240ms/);
    stubReducedMotion();
    const still = renderBar({ kind: "cp", value: 120 });
    expect(ownRule(within(still).getByTestId("eval-bar-white"))).toMatch(/transition: none/);
  });
});
