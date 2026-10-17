import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionSource from "./CollectionSource";
import { EVERY_TAG, MERGED, PARTLY, TWIC } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CollectionSource (CTA-233)", () => {
  it("names one source by its tags, under its own heading, with no count", async () => {
    render(<CollectionSource sources={TWIC} testId="probe" />);
    const card = screen.getByRole("region", { name: "Source" });
    expect(card).toBe(screen.getByTestId("probe"));
    expect(within(card).getByRole("heading", { level: 2, name: "Source" })).toBeInTheDocument();
    expect(within(card).getAllByRole("term").map((term) => term.textContent)).toEqual(["Title", "Publisher", "Date"]);
    expect(screen.getByTestId("probe-source-0-SourceTitle")).toHaveTextContent("The Week in Chess 1662");
    expect(screen.getByTestId("probe-source-0-SourceTitle")).toHaveAttribute("dir", "auto");
    expect(screen.getByTestId("probe-source-0-Source")).toHaveTextContent("Mark Crowther");
    expect(screen.getByTestId("probe-source-0-SourceDate")).toHaveTextContent("2026.09.14");
    expect(screen.getByTestId("probe-source-0-SourceDate")).toHaveAttribute("dir", "ltr");
    expect(screen.queryByTestId("probe-source-0-games")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByTestId("probe-untagged")).toBeNull();
    await expectNoAxeViolations(card);
  });

  it("lists several sources, each with its games, and counts the games naming none", async () => {
    render(<CollectionSource sources={MERGED} headingLevel="h3" testId="probe" />);
    const card = screen.getByRole("region", { name: "Sources" });
    expect(within(card).getByRole("heading", { level: 3, name: "Sources" })).toBeInTheDocument();
    const items = within(within(card).getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByTestId("probe-source-0-games")).toHaveTextContent("1,240 games");
    expect(within(items[0]!).getByTestId("probe-source-0-SourceTitle")).toHaveTextContent("The Week in Chess 1661");
    expect(within(items[1]!).getByTestId("probe-source-1-games")).toHaveTextContent("1,180 games");
    expect(within(items[1]!).getByTestId("probe-source-1-SourceDate")).toHaveTextContent("2026.09.14");
    expect(screen.getByTestId("probe-untagged")).toHaveTextContent("3 games name no source.");
    await expectNoAxeViolations(card);
  });

  it("labels every tag PGN names in its order, and any other by its own name", () => {
    render(<CollectionSource sources={EVERY_TAG} testId="probe" />);
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Title",
      "Publisher",
      "Date",
      "Version",
      "Version date",
      "Edition",
      "Edition date",
      "Quality",
      "SourceURL",
    ]);
    expect(screen.getByTestId("probe-source-0-SourceVersionDate")).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("probe-source-0-SourceEditionDate")).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("probe-source-0-SourceURL")).toHaveTextContent("https://example.com/mega-2026");
  });

  it("counts one source when some games name none", () => {
    render(<CollectionSource sources={PARTLY} testId="probe" />);
    expect(screen.getByRole("heading", { name: "Source" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-source-0-games")).toHaveTextContent("18 games");
    expect(screen.getByTestId("probe-untagged")).toHaveTextContent("1 game names no source.");
  });

  it("speaks Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<CollectionSource sources={MERGED} testId="probe" />);
    expect(screen.getByRole("heading", { name: "מקורות" })).toBeInTheDocument();
    expect(screen.getAllByRole("term")[0]).toHaveTextContent("כותרת");
  });
});
