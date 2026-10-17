import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CollectionsTreeTable, {
  type CollectionsTreeTableProps,
} from "./CollectionsTreeTable";
import { isPotentialTournament, readsAsTournament } from "../../../lib/libraryCollections";
import { BUILT_IN, picksOver, rowsOpen } from "./fixtures";

const mount = (props: Partial<CollectionsTreeTableProps> = {}) => {
  const actions = {
    onDownloadFolder: vi.fn(),
    onRenameFolder: vi.fn(),
    onMoveFolder: vi.fn(),
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

  it("gives Built-in its download alone, a reader's folder three — no delete (CTA-235) —, a shipped collection its download alone", () => {
    mount();
    expect(
      within(screen.getByTestId("library-folder-actions-builtin")).getAllByRole(
        "button",
      ),
    ).toHaveLength(1);
    expect(
      within(screen.getByTestId("library-folder-actions-gopenings")).getAllByRole(
        "button",
      ),
    ).toHaveLength(3);
    for (const action of [
      "download",
      "rename",
      "move",
    ]) {
      expect(
        screen.getByTestId(`library-folder-${action}-gopenings`),
      ).toBeInTheDocument();
    }
    // CTA-235: a folder is deleted through the picks, whole.
    expect(screen.queryByTestId("library-folder-delete-gopenings")).toBeNull();
    // CTA-231: no new sub-folder, no upload into a folder — the header's New folder and the upload pick the folder.
    expect(screen.queryByTestId("library-folder-new-gopenings")).toBeNull();
    expect(screen.queryByTestId("library-folder-upload-gopenings")).toBeNull();
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

  it("picks collections and hands the bar the screen's actions (CTA-221)", async () => {
    const onChange = vi.fn();
    mount({ picks: picksOver(new Set(["tal"]), onChange, <button type="button">Merge collections…</button>) });
    expect(screen.getByTestId("library-picks-bar")).toHaveTextContent("1 collection picked");
    expect(screen.getByRole("button", { name: "Merge collections…" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pick Tal" })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: "Pick Club games" }));
    expect(onChange).toHaveBeenLastCalledWith(new Set(["tal", "uclub"]));
    await expectNoAxeViolations();
  });

  it("gives every reader's folder a box — none on Built-in — standing for all under it, partly ticked while some is (CTA-235)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount({ rows: rowsOpen(new Set([BUILT_IN, "gopenings", "gsicilian"])), picks: picksOver(new Set(["unajdorf"]), onChange) });
    expect(screen.queryByTestId("library-pick-folder-builtin")).toBeNull();
    expect(within(screen.getByTestId("library-folder-builtin")).queryByRole("checkbox")).toBeNull();
    // Sicilian holds Najdorf lines alone: ticked through it. Openings holds בליץ too: partly.
    expect(screen.getByRole("checkbox", { name: "Pick Sicilian" })).toBeChecked();
    const openings = screen.getByRole("checkbox", { name: "Pick Openings" });
    expect(openings).not.toBeChecked();
    expect(openings).toHaveAttribute("data-indeterminate", "true");
    expect(screen.getByTestId("library-picks-bar")).toHaveTextContent("1 collection picked");
    // Ticking a folder ticks it and everything under it.
    await user.click(openings);
    expect(onChange).toHaveBeenLastCalledWith(new Set(["unajdorf", "gopenings", "gsicilian", "ublitz"]));
    // An empty folder has its own box.
    expect(screen.getByRole("checkbox", { name: "Pick Nothing yet" })).not.toBeChecked();
    await expectNoAxeViolations();
  });

  it("counts the folders that go with the picks, and select-all takes every folder and collection (CTA-235)", async () => {
    const onChange = vi.fn();
    mount({ picks: picksOver(new Set(["gopenings", "gsicilian", "unajdorf", "ublitz", "uclub"]), onChange) });
    expect(screen.getByTestId("library-picks-bar")).toHaveTextContent("2 folders and 3 collections picked");
    expect(screen.getByRole("checkbox", { name: "Pick Openings" })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: i18n.t("library.picks.selectAll") }));
    const all = onChange.mock.lastCall?.[0] as Set<string>;
    for (const id of ["gopenings", "gsicilian", "gempty", "tal", "capablanca", "uclub", "ucup"]) expect(all.has(id)).toBe(true);
    expect(all.has(BUILT_IN)).toBe(false);
  });

  it("draws no collection's delete without its handler (CTA-232: the Library deletes its picks from its header)", () => {
    const fn = vi.fn();
    mount({
      actions: { onDownloadFolder: fn, onRenameFolder: fn, onMoveFolder: fn, onDownloadCollection: fn, onMoveCollection: fn },
    });
    expect(screen.getByTestId("library-collection-download-uclub")).toBeInTheDocument();
    expect(screen.queryByTestId("library-collection-delete-uclub")).toBeNull();
  });

  it("offers no New job on a collection's row (CTA-231, CTA-232)", () => {
    mount();
    expect(screen.queryByRole("button", { name: /New job/ })).toBeNull();
    expect(screen.queryByTestId("library-collection-new-job-tal")).toBeNull();
  });

  it("marks nothing without the verdict", () => {
    mount();
    expect(screen.queryByTestId("library-tournament-icon-ucup")).toBeNull();
  });
});
