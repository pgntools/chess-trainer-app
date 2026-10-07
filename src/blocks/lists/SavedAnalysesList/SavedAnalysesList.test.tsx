import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import type { SavedListView } from "../savedListView";
import { ENTRIES, FOLDERS } from "./fixtures";
import SavedAnalysesList, { type SavedAnalysesListProps } from "./SavedAnalysesList";

const mount = (view: Exclude<SavedListView, "list">, props: Partial<SavedAnalysesListProps> = {}) => {
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

  it("opens a folder and runs its actions — its download off while it is empty", async () => {
    const user = userEvent.setup();
    const { onOpenFolder, folderActions } = mount("compact");
    await user.click(screen.getByRole("button", { name: "Open folder Openings" }));
    expect(onOpenFolder).toHaveBeenCalledWith("gopenings");
    await user.click(screen.getByRole("button", { name: "Move Openings" }));
    expect(folderActions.onMove).toHaveBeenCalledWith(FOLDERS[0].folder);
    expect(screen.getByTestId("probe-folder-download-gempty")).toBeDisabled();
  });

  it("says when there is nothing here", () => {
    mount("compact", { folders: [], entries: [] });
    expect(screen.getByTestId("probe-empty")).toHaveTextContent("Nothing here.");
  });
});
