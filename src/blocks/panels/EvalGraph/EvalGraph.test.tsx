import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import EvalGraph from "./EvalGraph";
import { evalText, evalY, winChance } from "./evalGraphScale";
import { GAME } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EvalGraph (CTA-173)", () => {
  it("is a slider over the moves, named, its value the current move with its eval", () => {
    render(<EvalGraph points={GAME} currentNodeId="n9" label="Evaluation graph" testId="graph" />);
    const slider = screen.getByRole("slider", { name: "Evaluation graph" });
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", String(GAME.length - 1));
    expect(slider).toHaveAttribute("aria-valuenow", "9");
    expect(slider).toHaveAttribute("aria-valuetext", "5. O-O, +0.34");
    expect(screen.getByTestId("graph-current")).toBeInTheDocument();
  });

  it("marks each verdict in its move mark's colour family", () => {
    render(<EvalGraph points={GAME} label="Evaluation graph" testId="graph" />);
    expect(screen.getByTestId("graph-point-10")).toHaveAttribute("data-tone", "dubious");
    expect(screen.getByTestId("graph-point-14")).toHaveAttribute("data-tone", "mistake");
    expect(screen.getByTestId("graph-point-16")).toHaveAttribute("data-tone", "blunder");
    expect(screen.getByTestId("graph-point-18")).toHaveAttribute("data-tone", "blunder");
    expect(screen.queryByTestId("graph-point-1")).not.toBeInTheDocument();
  });

  it("steps through the moves by keyboard, reading each, and Enter chooses one", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EvalGraph points={GAME} currentNodeId="n9" onSelect={onSelect} label="Evaluation graph" testId="graph" />);
    await user.tab();
    const slider = screen.getByRole("slider", { name: "Evaluation graph" });
    expect(slider).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuetext", "5... Be7, +1.20, Inaccuracy");
    expect(screen.getByTestId("graph-tooltip")).toHaveTextContent("5... Be7, +1.20, Inaccuracy");
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuetext", "10... Qc7, #-3");
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuetext", "Start position, +0.20");
    await user.keyboard("{ArrowLeft}{ArrowRight}{Enter}");
    expect(onSelect).toHaveBeenCalledWith(GAME[1]);
  });

  it("chooses the move nearest the click", () => {
    const onSelect = vi.fn();
    render(<EvalGraph points={GAME} onSelect={onSelect} label="Evaluation graph" testId="graph" />);
    const plot = screen.getByTestId("graph-plot");
    plot.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 120, right: 200, bottom: 120, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(plot, { clientX: 101 });
    expect(screen.getByTestId("graph-tooltip")).toHaveTextContent("5... Be7");
    fireEvent.click(plot, { clientX: 101 });
    expect(onSelect).toHaveBeenCalledWith(GAME[10]);
  });

  it("plots the win chance: equal in the middle, a big advantage near the edge, never past it", () => {
    expect(evalY(0)).toBe(50);
    expect(evalY(1000)).toBeLessThan(10);
    expect(evalY(1000)).toBeGreaterThan(0);
    expect(winChance(-300)).toBeCloseTo(-winChance(300));
    expect(evalText({ kind: "cp", value: -5 })).toBe("-0.05");
    expect(evalText({ kind: "mate", value: 2 })).toBe("#2");
  });

  it("says so when there is nothing to draw", () => {
    render(<EvalGraph points={[]} label="Evaluation graph" testId="graph" />);
    expect(screen.getByTestId("graph")).toHaveTextContent("No move has an evaluation to draw.");
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("passes axe", async () => {
    render(<EvalGraph points={GAME} currentNodeId="n4" onSelect={() => {}} label="Evaluation graph" testId="graph" />);
    await expectNoAxeViolations();
  });
});
