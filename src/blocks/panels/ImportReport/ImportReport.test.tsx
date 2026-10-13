import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { ALL_DONE, INDEXING_FAILED, SOME_FAILED } from "./fixtures";
import ImportReport from "./ImportReport";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ImportReport", () => {
  it("says what each category's import did, as an alert that is read out", () => {
    render(<ImportReport results={ALL_DONE} testId="imp" />);
    expect(screen.getByRole("alert")).toBe(screen.getByTestId("imp-done"));
    expect(screen.getByTestId("imp-result-analysisProjects")).toHaveTextContent("Analysis projects: 12 added, 3 replaced, 0 skipped, 2 folders created.");
    expect(screen.getByTestId("imp-done").className).toMatch(/Success/);
  });

  it("warns when a category was refused or failed, in the categories' order", () => {
    render(<ImportReport results={SOME_FAILED} testId="imp" />);
    expect(screen.getByTestId("imp-done").className).toMatch(/Warning/);
    expect(screen.getByTestId("imp-result-repertoires")).toHaveTextContent("past the limit of 500");
    expect(screen.getByTestId("imp-result-analysisProjects")).toHaveTextContent("the browser refused to store it");
    expect(screen.queryByTestId("imp-result-collections")).toBeNull();
  });

  it("says an older zip's saved analyses were skipped, and nothing of it otherwise (CTA-192)", () => {
    const { unmount } = render(<ImportReport results={ALL_DONE} skippedAnalyses={1} testId="imp" />);
    expect(screen.getByTestId("imp-skipped-analyses")).toHaveTextContent(
      "1 saved analysis from an older version was skipped: saved analyses are no longer supported.",
    );
    unmount();
    render(<ImportReport results={ALL_DONE} testId="imp" />);
    expect(screen.queryByTestId("imp-skipped-analyses")).toBeNull();
  });

  it("names an indexing failure", () => {
    render(<ImportReport results={INDEXING_FAILED} testId="imp" />);
    expect(screen.getByTestId("imp-result-collections")).toHaveTextContent("could not be indexed");
  });

  it("passes axe", async () => {
    render(<ImportReport results={SOME_FAILED} testId="imp" />);
    await expectNoAxeViolations();
  });
});
