import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

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
});
