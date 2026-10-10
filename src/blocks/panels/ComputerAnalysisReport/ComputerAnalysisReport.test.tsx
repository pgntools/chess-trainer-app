import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import ComputerAnalysisReport from "./ComputerAnalysisReport";
import { BOTH, NO_LOSS, WHITE_ONLY } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ComputerAnalysisReport (CTA-173)", () => {
  it("is a table of the measures, a column per player, named by the players", () => {
    render(<ComputerAnalysisReport report={BOTH} players={{ w: "Alice", b: "Bob" }} testId="report" />);
    const table = within(screen.getByRole("table", { name: "Computer analysis report" }));
    expect(table.getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["Per player", "Alice", "Bob"]);
    // A header row, then a row per measure.
    expect(table.getAllByRole("row")).toHaveLength(7);
    expect(table.getByRole("cell", { name: "Average centipawn loss" })).toBeInTheDocument();
    expect(screen.getByTestId("report-blunders-b")).toHaveTextContent("2");
    expect(screen.getByTestId("report-acpl-w")).toHaveTextContent("24");
    expect(screen.getByTestId("report-accuracy-w")).toHaveTextContent("90%");
    expect(screen.getByTestId("report-missedMates-w")).toHaveTextContent("1");
  });

  it("names the sides White and Black when it has no names", () => {
    render(<ComputerAnalysisReport report={BOTH} testId="report" />);
    expect(screen.getByRole("columnheader", { name: "White" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Black" })).toBeInTheDocument();
  });

  it("says Not analysed for a side with no analysed move, and a dash for a figure with no loss known", () => {
    const { unmount } = render(<ComputerAnalysisReport report={WHITE_ONLY} testId="report" />);
    expect(screen.getByTestId("report-mistakes-b")).toHaveTextContent("Not analysed");
    unmount();
    render(<ComputerAnalysisReport report={NO_LOSS} testId="report" />);
    expect(screen.getByTestId("report-acpl-w")).toHaveTextContent("–");
    expect(screen.getByTestId("report-accuracy-w")).toHaveTextContent("–");
  });

  it("passes axe", async () => {
    render(<ComputerAnalysisReport report={BOTH} testId="report" />);
    await expectNoAxeViolations();
  });

  describe("with onStep (CTA-174)", () => {
    it("makes each count above 0 a button, named for the side and the kind, that steps to the next one", async () => {
      const user = userEvent.setup();
      const onStep = vi.fn();
      render(<ComputerAnalysisReport report={BOTH} players={{ w: "Alice", b: "Bob" }} onStep={onStep} testId="report" />);
      const blunders = screen.getByRole("button", { name: "Blunders by Bob: 2. Go to the next one" });
      expect(blunders).toHaveTextContent("2");
      await user.click(blunders);
      expect(onStep).toHaveBeenLastCalledWith("b", "blunder");
      screen.getByRole("button", { name: "Missed mates by Alice: 1. Go to the next one" }).focus();
      await user.keyboard("{Enter}");
      expect(onStep).toHaveBeenLastCalledWith("w", "missedMate");
    });

    it("leaves a 0, the averages and an unanalysed side as text", () => {
      render(<ComputerAnalysisReport report={WHITE_ONLY} onStep={() => {}} testId="report" />);
      expect(screen.queryByTestId("report-blunders-w-step")).not.toBeInTheDocument();
      expect(screen.queryByTestId("report-acpl-w-step")).not.toBeInTheDocument();
      expect(screen.queryByTestId("report-mistakes-b-step")).not.toBeInTheDocument();
      expect(screen.getByTestId("report-inaccuracies-w-step")).toBeInTheDocument();
    });

    it("passes axe", async () => {
      render(<ComputerAnalysisReport report={BOTH} onStep={() => {}} testId="report" />);
      await expectNoAxeViolations();
    });
  });
});
