import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionMergeSummary from "./CollectionMergeSummary";
import { ADDED, EMPTY, FILE_ONLY, TOO_LARGE } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CollectionMergeSummary (CTA-220)", () => {
  it("shows the totals, the dedupe mode and the file's length", () => {
    render(<CollectionMergeSummary summary={ADDED} testId="summary" />);
    expect(screen.getByRole("heading", { name: "Merge summary" })).toBeInTheDocument();
    expect(screen.getByTestId("summary-totals")).toHaveAccessibleName("In all");
    expect(screen.getByTestId("summary-totals-read")).toHaveTextContent("4,653");
    expect(screen.getByTestId("summary-totals-written")).toHaveTextContent("4,615");
    expect(screen.getByTestId("summary-totals-duplicates")).toHaveTextContent("37");
    expect(screen.getByTestId("summary-totals-unreadable")).toHaveTextContent("1");
    expect(screen.getByText("Duplicates: Drop exact copies")).toBeInTheDocument();
    expect(screen.getByText("2,904,118 characters of PGN")).toBeInTheDocument();
  });

  it("has a table of the counts per collection, in the order merged", () => {
    render(<CollectionMergeSummary summary={ADDED} testId="summary" />);
    const table = screen.getByRole("table", { name: "Games per collection" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(["Collection", "Read", "Written", "Duplicates", "Unreadable"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))).toEqual([
      ["Mikhail Tal", "2,636", "2,636", "0", "0"],
      ["Tigran Petrosian", "2,017", "1,979", "37", "1"],
    ]);
  });

  it("says the collection was added, with its link where one is given", () => {
    const { rerender } = render(<CollectionMergeSummary summary={ADDED} testId="summary" />);
    expect(screen.getByTestId("summary-collection")).toHaveTextContent("Added to the Library as “Tal + Petrosian”.");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(<CollectionMergeSummary summary={ADDED} collectionLink={{ href: "/library/ug1abc" }} testId="summary" />);
    expect(screen.getByRole("link", { name: "Open Tal + Petrosian" })).toHaveAttribute("href", "/library/ug1abc");
  });

  it("says why the collection was not added: too large, or no game written", () => {
    const { rerender } = render(<CollectionMergeSummary summary={TOO_LARGE} testId="summary" />);
    expect(screen.getByTestId("summary-collection")).toHaveTextContent(
      "Not added to the Library: the merged PGN is 104,212,007 characters, over the 100,000,000 a collection may hold. The file has every game.",
    );
    rerender(<CollectionMergeSummary summary={EMPTY} testId="summary" />);
    expect(screen.getByTestId("summary-collection")).toHaveTextContent("Not added to the Library: no game was written.");
  });

  it("says nothing of a collection none asked for", () => {
    render(<CollectionMergeSummary summary={FILE_ONLY} testId="summary" />);
    expect(screen.queryByTestId("summary-collection")).not.toBeInTheDocument();
  });

  it("passes axe, in English and in Hebrew", async () => {
    const { container, unmount } = render(<CollectionMergeSummary summary={ADDED} collectionLink={{ href: "/library/ug1abc" }} testId="summary" />);
    await expectNoAxeViolations(container);
    unmount();

    await i18n.changeLanguage("he");
    const hebrew = render(<CollectionMergeSummary summary={TOO_LARGE} testId="summary" />);
    expect(screen.getByRole("table", { name: "משחקים לפי אוסף" })).toBeInTheDocument();
    await expectNoAxeViolations(hebrew.container);
  });
});
