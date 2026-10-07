import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionsTreeTable, {
  type CollectionsTreeTableProps,
} from "./CollectionsTreeTable";
import { isPotentialTournament, readsAsTournament } from "../../../lib/libraryCollections";
import { BUILT_IN, rowsOpen } from "./fixtures";

const mount = (props: Partial<CollectionsTreeTableProps> = {}) => {
  const actions = {
    uploadLink: (folder: { id: string }) => ({
      href: `/new?folder=${folder.id}`,
    }),
    onNewFolder: vi.fn(),
    onDownloadFolder: vi.fn(),
    onRenameFolder: vi.fn(),
    onMoveFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
    onDownloadCollection: vi.fn(),
    onMoveCollection: vi.fn(),
    onDeleteCollection: vi.fn(),
  };
  const onToggle = vi.fn();
  const onSort = vi.fn();
  render(
    <CollectionsTreeTable
      rows={rowsOpen(new Set([BUILT_IN, "gopenings"]))}
      sort={{ column: "name", direction: "asc" }}
      onSort={onSort}
      onToggle={onToggle}
      collectionLink={(entry) => ({ href: `/library/${entry.id}` })}
      onOpenCollection={() => {}}
      builtInFolderId={BUILT_IN}
      actions={actions}
      testId="probe"
      {...props}
    />,
  );
  return { actions, onToggle, onSort };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CollectionsTreeTable", () => {
  it("draws Built-in first, open, then the reader's folders and the loose collections, each with its size", async () => {
    mount();
    const rows = within(screen.getByTestId("probe"))
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.dataset.testid);
    expect(rows[0]).toBe("library-folder-builtin");
    expect(rows).toContain("library-row-tal");
    expect(screen.getByTestId("library-folder-builtin-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      within(screen.getByTestId("library-folder-builtin")).getByText("3,671"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("library-collection-uclub")).toHaveAttribute(
      "href",
      "/library/uclub",
    );
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("gives Built-in its download alone, a reader's folder all six, a shipped collection its download alone", () => {
    mount();
    expect(
      within(screen.getByTestId("library-folder-actions-builtin")).getAllByRole(
        "button",
      ),
    ).toHaveLength(1);
    for (const action of [
      "upload",
      "new",
      "download",
      "rename",
      "move",
      "delete",
    ]) {
      expect(
        screen.getByTestId(`library-folder-${action}-gopenings`),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByTestId("library-folder-upload-gopenings"),
    ).toHaveAttribute("href", "/new?folder=gopenings");
    expect(screen.queryByTestId("library-collection-delete-tal")).toBeNull();
    expect(screen.getByRole("button", { name: "Delete Club games" })).toBe(
      screen.getByTestId("library-collection-delete-uclub"),
    );
  });

  it("opens a folder from its chevron by the keyboard, and sorts from a header", async () => {
    const user = userEvent.setup();
    const { onToggle, onSort } = mount();
    screen
      .getByRole("button", {
        name: i18n.t("library.folder.expand", { name: "Nothing yet" }),
      })
      .focus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledWith("gempty");
    await user.click(screen.getByTestId("probe-sort-games"));
    expect(onSort).toHaveBeenCalledWith("games");
  });

  it("dates a row as the tables do", () => {
    mount();
    expect(
      within(screen.getByTestId("library-row-uclub")).getByText("2026-09-20"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("library-row-tal")).getByText("—"),
    ).toBeInTheDocument();
  });

  it("marks a collection that reads as a tournament with a trophy, its name read with the word (CTA-142)", async () => {
    mount({ isTournament: (collection) => readsAsTournament(collection) });
    const icon = screen.getByTestId("library-tournament-icon-ucup");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Club championship 2026, Tournament" })).toBe(
      screen.getByTestId("library-collection-ucup"),
    );
    // Marked, but its games no longer share one event: a table like the rest.
    expect(screen.queryByTestId("library-tournament-icon-umixed")).toBeNull();
    expect(screen.getByRole("link", { name: "Cup and friendlies" })).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("marks a potential tournament with a warning among its actions — its tooltip says why, and it opens the collection (CTA-142)", async () => {
    const user = userEvent.setup();
    mount({ isTournament: (collection) => readsAsTournament(collection), isPotentialTournament: (collection) => isPotentialTournament(collection) });
    const warning = screen.getByTestId("library-potential-tournament-uopen");
    expect(within(screen.getByTestId("library-collection-actions-uopen")).getAllByRole("link")[0]).toBe(warning);
    expect(warning).toHaveAccessibleName(/^Potential tournament: Weekend open 2026's 18 games share one Event/);
    expect(warning).toHaveAttribute("href", "/library/uopen");
    await user.hover(warning);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Open it to choose a tournament type");
    // The name keeps its table icon, and is read as before.
    expect(screen.getByRole("link", { name: "Weekend open 2026" })).toBe(screen.getByTestId("library-collection-uopen"));
    // A tournament, a collection of mixed events and a plain one have none.
    for (const id of ["ucup", "umixed", "uclub"]) expect(screen.queryByTestId(`library-potential-tournament-${id}`)).toBeNull();
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("marks nothing without the verdict", () => {
    mount();
    expect(screen.queryByTestId("library-tournament-icon-ucup")).toBeNull();
  });
});
