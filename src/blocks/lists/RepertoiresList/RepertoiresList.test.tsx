import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import type { SavedListView } from "../savedListView";
import { FOLDERS, REPERTOIRES } from "./fixtures";
import RepertoiresList, { type RepertoiresListProps } from "./RepertoiresList";

const mount = (view: SavedListView, props: Partial<RepertoiresListProps> = {}) => {
  const onTogglePick = vi.fn();
  const folderActions = { onDownload: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() };
  render(
    <RepertoiresList
      view={view}
      folders={FOLDERS}
      repertoires={REPERTOIRES}
      picked={new Set()}
      onTogglePick={onTogglePick}
      openLink={(saved) => ({ href: `/r/${saved.id}` })}
      settingsLink={(saved) => ({ href: `/r/${saved.id}/settings` })}
      folderLink={(folder) => ({ href: `/r?folder=${folder.id}` })}
      folderActions={folderActions}
      extraActions={(saved) => <button data-testid={`games-${saved.id}`}>Games</button>}
      preview={(saved) => <div data-testid={`preview-${saved.id}`} />}
      empty={{ label: "None.", testId: "probe-empty" }}
      testId="probe"
      folderTestId="probe-folder"
      {...props}
    />,
  );
  return { onTogglePick, folderActions };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("RepertoiresList", () => {
  it("lists the folders as links, then each repertoire with its size and named controls", async () => {
    mount("list");
    const list = screen.getByRole("list", { name: "Repertoires" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByTestId("probe-folder-open-fwhite")).toHaveAttribute("href", "/r?folder=fwhite");
    expect(screen.getByTestId("probe-item-r1")).toHaveTextContent("3 moves · 1 variation");
    expect(screen.getByTestId("probe-description-r1")).toHaveTextContent("Against 2...Nf6, play 3.e5.");
    expect(screen.getByRole("link", { name: "Open Sicilian, the Alapin" })).toHaveAttribute("href", "/r/r1");
    expect(screen.getByRole("link", { name: "Settings of Sicilian, the Alapin" })).toHaveAttribute("href", "/r/r1/settings");
    expect(screen.getByTestId("probe-item-r2")).toHaveTextContent("Untitled repertoire");
    expect(screen.getByTestId("probe-item-r3")).toHaveTextContent("Several games — open to merge or split");
    // The extra actions sit before the settings gear.
    expect(within(screen.getByTestId("probe-item-r1")).getByTestId("games-r1")).toBeInTheDocument();
    await expectNoAxeViolations(list);
  });

  it("offers a folder no move, and turns an empty one's download off", async () => {
    const user = userEvent.setup();
    const { folderActions } = mount("list");
    expect(screen.queryByTestId("probe-folder-move-fwhite")).toBeNull();
    expect(screen.getByTestId("probe-folder-download-fempty")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Rename White" }));
    expect(folderActions.onRename).toHaveBeenCalledWith(FOLDERS[0].folder);
  });

  it("picks from the keyboard", async () => {
    const user = userEvent.setup();
    const { onTogglePick } = mount("list");
    screen.getByRole("link", { name: "Settings of Sicilian, the Alapin" }).focus();
    await user.tab();
    await user.keyboard(" ");
    expect(onTogglePick).toHaveBeenCalledWith("r1");
  });

  it("draws cards whose square opens the repertoire over its preview", async () => {
    mount("comfortable");
    const grid = screen.getByRole("group", { name: "Repertoires" });
    expect(screen.getByRole("link", { name: "Open Sicilian, the Alapin" })).toContainElement(screen.getByTestId("preview-r1"));
    expect(screen.getByRole("link", { name: "Open folder White" })).toHaveAttribute("href", "/r?folder=fwhite");
    await expectNoAxeViolations(grid);
  });

  it("says when there is nothing", () => {
    mount("list", { folders: [], repertoires: [] });
    expect(screen.getByTestId("probe-empty")).toHaveTextContent("None.");
  });
});
