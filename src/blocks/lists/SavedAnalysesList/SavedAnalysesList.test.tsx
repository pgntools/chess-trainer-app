import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import type { SavedListView } from "../savedListView";
import { ENTRIES, FOLDERS } from "./fixtures";
import SavedAnalysesList, { type SavedAnalysesListProps } from "./SavedAnalysesList";

const mount = (view: SavedListView, props: Partial<SavedAnalysesListProps> = {}) => {
  const onTogglePick = vi.fn();
  const onOpenFolder = vi.fn();
  const folderActions = { onDownload: vi.fn(), onRename: vi.fn(), onMove: vi.fn(), onDelete: vi.fn() };
  render(
    <SavedAnalysesList
      view={view}
      folders={FOLDERS}
      entries={ENTRIES}
      picked={new Set(["a1"])}
      onTogglePick={onTogglePick}
      openLink={(saved) => ({ href: `/open/${saved.id}` })}
      settingsLink={(saved) => ({ href: `/settings/${saved.id}` })}
      onOpenFolder={onOpenFolder}
      folderActions={folderActions}
      preview={({ saved }) => <div data-testid={`preview-${saved.id}`} />}
      empty={{ label: "Nothing here.", testId: "probe-empty" }}
      testId="probe"
      {...props}
    />,
  );
  return { onTogglePick, onOpenFolder, folderActions };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("SavedAnalysesList — the list", () => {
  it("draws the folders first, then the table it is handed (CTA-144)", async () => {
    mount("list", { table: <table aria-label="The games" data-testid="probe-table" /> });
    const list = screen.getByRole("list", { name: "Folders" });
    expect(within(list).getAllByRole("listitem").map((row) => row.getAttribute("data-testid"))).toEqual([
      "probe-folder-gopenings",
      "probe-folder-gempty",
    ]);
    // The analyses are the table's: the list draws no row of its own for them.
    expect(screen.queryByTestId("probe-item-a1")).toBeNull();
    expect(screen.getByTestId("probe-body")).toContainElement(screen.getByTestId("probe-table"));
    expect(list.compareDocumentPosition(screen.getByTestId("probe-table")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expectNoAxeViolations(list);
  });

  it("opens a folder and runs its actions — its download off while it is empty", async () => {
    const user = userEvent.setup();
    const { onOpenFolder, folderActions } = mount("list");
    await user.click(screen.getByTestId("probe-folder-open-gopenings"));
    expect(onOpenFolder).toHaveBeenCalledWith("gopenings");
    await user.click(screen.getByRole("button", { name: "Move Openings" }));
    expect(folderActions.onMove).toHaveBeenCalledWith(FOLDERS[0].folder);
    expect(screen.getByTestId("probe-folder-download-gempty")).toBeDisabled();
  });

  it("says when there is nothing here — no folder and no table", () => {
    mount("list", { folders: [], entries: [] });
    expect(screen.getByTestId("probe-empty")).toHaveTextContent("Nothing here.");
  });

  it("shows a table alone, with no folder above it", () => {
    mount("list", { folders: [], entries: [], table: <table aria-label="The games" data-testid="probe-table" /> });
    expect(screen.queryByTestId("probe-empty")).toBeNull();
    expect(screen.queryByRole("list", { name: "Folders" })).toBeNull();
    expect(screen.getByTestId("probe-table")).toBeInTheDocument();
  });
});

describe("SavedAnalysesList — the cards", () => {
  it("previews each analysis in a square that opens it, the opening under a known one", async () => {
    mount("compact");
    const grid = screen.getByRole("group", { name: "Saved analyses" });
    expect(grid).toBe(screen.getByTestId("probe-grid"));
    expect(screen.getByRole("link", { name: "Open Najdorf, the poisoned pawn" })).toContainElement(screen.getByTestId("preview-a1"));
    expect(screen.getByTestId("probe-opening-a1")).toHaveTextContent("Sicilian Defense: Najdorf Variation · B90");
    expect(screen.queryByTestId("probe-opening-a2")).toBeNull();
    // A record that will not read has no board and no button.
    expect(screen.getByTestId("probe-open-a3")).toHaveTextContent("This analysis could not be read.");
    expect(screen.getByRole("button", { name: "Open folder Openings" })).toBeInTheDocument();
    await expectNoAxeViolations(grid);
  });

  it("picks from the keyboard", async () => {
    const user = userEvent.setup();
    const { onTogglePick } = mount("compact");
    screen.getByRole("link", { name: "Settings of Najdorf, the poisoned pawn" }).focus();
    await user.tab();
    await user.keyboard(" ");
    expect(onTogglePick).toHaveBeenCalledWith("a1");
  });
});
