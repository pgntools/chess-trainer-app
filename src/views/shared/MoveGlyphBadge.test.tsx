import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defaultChessTokens } from "../../design-system/themes/defaultChess";
import { expectNoAxeViolations } from "../../test/axe";
import MoveGlyphBadge from "./MoveGlyphBadge";

const badge = () => screen.getByTestId("badge");
const disc = () => badge().querySelector("circle")!;

describe("MoveGlyphBadge (CTA-168)", () => {
  it("draws the move mark in the top corner of the square the move landed on", () => {
    render(<MoveGlyphBadge nags={[3]} square="e4" orientation="white" testId="badge" />);
    expect(badge()).toHaveAttribute("data-square", "e4");
    expect(badge()).toHaveTextContent("!!");
    // e is the fifth file, 4 the fifth rank from the top: the square's top-right corner.
    expect(Number(disc().getAttribute("cx"))).toBeCloseTo(4.77);
    expect(Number(disc().getAttribute("cy"))).toBeCloseTo(4.23);
  });

  it("turns with the board", () => {
    render(<MoveGlyphBadge nags={[1]} square="e4" orientation="black" testId="badge" />);
    // Seen from Black, e is the fourth file from the left and 4 the fourth rank from the top.
    expect(Number(disc().getAttribute("cx"))).toBeCloseTo(3.77);
    expect(Number(disc().getAttribute("cy"))).toBeCloseTo(3.23);
  });

  it("is coloured by the mark's tone, the glyph pinned LTR", () => {
    render(<MoveGlyphBadge nags={[16, 5]} square="d5" orientation="white" testId="badge" />);
    expect(badge()).toHaveAttribute("data-tone", "interesting");
    expect(badge().querySelector("text")).toHaveTextContent("!?");
    expect(badge().querySelector("text")).toHaveAttribute("direction", "ltr");
    expect(disc()).toHaveStyle({ fill: defaultChessTokens.nag.interesting.light });
  });

  it("stays out of the reader's way: no pointer events, hidden from a screen reader", async () => {
    const { container } = render(<MoveGlyphBadge nags={[4]} square="h8" orientation="white" testId="badge" />);
    expect(badge()).toHaveAttribute("aria-hidden", "true");
    expect(badge()).toHaveStyle({ pointerEvents: "none" });
    await expectNoAxeViolations(container);
  });

  it("draws nothing for a move without a move mark", () => {
    const { container, rerender } = render(
      <MoveGlyphBadge nags={undefined} square="e4" orientation="white" testId="badge" />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<MoveGlyphBadge nags={[14, 146]} square="e4" orientation="white" testId="badge" />);
    expect(container).toBeEmptyDOMElement();
  });
});
