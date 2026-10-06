import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import { analysisTreeRows, type SavedAnalysisColumn, type SavedAnalysisRow } from "../../../lib/savedAnalysisRows";
import type { GameFolder } from "../../../lib/savedGameFolders";
import SavedAnalysesTable, { type SavedAnalysesTableFolderActions } from "./SavedAnalysesTable";
import { ANALYSIS_FOLDERS, ANALYSIS_ROWS, FILED_ROWS, manyRows } from "./fixtures";

/** The table as the Saved analyses screen holds it: sort, open folders, page and picks in state, the rows walked by them. */
function Harness({
  rows = ANALYSIS_ROWS,
  folders = [],
  onPicked = () => {},
  onOpenAnalysis = () => {},
  folderActions = { onDownload: vi.fn(), onRename: vi.fn(), onMove: vi.fn(), onDelete: vi.fn() },
  text = "",
  onClearFilter = () => {},
}: {
  rows?: readonly SavedAnalysisRow[];
  folders?: readonly GameFolder[];
  onPicked?: (picked: Set<string>) => void;
  onOpenAnalysis?: (row: SavedAnalysisRow) => void;
  folderActions?: SavedAnalysesTableFolderActions;
  text?: string;
  onClearFilter?: () => void;
}) {
  const [sort, setSort] = useState<DataTableSort<SavedAnalysisColumn>>({ column: "updated", direction: "desc" });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const walked = analysisTreeRows({
    folders,
    rows,
    isOpen: (id, auto) => auto || open.has(id),
    column: sort.column,
    direction: sort.direction,
    text,
  });
  return (
    <SavedAnalysesTable
      rows={walked.rows}
      sort={sort}
      onSort={(column, direction) => setSort({ column, direction })}
      onToggle={(id) =>
        setOpen((before) => {
          const next = new Set(before);
          if (!next.delete(id)) next.add(id);
          return next;
        })
      }
      folderLink={(folder) => ({ href: `/tools/analysis/saved?folder=${folder.id}` })}
      folderActions={folderActions}
      paging={{ page, rowsPerPage: 50, onPageChange: setPage, onRowsPerPageChange: () => {} }}
      picked={picked}
      onPickedChange={(next) => {
        setPicked(next);
        onPicked(next);
      }}
      openLink={(row) => ({ href: `/tools/analysis?analysis=${row.id}` })}
      onOpenAnalysis={onOpenAnalysis}
      settingsLink={(row) => ({ href: `/tools/analysis/saved/${row.id}/settings` })}
      filtered={text !== ""}
      onClearFilter={onClearFilter}
      testId="analyses"
      rowTestId="analyses-item"
      openTestId="analyses-open"
      pickTestId="analyses-select"
      selectAllTestId="analyses-select-all"
      folderTestId="analyses-folder"
    />
  );
}

const ids = () =>
  within(screen.getByTestId("analyses-frame-table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.getAttribute("data-testid")?.replace("analyses-item-", "").replace("analyses-folder-", "folder:"));

describe("SavedAnalysesTable (CTA-144)", () => {
  it("shows a row per analysis, newest updated first, the Name cell its link to the board", async () => {
    render(<Harness />);
    expect(ids()).toEqual(["tal", "prep", "board", "broken"]);
    expect(
      screen.getByRole("link", { name: "My Berlin prep, The 4.O-O line, with the endgame after 9...Ke8 worked through to move 30" }),
    ).toHaveAttribute("href", "/tools/analysis?analysis=prep");
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
    render(<Harness rows={[]} text="dragon" onClearFilter={onClearFilter} />);
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

  describe("folders (CTA-144)", () => {
    const WITH_FOLDERS = [...ANALYSIS_ROWS, ...FILED_ROWS];

    it("puts the folders first, closed, each with its subtree's count, its name a link into it and no pick", async () => {
      render(<Harness folders={ANALYSIS_FOLDERS} rows={WITH_FOLDERS} />);
      expect(ids()).toEqual(["folder:fopen", "folder:ftata", "folder:fempty", "tal", "prep", "board", "broken"]);
      const openings = screen.getByTestId("analyses-folder-fopen");
      expect(openings).toHaveTextContent("Openings1 analysis");
      expect(within(openings).getByRole("link", { name: "Open folder Openings" })).toHaveAttribute(
        "href",
        "/tools/analysis/saved?folder=fopen",
      );
      expect(within(openings).queryByRole("checkbox")).toBeNull();
      await expectNoAxeViolations(screen.getByTestId("analyses"));
    });

    it("opens a folder in place from its chevron or its row, its contents indented under it", async () => {
      const user = userEvent.setup();
      render(<Harness folders={ANALYSIS_FOLDERS} rows={WITH_FOLDERS} />);
      await user.click(screen.getByRole("button", { name: "Open Openings" }));
      expect(ids().slice(0, 3)).toEqual(["folder:fopen", "folder:fsic", "folder:ftata"]);
      await user.click(screen.getByTestId("analyses-folder-fsic"));
      expect(ids().slice(0, 4)).toEqual(["folder:fopen", "folder:fsic", "najdorf", "folder:ftata"]);
      expect(screen.getByRole("button", { name: "Close Sicilian" })).toHaveAttribute("aria-expanded", "true");
      await user.click(screen.getByRole("button", { name: "Close Openings" }));
      expect(ids().slice(0, 2)).toEqual(["folder:fopen", "folder:ftata"]);
    });

    it("runs a folder's actions, its download off while nothing is under it", async () => {
      const user = userEvent.setup();
      const folderActions = { onDownload: vi.fn(), onRename: vi.fn(), onMove: vi.fn(), onDelete: vi.fn() };
      render(<Harness folders={ANALYSIS_FOLDERS} rows={WITH_FOLDERS} folderActions={folderActions} />);
      await user.click(screen.getByRole("button", { name: "Rename Tata Steel 2024" }));
      expect(folderActions.onRename).toHaveBeenCalledWith(ANALYSIS_FOLDERS[2]);
      expect(screen.getByTestId("analyses-folder-download-fempty")).toBeDisabled();
    });

    it("opens an analysis from a click on its row, but not one that will not read", async () => {
      const onOpenAnalysis = vi.fn();
      const user = userEvent.setup();
      render(<Harness onOpenAnalysis={onOpenAnalysis} />);
      await user.click(within(screen.getByTestId("analyses-item-tal")).getByText("E69"));
      expect(onOpenAnalysis).toHaveBeenCalledWith(expect.objectContaining({ id: "tal" }));
      await user.click(screen.getByTestId("analyses-note-broken"));
      expect(onOpenAnalysis).toHaveBeenCalledTimes(1);
    });

    it("select-all takes the analyses shown, never a folder", async () => {
      const onPicked = vi.fn();
      const user = userEvent.setup();
      render(<Harness folders={ANALYSIS_FOLDERS} rows={WITH_FOLDERS} onPicked={onPicked} />);
      await user.click(screen.getByRole("checkbox", { name: "Select all analyses" }));
      expect([...onPicked.mock.lastCall![0]].sort()).toEqual(["board", "broken", "prep", "tal"]);
    });
  });
});
