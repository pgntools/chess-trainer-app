import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import { sortedAnalysisRows, type SavedAnalysisColumn, type SavedAnalysisRow } from "../../../lib/savedAnalysisRows";
import SavedAnalysesTable from "./SavedAnalysesTable";
import { ANALYSIS_ROWS, manyRows } from "./fixtures";

/** The table as the Saved analyses screen holds it: sort, page and picks in state, the rows ordered by the sort. */
function Harness({
  rows = ANALYSIS_ROWS,
  onPicked = () => {},
  filtered = false,
  onClearFilter = () => {},
}: {
  rows?: readonly SavedAnalysisRow[];
  onPicked?: (picked: Set<string>) => void;
  filtered?: boolean;
  onClearFilter?: () => void;
}) {
  const [sort, setSort] = useState<DataTableSort<SavedAnalysisColumn>>({ column: "updated", direction: "desc" });
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  return (
    <SavedAnalysesTable
      rows={sortedAnalysisRows(rows, sort.column, sort.direction)}
      sort={sort}
      onSort={(column, direction) => setSort({ column, direction })}
      paging={{ page, rowsPerPage: 50, onPageChange: setPage, onRowsPerPageChange: () => {} }}
      picked={picked}
      onPickedChange={(next) => {
        setPicked(next);
        onPicked(next);
      }}
      openLink={(row) => ({ href: `/tools/analysis?analysis=${row.id}` })}
      settingsLink={(row) => ({ href: `/tools/analysis/saved/${row.id}/settings` })}
      filtered={filtered}
      onClearFilter={onClearFilter}
      testId="analyses"
      rowTestId="analyses-item"
      openTestId="analyses-open"
      pickTestId="analyses-select"
      selectAllTestId="analyses-select-all"
    />
  );
}

const ids = () =>
  within(screen.getByTestId("analyses-frame-table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.getAttribute("data-testid")?.replace("analyses-item-", ""));

describe("SavedAnalysesTable (CTA-144)", () => {
  it("shows a row per analysis, newest updated first, the Name cell its link to the board", async () => {
    render(<Harness />);
    expect(ids()).toEqual(["tal", "prep", "board", "broken"]);
    expect(screen.getByRole("link", { name: /^My Berlin prep/ })).toHaveAttribute("href", "/tools/analysis?analysis=prep");
    // A board's own analysis, named for what it is.
    expect(screen.getByRole("link", { name: "Analysis board" })).toHaveAttribute("href", "/tools/analysis?analysis=board");
    expect(screen.getByRole("link", { name: "Settings of My Berlin prep" })).toHaveAttribute(
      "href",
      "/tools/analysis/saved/prep/settings",
    );
    await expectNoAxeViolations(screen.getByTestId("analyses"));
  });

  it("names every column in its header, each a sort button", () => {
    render(<Harness />);
    const headers = within(screen.getByTestId("analyses-frame-table"))
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual(
      expect.arrayContaining(["Name", "White", "Elo", "Black", "Result", "Date", "Event", "Round", "ECO", "Opening", "Moves", "Updated"]),
    );
    expect(screen.getByRole("button", { name: "Opening" })).toBeInTheDocument();
  });

  it("shows the description under the name, the whole of it on hover", () => {
    render(<Harness />);
    const description = screen.getByTestId("analyses-description-prep");
    expect(description).toHaveAttribute("title", "The 4.O-O line, with the endgame after 9...Ke8 worked through to move 30");
    expect(description).toHaveStyle({ overflow: "hidden", textOverflow: "ellipsis" });
  });

  it("sorts from a header — a name A to Z, a count high first — missing values last", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "White" }));
    // Only Tal has a White; the rest keep the newest-updated order after him.
    expect(ids()).toEqual(["tal", "prep", "board", "broken"]);
    await user.click(screen.getByRole("button", { name: "Moves" }));
    expect(ids()).toEqual(["tal", "prep", "board", "broken"]);
    await user.click(screen.getByRole("button", { name: "Moves" }));
    expect(ids()).toEqual(["broken", "board", "prep", "tal"]);
    await user.click(screen.getByRole("button", { name: "ECO" }));
    expect(ids()).toEqual(["prep", "tal", "board", "broken"]);
  });

  it("says why a record will not read, across the columns, with nothing to open but its pick and gear", () => {
    render(<Harness />);
    expect(screen.getByTestId("analyses-note-broken")).toHaveTextContent("Broken record — This analysis could not be read.");
    expect(screen.queryByTestId("analyses-open-broken")).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Select Broken record" })).toBeInTheDocument();
    expect(screen.getByTestId("analyses-settings-broken")).toBeInTheDocument();
  });

  it("picks from the keyboard — a row, then every row", async () => {
    const onPicked = vi.fn();
    const user = userEvent.setup();
    render(<Harness onPicked={onPicked} />);
    screen.getByRole("checkbox", { name: "Select Analysis board" }).focus();
    await user.keyboard(" ");
    expect(onPicked).toHaveBeenLastCalledWith(new Set(["board"]));
    screen.getByRole("checkbox", { name: "Select all analyses" }).focus();
    await user.keyboard(" ");
    expect(onPicked).toHaveBeenLastCalledWith(new Set(["board", "tal", "prep", "broken"]));
  });

  it("tells an empty filter result from an empty folder, and clears it from the row", async () => {
    const onClearFilter = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(<Harness rows={[]} />);
    expect(screen.getByTestId("analyses-empty")).toHaveTextContent("This folder is empty.");
    unmount();
    render(<Harness rows={[]} filtered onClearFilter={onClearFilter} />);
    expect(screen.getByTestId("analyses-no-match")).toHaveTextContent("No analysis matches the filter.");
    await user.click(screen.getByRole("button", { name: "Clear the filter" }));
    expect(onClearFilter).toHaveBeenCalled();
  });

  it("keeps the reader's words free and the tokens LTR", () => {
    render(<Harness />);
    const tal = screen.getByTestId("analyses-item-tal");
    expect(within(tal).getByText("Tal, Mikhail").closest("td")).toHaveAttribute("dir", "auto");
    expect(within(tal).getByText("1-0").closest("td")).toHaveAttribute("dir", "ltr");
    expect(within(tal).getByText("E69").closest("td")).toHaveAttribute("dir", "ltr");
  });

  it("shows one page of a large folder", () => {
    render(<Harness rows={manyRows(120)} />);
    expect(ids()).toHaveLength(50);
    expect(screen.getByTestId("analyses-pager")).toBeInTheDocument();
  });
});
