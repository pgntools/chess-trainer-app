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

  it("gives each card an Analyse when the screen asks for one (CTA-177) — off for a record that will not read", async () => {
    const user = userEvent.setup();
    const onAnalyse = vi.fn();
    mount("compact", { onAnalyse });
    await user.click(screen.getByRole("button", { name: "Analyse Najdorf, the poisoned pawn with the computer" }));
    expect(onAnalyse).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
    expect(screen.getByRole("button", { name: "Analyse A record that will not read with the computer" })).toBeDisabled();
    await expectNoAxeViolations(screen.getByTestId("probe-grid"));
  });

  it("has no Analyse unless the screen asks for one", () => {
    mount("compact");
    expect(screen.queryByRole("button", { name: /with the computer$/ })).toBeNull();
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

  it("has no folder checkbox, and no delete action, unless the screen asks for them (CTA-147)", () => {
    // The lobby deletes through the picks: it passes no delete.
    mount("compact", { folderActions: { onDownload: vi.fn(), onRename: vi.fn(), onMove: vi.fn() } });
    expect(screen.queryByTestId("probe-folder-select-gopenings")).toBeNull();
    // The delete the caller never passed is not offered.
    expect(screen.queryByTestId("probe-folder-delete-gopenings")).toBeNull();
    expect(screen.getByTestId("probe-folder-download-gopenings")).toBeInTheDocument();
  });

  it("gives a folder card its checkbox — checked, indeterminate, and ticking it is the screen's (CTA-147)", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    mount("compact", {
      folderActions: { onDownload: vi.fn(), onRename: vi.fn(), onMove: vi.fn() },
      folderPick: (folder) =>
        folder.id === "gopenings"
          ? { checked: true, indeterminate: false, onToggle }
          : folder.id === "gpartly"
            ? { checked: false, indeterminate: true, onToggle }
            : { checked: false, indeterminate: false, onToggle },
    });
    const picked = screen.getByRole("checkbox", { name: "Select Openings" });
    expect(picked).toBeChecked();
    expect(screen.getByTestId("probe-folder-select-gopenings")).toContainElement(picked);
    expect(screen.getByRole("checkbox", { name: "Select Partly picked" })).toHaveAttribute("data-indeterminate", "true");
    // An empty folder carries its box too — only its own box can ever pick it.
    expect(screen.getByRole("checkbox", { name: "Select Nothing yet" })).not.toBeChecked();
    await user.click(picked);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("says when there is nothing here", () => {
    mount("compact", { folders: [], entries: [] });
    expect(screen.getByTestId("probe-empty")).toHaveTextContent("Nothing here.");
  });
});
