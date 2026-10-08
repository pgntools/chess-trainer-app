import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import i18n from "../../i18n";
import {
  loadUploadedCollections,
  peekUploadedGames,
  updateCollectionSettings,
  uploadedCollectionsSnapshot,
} from "../../lib/libraryCollectionStore";
import { createLibraryFolder, libraryFoldersSnapshot, loadLibraryFolders } from "../../lib/libraryFolderStore";
import { peekShippedGames, peekShippedRows, shippedCollections } from "../../lib/shippedCollections";
import { findSavedAnalysis, savedAnalysesSnapshot } from "../../lib/savedAnalysisStore";
import { downloadPgn } from "../../lib/pgnExport";
import { boardOptions } from "../board/boardTestHarness";
import {
  AFTER_E4_E5,
  GAMES,
  where,
  mount,
  keep,
  upload,
  confirmImport,
  pickFile,
  zipOf,
  cleanupAndMount,
  mountTable,
  mountGame,
  drag,
  rowNumbers,
  resetLibrary,
} from "./libraryTestKit";

vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});

// The download is a blob URL in a browser; here, what it was handed.
vi.mock("../../lib/pgnExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/pgnExport")>()),
  downloadPgn: vi.fn(() => true),
}));

vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../board/boardTestHarness");
  return openingsMock(importOriginal as () => Promise<typeof import("../../lib/openings")>);
});

/*
  The Library (CTA-75), through its screens — here the list (collections and folders), a collection's table, a game on its analysis board — Update / Save as copy in an upload, Save as copy into Saved analyses from a shipped file — and a collection's settings. The other
  Library screen tests are `Library.test.tsx`, `LibraryFilters.test.tsx`,
  `LibraryPicks.test.tsx` and `LibraryImport.test.tsx`, one file once,
  split so the suite's shards can share it (CTA-124); what they share is
  `libraryTestKit.tsx`. The board's shared panel and square are asserted
  with the other v2 boards (`boards.test.tsx`, `panelPropagation.test.tsx`).
*/

beforeEach(resetLibrary);

describe("the Library's collections", () => {
  it("lists the ten shipped collections, then the reader's uploads", async () => {
    const mine = await upload();
    mount("/library");

    // The uploads arrive once IndexedDB has answered.
    await screen.findByTestId(`library-collection-${mine.id}`);
    const list = screen.getByTestId("library-collections");
    const names = within(list)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names[0]).toContain("Alekhine");
    expect(names[1]).toContain("Capablanca");
    // CTA-128: tournaments ship too, for the Blog's <Collection…Table> and <Collection…Bracket>.
    expect(names[2]).toContain("Esports World Cup 2026 — play-in");
    expect(names[3]).toContain("FIDE Candidates 2026");
    expect(names[4]).toContain("Fischer");
    expect(names[5]).toContain("Netherlands Championship 2026");
    expect(names[6]).toContain("Petrosian");
    expect(names[7]).toContain("Tal");
    expect(names[8]).toContain("World Blitz Team 2026 — final stage");
    expect(names[9]).toContain("World Rapid Team 2026");
    expect(names[10]).toContain("Club games");
    expect(screen.getByTestId(`library-collection-${mine.id}`)).toHaveAttribute(
      "href",
      `/library/${mine.id}`,
    );
    expect(screen.getByTestId("library-count")).toHaveTextContent("11 collections");
    expect(within(screen.getByTestId(`library-row-${mine.id}`)).getByText("3")).toBeInTheDocument();
  });

  it("counts the shipped collections off the manifest, fetching nothing", () => {
    mount("/library");
    // On the first frame, no fetch awaited.
    expect(within(screen.getByTestId("library-row-capablanca")).getByText("1,035")).toBeInTheDocument();
    expect(within(screen.getByTestId("library-row-tal")).getByText("2,636")).toBeInTheDocument();
    // Built-in holds them all.
    expect(within(screen.getByTestId("library-folder-builtin")).getByText("10,754")).toBeInTheDocument();
    for (const entry of shippedCollections) {
      expect(peekShippedRows(entry.id)).toBeUndefined();
      expect(peekShippedGames(entry.id)).toBeUndefined();
    }
  });

  it("filters the collections by name, from the URL, saying when none matches", async () => {
    const mine = await upload();
    mount("/library");
    await screen.findByTestId(`library-collection-${mine.id}`);

    fireEvent.change(screen.getByTestId("library-filter"), { target: { value: "  TAL " } });
    expect(where()).toContain("q=");
    expect(screen.getByTestId("library-collection-tal")).toBeInTheDocument();
    expect(screen.queryByTestId("library-collection-capablanca")).toBeNull();
    expect(screen.queryByTestId(`library-collection-${mine.id}`)).toBeNull();
    expect(screen.getByTestId("library-count")).toHaveTextContent("1 of 11 collections");

    fireEvent.change(screen.getByTestId("library-filter"), { target: { value: "club" } });
    expect(screen.getByTestId(`library-collection-${mine.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId("library-collection-tal")).toBeNull();

    fireEvent.change(screen.getByTestId("library-filter"), { target: { value: "nothing like it" } });
    expect(screen.getByTestId("library-no-matches")).toBeInTheDocument();

    cleanupAndMount("/library?q=capablanca");
    expect(screen.getByTestId("library-filter")).toHaveValue("capablanca");
    expect(screen.getByTestId("library-collection-capablanca")).toBeInTheDocument();
    expect(screen.queryByTestId("library-collection-alekhine")).toBeNull();
  });

  it("keeps each row's download and delete in a column beside its link, not inside it", async () => {
    const mine = await upload();
    mount("/library");
    for (const id of ["capablanca", mine.id]) {
      const actions = await screen.findByTestId(`library-collection-actions-${id}`);
      expect(screen.getByTestId(`library-collection-${id}`)).not.toContainElement(actions);
      expect(actions).toContainElement(screen.getByTestId(`library-collection-download-${id}`));
    }
    expect(screen.getByTestId(`library-collection-actions-${mine.id}`)).toContainElement(
      screen.getByTestId(`library-collection-delete-${mine.id}`),
    );
  });

  it("deletes an uploaded collection from its row, asking first — a shipped one has no delete", async () => {
    const mine = await upload();
    mount("/library");
    expect(screen.queryByTestId("library-collection-delete-capablanca")).toBeNull();
    fireEvent.click(await screen.findByTestId(`library-collection-delete-${mine.id}`));
    expect(screen.getByTestId("library-delete-dialog")).toHaveTextContent("Delete Club games?");
    fireEvent.click(screen.getByTestId("library-delete-confirm"));
    await waitFor(() => expect(uploadedCollectionsSnapshot()).toEqual([]));
    expect(where()).toBe("/library");
    expect(screen.queryByTestId(`library-collection-${mine.id}`)).toBeNull();
  });

  it("downloads a whole collection from its row, reading its games only then", async () => {
    vi.mocked(downloadPgn).mockClear();
    const mine = await upload();
    mount("/library");
    expect(peekShippedGames("capablanca")).toBeUndefined();

    fireEvent.click(screen.getByTestId("library-collection-download-capablanca"));
    await waitFor(() => expect(downloadPgn).toHaveBeenCalledTimes(1));
    const [stem, pgns] = vi.mocked(downloadPgn).mock.calls[0];
    expect(stem).toBe("capablanca");
    expect(pgns).toHaveLength(1035);
    // The icon is beside the row's link, so the click did not open the collection.
    expect(where()).toBe("/library");

    fireEvent.click(screen.getByTestId(`library-collection-download-${mine.id}`));
    await waitFor(() => expect(downloadPgn).toHaveBeenLastCalledWith("club-games", GAMES));
  });
});

describe("the Library's folders (CTA-88)", () => {
  /** The table's rows, as their test ids, in the order on screen. */
  const listRows = () =>
    within(screen.getByTestId("library-collections"))
      // A closing dialog still hides the page from the accessibility tree.
      .getAllByRole("row", { hidden: true })
      .slice(1)
      .map((row) => row.getAttribute("data-testid"));
  const folderOf = async (name: string) =>
    (await loadUploadedCollections()).find((row) => row.name === name)?.folderId;
  const nameFolder = (name: string) => {
    fireEvent.change(screen.getByTestId("library-folder-name-input"), { target: { value: name } });
    fireEvent.click(screen.getByTestId("library-folder-name-save"));
  };
  const made = async (name: string, parentId: string | null = null) => {
    const folder = await createLibraryFolder(name, parentId);
    if (folder === undefined) throw new Error("not made");
    return folder;
  };

  it("keeps the shipped collections in Built-in: first, open, and read-only", async () => {
    const box = await made("Box");
    mount("/library");
    await screen.findByTestId(`library-folder-${box.id}`);

    expect(listRows()).toEqual([
      "library-folder-builtin",
      "library-row-alekhine",
      "library-row-capablanca",
      "library-row-esportsplayin2026",
      "library-row-candidates2026",
      "library-row-fischer",
      "library-row-netherlands2026",
      "library-row-petrosian",
      "library-row-tal",
      "library-row-worldblitzteam2026",
      "library-row-worldrapidteam2026",
      `library-folder-${box.id}`,
    ]);
    expect(screen.getByTestId("library-folder-builtin-toggle")).toHaveAttribute("aria-expanded", "true");
    const actions = screen.getByTestId("library-folder-actions-builtin");
    expect(within(actions).getByTestId("library-folder-download-builtin")).toBeInTheDocument();
    for (const action of ["upload", "new", "rename", "move", "delete"]) {
      expect(screen.queryByTestId(`library-folder-${action}-builtin`)).toBeNull();
      expect(screen.getByTestId(`library-folder-${action}-${box.id}`)).toBeInTheDocument();
    }
    // Its collections only download, and have no date.
    expect(screen.getByTestId("library-collection-download-capablanca")).toBeInTheDocument();
    expect(screen.queryByTestId("library-collection-move-capablanca")).toBeNull();
    expect(screen.queryByTestId("library-collection-delete-capablanca")).toBeNull();
    expect(within(screen.getByTestId("library-row-capablanca")).getByText("—")).toBeInTheDocument();
    // Nothing can be filed in it.
    fireEvent.click(screen.getByTestId(`library-folder-move-${box.id}`));
    expect(screen.queryByTestId("library-folder-picker-builtin")).toBeNull();
  });

  it("creates folders at the top level and inside one, and opens and closes them in place", async () => {
    const mine = await upload();
    mount("/library");
    await screen.findByTestId(`library-row-${mine.id}`);

    fireEvent.click(screen.getByTestId("library-new-folder"));
    nameFolder("Openings");
    await waitFor(() => expect(libraryFoldersSnapshot()).toHaveLength(1));
    const [openings] = libraryFoldersSnapshot()!;
    const openingsRow = await screen.findByTestId(`library-folder-${openings.id}`);
    // Folders come before the collections of their level.
    expect(listRows().indexOf(`library-folder-${openings.id}`)).toBeLessThan(listRows().indexOf(`library-row-${mine.id}`));
    expect(within(openingsRow).getByText("Openings")).toHaveAttribute("dir", "auto");

    fireEvent.click(screen.getByTestId(`library-folder-new-${openings.id}`));
    nameFolder("Sicilian");
    await waitFor(() => expect(libraryFoldersSnapshot()).toHaveLength(2));
    const sicilian = libraryFoldersSnapshot()!.find((folder) => folder.name === "Sicilian")!;
    expect(sicilian.parentId).toBe(openings.id);
    // Its parent opened to show it.
    expect(await screen.findByTestId(`library-folder-${sicilian.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`library-folder-${openings.id}-toggle`)).toHaveAttribute("aria-expanded", "true");

    // A click on the row closes it; on the chevron, opens it again.
    fireEvent.click(openingsRow);
    expect(screen.queryByTestId(`library-folder-${sicilian.id}`)).toBeNull();
    fireEvent.click(screen.getByTestId(`library-folder-${openings.id}-toggle`));
    expect(screen.getByTestId(`library-folder-${sicilian.id}`)).toBeInTheDocument();
    // Built-in closes too.
    fireEvent.click(screen.getByTestId("library-folder-builtin-toggle"));
    expect(screen.queryByTestId("library-row-capablanca")).toBeNull();
  });

  it("opens a collection from its row, with a real link in its name", async () => {
    const box = await made("Box");
    const mine = await keep("Club games", GAMES, box.id);
    mount("/library");
    fireEvent.click(await screen.findByTestId(`library-folder-${box.id}`));
    expect(screen.getByTestId(`library-collection-${mine.id}`)).toHaveAttribute("href", `/library/${mine.id}`);
    fireEvent.click(screen.getByTestId(`library-row-${mine.id}`));
    expect(where()).toBe(`/library/${mine.id}`);
  });

  it("uploads into a folder from its row, the picker starting there", async () => {
    const box = await made("Box");
    mount("/library");
    fireEvent.click(await screen.findByTestId(`library-folder-upload-${box.id}`));
    expect(where()).toBe(`/library/new?folder=${box.id}`);
    expect(await screen.findByTestId(`library-upload-folder-picker-${box.id}`)).toHaveClass("Mui-selected");

    // One game: the upload is a real index pass.
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: GAMES[0] } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    await confirmImport();
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/), { timeout: 4000 });
    expect(await folderOf("Club")).toBe(box.id);
  });

  it("takes a zip of one .pgn like the .pgn itself, and refuses a zip of none or unreadable bytes", async () => {
    mount("/library/new");
    expect(screen.getByTestId("library-upload-input")).toHaveAttribute("accept", expect.stringContaining(".zip"));

    pickFile(zipOf({ "notes.txt": "hi" }));
    expect(await screen.findByTestId("library-upload-problem")).toHaveTextContent(/no \.pgn/i);
    pickFile(new File(["not a zip"], "broken.zip", { type: "application/zip" }));
    await waitFor(() => expect(screen.getByTestId("library-upload-problem")).toHaveTextContent(/could not be read/i));

    // One .pgn (beside a resource fork): a new collection, named from the Event its games share.
    pickFile(zipOf({ "games/x.pgn": GAMES[0], "__MACOSX/games/._x.pgn": "junk" }));
    expect(await screen.findByTestId("library-import-file-0")).toHaveTextContent("games/x.pgn");
    await confirmImport();
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/), { timeout: 4000 });
    expect(await folderOf("Club")).toBeNull();
  });

  it("makes one collection per .pgn of a zip, each named by its Event or its file, all in the folder picked (CTA-103)", async () => {
    const box = await made("Box");
    mount(`/library/new?folder=${box.id}`);
    await screen.findByTestId(`library-upload-folder-picker-${box.id}`);
    // The typed name is a single text's; several files are named by the rule.
    fireEvent.change(screen.getByTestId("library-upload-name"), { target: { value: "Ignored" } });
    const mixed = GAMES[0].replace('[Event "Club"]', '[Event "Other"]');
    pickFile(zipOf({ "one/Club.pgn": GAMES.slice(0, 2).join("\n\n"), "two/Mixed_Bag.pgn": `${GAMES[2]}\n\n${mixed}` }, "Two.zip"));

    expect(await screen.findByTestId("library-import-source")).toHaveTextContent("Two.zip");
    expect(screen.getByTestId("library-import-source")).toHaveTextContent("4 games");
    expect(screen.getByTestId("library-import-file-0")).toHaveTextContent("one/Club.pgn");
    expect(screen.getByTestId("library-import-file-0")).toHaveTextContent("2 games");
    expect(screen.getByTestId("library-import-file-1")).toHaveTextContent("two/Mixed_Bag.pgn");
    expect(screen.getByTestId("library-import-several")).toBeInTheDocument();
    expect(screen.getByTestId("library-import-summary-events")).toHaveTextContent("2 events: Club, Other");

    await confirmImport();
    await waitFor(() => expect(where()).toBe("/library"), { timeout: 4000 });
    const kept = await loadUploadedCollections();
    expect(kept.map((row) => [row.name, row.count, row.folderId]).sort()).toEqual([
      ["Club", 2, box.id],
      ["Mixed Bag", 2, box.id],
    ]);
  });

  it("files an empty collection in the folder picked, and a folder that is not the reader's at the top level", async () => {
    const box = await made("Box");
    mount("/library/new");
    fireEvent.click(await screen.findByTestId(`library-upload-folder-picker-${box.id}`));
    fireEvent.change(screen.getByTestId("library-upload-name"), { target: { value: "Picked" } });
    fireEvent.click(screen.getByTestId("library-upload-empty"));
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/));
    expect(await folderOf("Picked")).toBe(box.id);

    for (const folder of ["builtin", "nowhere"]) {
      cleanupAndMount(`/library/new?folder=${folder}`);
      expect(await screen.findByTestId("library-upload-folder-top")).toHaveClass("Mui-selected");
    }
    fireEvent.change(screen.getByTestId("library-upload-name"), { target: { value: "Loose" } });
    fireEvent.click(screen.getByTestId("library-upload-empty"));
    await waitFor(() => expect(where()).toMatch(/^\/library\/u/));
    expect(await folderOf("Loose")).toBeNull();
  });

  it("moves a collection and a folder with Move to…, never a folder into its own subtree", async () => {
    const a = await made("A");
    const b = await made("B", a.id);
    const c = await made("C");
    const mine = await upload();
    mount("/library");

    fireEvent.click(await screen.findByTestId(`library-collection-move-${mine.id}`));
    fireEvent.click(within(screen.getByTestId("library-collection-move-dialog")).getByTestId(`library-folder-picker-${b.id}`));
    await waitFor(async () => expect(await folderOf("Club games")).toBe(b.id));
    // It left the top level for B, which is closed.
    await waitFor(() => expect(screen.queryByTestId(`library-row-${mine.id}`)).toBeNull());
    await waitFor(() => expect(screen.queryByTestId("library-collection-move-dialog")).toBeNull());

    fireEvent.click(screen.getByTestId(`library-folder-move-${a.id}`));
    expect(screen.queryByTestId(`library-folder-picker-${a.id}`)).toBeNull();
    expect(screen.queryByTestId(`library-folder-picker-${b.id}`)).toBeNull();
    fireEvent.click(screen.getByTestId(`library-folder-picker-${c.id}`));
    await waitFor(() => expect(libraryFoldersSnapshot()?.find((row) => row.id === a.id)?.parentId).toBe(c.id));
  });

  it("renames a folder, and deletes one keeping its contents in its parent — asking first when it holds any", async () => {
    const top = await made("Top");
    const doomed = await made("Doomed", top.id);
    const kept = await made("Kept", doomed.id);
    await keep("Inside", GAMES, doomed.id);
    const empty = await made("Empty");
    mount("/library");

    fireEvent.click(await screen.findByTestId(`library-folder-rename-${top.id}`));
    expect(screen.getByTestId("library-folder-name-input")).toHaveValue("Top");
    nameFolder("Renamed");
    await waitFor(() => expect(screen.getByTestId(`library-folder-${top.id}`)).toHaveTextContent("Renamed"));

    // An empty folder goes at once.
    fireEvent.click(screen.getByTestId(`library-folder-delete-${empty.id}`));
    await waitFor(() => expect(screen.queryByTestId(`library-folder-${empty.id}`)).toBeNull());

    fireEvent.click(screen.getByTestId(`library-folder-${top.id}`));
    fireEvent.click(await screen.findByTestId(`library-folder-delete-${doomed.id}`));
    expect(screen.getByTestId("library-folder-delete-counts")).toHaveTextContent("1 collections and 1 sub-folders");
    expect(screen.getByRole("dialog")).toHaveTextContent(i18n.t("library.folder.deleteConfirm"));
    fireEvent.click(screen.getByTestId("library-folder-delete-confirm"));
    await waitFor(async () => expect(await folderOf("Inside")).toBe(top.id));
    expect((await loadLibraryFolders()).find((row) => row.id === kept.id)?.parentId).toBe(top.id);
  });

  it("filters by name, opening the folders above a match, and shows a folder whose name matches", async () => {
    const a = await made("Archive");
    const b = await made("Bullet", a.id);
    const mine = await keep("Club games", GAMES, b.id);
    mount("/library");
    await screen.findByTestId(`library-folder-${a.id}`);
    expect(screen.queryByTestId(`library-row-${mine.id}`)).toBeNull();

    fireEvent.change(screen.getByTestId("library-filter"), { target: { value: "club" } });
    expect(where()).toBe("/library?q=club");
    expect(listRows()).toEqual([`library-folder-${a.id}`, `library-folder-${b.id}`, `library-row-${mine.id}`]);
    expect(screen.getByTestId("library-count")).toHaveTextContent("1 of 11 collections");

    // The reader can still close what the filter opened.
    fireEvent.click(screen.getByTestId(`library-folder-${b.id}-toggle`));
    expect(listRows()).toEqual([`library-folder-${a.id}`, `library-folder-${b.id}`]);

    fireEvent.change(screen.getByTestId("library-filter"), { target: { value: "bullet" } });
    expect(listRows()).toEqual([`library-folder-${a.id}`, `library-folder-${b.id}`]);
    expect(screen.getByTestId(`library-folder-${b.id}-toggle`)).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByTestId(`library-folder-${b.id}`));
    expect(listRows()).toContain(`library-row-${mine.id}`);

    fireEvent.change(screen.getByTestId("library-filter"), { target: { value: "nothing like it" } });
    expect(screen.getByTestId("library-no-matches")).toBeInTheDocument();
  });

  it("sorts by Name, Games and Added from the headers, in the URL, folders always first", async () => {
    const box = await made("Zeta box");
    const small = await keep("Aardvark", GAMES.slice(0, 1), null, "2026-01-01T00:00:00Z");
    const big = await keep("Mid", GAMES, null, "2026-03-01T00:00:00Z");
    mount("/library");
    await screen.findByTestId(`library-row-${big.id}`);
    fireEvent.click(screen.getByTestId("library-folder-builtin-toggle"));
    const order = [`library-folder-builtin`, `library-folder-${box.id}`];
    expect(listRows()).toEqual([...order, `library-row-${small.id}`, `library-row-${big.id}`]);

    fireEvent.click(screen.getByTestId("library-collections-sort-games"));
    expect(where()).toBe("/library?sort=games");
    expect(listRows()).toEqual([...order, `library-row-${big.id}`, `library-row-${small.id}`]);
    fireEvent.click(screen.getByTestId("library-collections-sort-games"));
    expect(where()).toBe("/library?sort=games&dir=asc");
    expect(listRows()).toEqual([...order, `library-row-${small.id}`, `library-row-${big.id}`]);

    fireEvent.click(screen.getByTestId("library-collections-sort-added"));
    expect(where()).toBe("/library?sort=added");
    expect(listRows()).toEqual([...order, `library-row-${big.id}`, `library-row-${small.id}`]);

    fireEvent.click(screen.getByTestId("library-collections-sort-name"));
    expect(where()).toBe("/library");
    fireEvent.click(screen.getByTestId("library-collections-sort-name"));
    expect(where()).toBe("/library?dir=desc");
    expect(listRows()).toEqual([...order, `library-row-${big.id}`, `library-row-${small.id}`]);

    cleanupAndMount("/library?sort=games&dir=asc");
    await screen.findByTestId(`library-row-${big.id}`);
    expect(listRows().slice(-2)).toEqual([`library-row-${small.id}`, `library-row-${big.id}`]);
  });

  it("downloads a folder's whole subtree as one PGN, reading the games only then", async () => {
    vi.mocked(downloadPgn).mockClear();
    const top = await made("Top");
    const inner = await made("Inner", top.id);
    await keep("B games", GAMES.slice(1), top.id);
    await keep("A games", GAMES.slice(0, 1), inner.id);
    mount("/library");
    fireEvent.click(await screen.findByTestId(`library-folder-download-${top.id}`));
    await waitFor(() => expect(downloadPgn).toHaveBeenCalledTimes(1));
    expect(downloadPgn).toHaveBeenLastCalledWith("top", [GAMES[0], GAMES[1], GAMES[2]]);
    expect(where()).toBe("/library");
  });
});

describe("a collection's table", () => {
  it("opens a shipped collection once it is fetched", async () => {
    mount("/library/fischer");
    expect(await screen.findByTestId("library-table-name")).toHaveTextContent("Fischer");
    expect(screen.getByTestId("library-table-count")).toHaveTextContent("1063 games");
    expect(screen.getByTestId("library-table-note")).toHaveTextContent(
      i18n.t("library.table.shippedNote"),
    );
    // A shipped collection's games are not deleted; a collection is deleted from /library.
    expect(screen.queryByTestId("library-picks-delete")).toBeNull();
    // The whole collection downloads from its row on /library; here only the picks do.
    expect(screen.queryByTestId("library-table-download")).toBeNull();
    expect(screen.getByTestId("library-picks-download")).toBeInTheDocument();
  });

  it("sorts by a column, both ways, and keeps it in the URL", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    expect(rowNumbers()).toEqual(["1", "2", "3"]);

    fireEvent.click(screen.getByTestId("library-table-sort-round"));
    expect(rowNumbers()).toEqual(["2", "1", "3"]);
    expect(where()).toContain("sort=round");

    fireEvent.click(screen.getByTestId("library-table-sort-round"));
    expect(rowNumbers()).toEqual(["3", "1", "2"]);

    // A number sorts high first on the first click.
    fireEvent.click(screen.getByTestId("library-table-sort-whiteElo"));
    expect(rowNumbers()).toEqual(["2", "1", "3"]);
  });

  it("filters by words and by result", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);

    fireEvent.change(screen.getByTestId("library-table-filter"), { target: { value: "zed" } });
    expect(rowNumbers()).toEqual(["1", "3"]);
    expect(screen.getByTestId("library-table-count")).toHaveTextContent("2 of 3 games");

    fireEvent.change(screen.getByTestId("library-table-filter"), { target: { value: "nobody" } });
    expect(screen.getByTestId("library-table-empty")).toBeInTheDocument();
  });

  it("opens a game from its row", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    fireEvent.click(screen.getByTestId("library-table-row-2"));
    expect(where()).toBe(`/library/${mine.id}/2`);
    // The players are plated beside the board (CTA-105); the header's own
    // line is the caption.
    expect(await screen.findByTestId("library-game-caption")).toHaveTextContent("Game 2 of 3");
    expect(screen.queryByTestId("library-game-title")).toBeNull();
  });

  it("marks a game its index could not read", async () => {
    const broken = '[Event "Club"]\n[White "Kim"]\n[Black "Lee"]\n[Result "*"]\n\n1. e4 e5 2. Ke3 *';
    const mine = await keep("With a broken game", [GAMES[0], broken]);
    await mountTable(`/library/${mine.id}`);
    expect(screen.getByTestId("library-table-unreadable-2")).toBeInTheDocument();
    expect(screen.queryByTestId("library-table-unreadable-1")).toBeNull();
  });

  it("deletes the picked games of an uploaded collection, asking first", async () => {
    const mine = await upload();
    await mountTable(`/library/${mine.id}`);
    expect(screen.getByTestId("library-picks-delete")).toBeDisabled();
    for (const number of [1, 3]) {
      fireEvent.click(within(screen.getByTestId(`library-picks-row-${number}`)).getByRole("checkbox"));
    }
    fireEvent.click(screen.getByTestId("library-picks-delete"));
    expect(screen.getByTestId("library-picks-delete-dialog")).toHaveTextContent("Delete 2 games?");
    fireEvent.click(screen.getByTestId("library-picks-delete-confirm"));

    await waitFor(() => expect(rowNumbers()).toEqual(["1"]));
    expect(peekUploadedGames(mine.id)).toEqual([GAMES[1]]);
    expect(screen.getByTestId("library-table-count")).toHaveTextContent("1 game");
    expect(screen.queryByTestId("library-picks-selected-count")).toBeNull();
    expect(where()).toBe(`/library/${mine.id}`);
  });

  it("says so for a collection that is not there", async () => {
    mount("/library/nothing-here");
    expect(await screen.findByTestId("library-not-found")).toHaveTextContent(
      i18n.t("library.notFound.collection"),
    );
  });
});

describe("a game on its analysis board", () => {
  it("hands the game to the Analysis Board from its Export tab, at the position on screen", async () => {
    const mine = await upload();
    await mountGame(`/library/${mine.id}/1?at=e4`);
    expect(screen.getByTestId("library-game-arrows")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("library-game-panel-tab-export"));
    expect(screen.getByTestId("library-game-open-analysis")).toHaveAttribute(
      "href",
      `/tools/analysis?game=library%2F${mine.id}%2F1&at=e4`,
    );
  });

  it("switches the next-move arrows from its Moves tab", async () => {
    const mine = await upload();
    await mountGame(`/library/${mine.id}/1`);
    expect(boardOptions().arrows).toHaveLength(1);
    fireEvent.click(screen.getByTestId("library-game-arrows"));
    expect(boardOptions().arrows).toEqual([]);
    fireEvent.click(screen.getByTestId("library-game-panel-tab-engine"));
    // The Moves tab stays mounted, hidden; the Engine tab has no switch of its own.
    expect(screen.getAllByTestId("library-game-arrows")).toHaveLength(1);
    expect(screen.getByTestId("library-game-arrows")).not.toBeVisible();
  });

  it("switches the move marks on the board from its Moves tab (CTA-168)", async () => {
    const marked = await keep("Marked", ['[Event "Club"]\n[White "Amy"]\n[Black "Bob"]\n[Result "*"]\n\n1. e4! e5 *']);
    await mountGame(`/library/${marked.id}/1?at=e4`);
    expect(screen.getByTestId("library-game-move-glyph")).toHaveAttribute("data-square", "e4");
    fireEvent.click(screen.getByRole("switch", { name: "Move marks on the board" }));
    expect(screen.queryByTestId("library-game-move-glyph")).toBeNull();
  });

  it("keeps the move marks switch in a shipped game's copy", async () => {
    await mountGame("/library/capablanca/1");
    fireEvent.click(screen.getByRole("switch", { name: "Move marks on the board" }));
    // 1. e4 is the game's own; 1... c5 is the change.
    drag("e2", "e4");
    drag("c7", "c5");
    fireEvent.click(screen.getByTestId("library-game-save"));
    fireEvent.click(screen.getByTestId("library-game-changes-copy"));
    await waitFor(() => expect(where()).toContain("/tools/analysis?analysis="));
    const [copy] = savedAnalysesSnapshot() ?? [];
    expect(findSavedAnalysis(copy.id)?.showMoveMarks).toBe(false);
  });

  it("is the v2 board, with the explorer's tabs and the engine", async () => {
    const mine = await upload();
    await mountGame(`/library/${mine.id}/1`);
    expect(screen.getByTestId("library-game-board")).toBeInTheDocument();
    expect(boardOptions().id).toBe("library-game");
    for (const tab of ["moves", "map", "info", "export", "engine"]) {
      expect(screen.getByTestId(`library-game-panel-tab-${tab}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("library-game-play")).toBeInTheDocument();
    expect(screen.getByTestId("library-game-caption")).toHaveTextContent("Game 1 of 3");
    expect(screen.getByTestId("library-game-previous")).toHaveAttribute("aria-disabled", "true");
  });

  it("plates each player's result, Elo and name beside the strips", async () => {
    const mine = await upload();
    // Game 2: Amy (White, 1900) beat Bob (Black, no Elo tag).
    await mountGame(`/library/${mine.id}/2`);
    expect(screen.getByTestId("library-game-captured-white-plate-result")).toHaveTextContent("1");
    expect(screen.getByTestId("library-game-captured-white-plate-elo")).toHaveTextContent("1900");
    expect(screen.getByTestId("library-game-captured-white-plate-name")).toHaveTextContent("Amy");
    expect(screen.getByTestId("library-game-captured-black-plate-result")).toHaveTextContent("0");
    expect(screen.queryByTestId("library-game-captured-black-plate-elo")).toBeNull();
    expect(screen.getByTestId("library-game-captured-black-plate-name")).toHaveTextContent("Bob");
  });

  it("plates the half sign on both sides of a draw, and nothing at all for *", async () => {
    const mine = await upload();
    // Game 3: Bob and Zed drew; neither carries an Elo tag.
    await mountGame(`/library/${mine.id}/3`);
    for (const side of ["white", "black"] as const) {
      expect(screen.getByTestId(`library-game-captured-${side}-plate-result`)).toHaveTextContent("½");
      expect(screen.queryByTestId(`library-game-captured-${side}-plate-elo`)).toBeNull();
    }
    const open = await keep(
      "Open",
      ['[Event "Open"]\n[White "Kim"]\n[Black "Lee"]\n[Result "*"]\n\n1. e4 e5 *'],
    );
    // The file's own second-mount pattern: unmount the first screen first, so
    // one board is live, not two slowing the mount of this one.
    cleanupAndMount(`/library/${open.id}/1`);
    await screen.findByTestId("library-game-board");
    for (const side of ["white", "black"] as const) {
      expect(screen.queryByTestId(`library-game-captured-${side}-plate-result`)).toBeNull();
      expect(screen.queryByTestId(`library-game-captured-${side}-plate-separator`)).toBeNull();
    }
    expect(screen.getByTestId("library-game-captured-white-plate-name")).toHaveTextContent("Kim");
  });

  it("puts the top plate on the player the orientation puts at the top, and swaps on flip", async () => {
    const mine = await upload();
    await mountGame(`/library/${mine.id}/2`);
    const blackPlateAbove = () => {
      const black = screen.getByTestId("library-game-captured-black-plate");
      const white = screen.getByTestId("library-game-captured-white-plate");
      return (black.compareDocumentPosition(white) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    };
    // Facing White, the top strip is Black's, so Black's plate is the upper.
    expect(blackPlateAbove()).toBe(true);
    fireEvent.click(screen.getByTestId("board-control-flip"));
    expect(boardOptions().boardOrientation).toBe("black");
    expect(blackPlateAbove()).toBe(false);
  });

  it("updates an uploaded game in place", async () => {
    const mine = await upload();
    await mountGame(`/library/${mine.id}/1?at=e4,e5`);
    expect(boardOptions().position).toBe(AFTER_E4_E5);
    expect(screen.getByTestId("library-game-save")).toBeDisabled();

    drag("g1", "f3");
    fireEvent.click(screen.getByTestId("library-game-save"));
    fireEvent.click(screen.getByTestId("library-game-changes-update"));

    await waitFor(() => expect(peekUploadedGames(mine.id)?.[0]).toContain("2. Nf3"));
    expect(peekUploadedGames(mine.id)).toHaveLength(3);
    await waitFor(() => expect(screen.getByTestId("library-game-save")).toBeDisabled());
  });

  it("saves an uploaded game's copy right after it, and goes on in the copy", async () => {
    const mine = await upload();
    await mountGame(`/library/${mine.id}/1?at=e4,e5`);
    drag("g1", "f3");
    fireEvent.click(screen.getByTestId("library-game-save"));
    fireEvent.click(screen.getByTestId("library-game-changes-copy"));

    await waitFor(() => expect(where()).toContain(`/library/${mine.id}/2`));
    const games = peekUploadedGames(mine.id) ?? [];
    expect(games).toHaveLength(4);
    expect(games[0]).toBe(GAMES[0]);
    expect(games[1]).toContain("2. Nf3");
    expect(where()).toBe(`/library/${mine.id}/2?at=e4%2Ce5%2CNf3`);
  });

  it("keeps a shipped game read-only: its copy goes to Saved analyses", async () => {
    await mountGame("/library/capablanca/1");
    drag("e2", "e4");
    drag("c7", "c5");
    fireEvent.click(screen.getByTestId("library-game-save"));

    expect(screen.getByTestId("library-game-changes-read-only")).toBeInTheDocument();
    expect(screen.queryByTestId("library-game-changes-update")).toBeNull();
    fireEvent.click(screen.getByTestId("library-game-changes-copy"));

    await waitFor(() => expect(where()).toContain("/tools/analysis?analysis="));
    const [copy] = savedAnalysesSnapshot() ?? [];
    expect(copy.name).toBe("Capablanca, Jose – Eschevarria, C. (copy)");
    expect(findSavedAnalysis(copy.id)?.pgn).toContain("1... c5");
    expect(where()).toBe(`/tools/analysis?analysis=${copy.id}`);
  });

  it("discards the changes back to the game as it arrived", async () => {
    const mine = await upload();
    await mountGame(`/library/${mine.id}/1?at=e4,e5`);
    drag("g1", "f3");
    fireEvent.click(screen.getByTestId("library-game-save"));
    fireEvent.click(screen.getByTestId("library-game-changes-discard"));
    expect(boardOptions().position).toBe(AFTER_E4_E5);
    expect(peekUploadedGames(mine.id)?.[0]).toBe(GAMES[0]);
  });

  it("opens at the game's StartPly tag when no ?at= says otherwise", async () => {
    const puzzles = await keep("Puzzles", ['[StartPly "2"]\n[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 *']);
    await mountGame(`/library/${puzzles.id}/1`);
    expect(boardOptions().position).toBe(AFTER_E4_E5);
  });

  it("says so for a game number the collection does not have", async () => {
    const mine = await upload();
    mount(`/library/${mine.id}/9`);
    expect(await screen.findByTestId("library-not-found")).toHaveTextContent(
      i18n.t("library.notFound.game"),
    );
  });
});

describe("a collection's settings (CTA-121)", () => {
  /** Mount the settings of the entry's collection, the form waited for. */
  const mountSettings = async (entry: string) => {
    mount(entry);
    await screen.findByTestId("library-settings-form");
  };

  it("edits the collection's title and description, saving them for the list, the table and the page title", async () => {
    const mine = await upload();
    // The table's header has the gear for an upload; it goes back to the table as it was.
    mount(`/library/${mine.id}`);
    await screen.findByTestId("library-table");
    fireEvent.click(screen.getByTestId("library-table-settings"));
    expect(where()).toBe(`/library/${mine.id}/settings`);

    fireEvent.change(screen.getByTestId("library-settings-form-name"), { target: { value: "  Club nights  " } });
    fireEvent.change(screen.getByTestId("library-settings-form-description"), { target: { value: "Every Tuesday." } });
    fireEvent.click(screen.getByTestId("library-settings-save"));

    await screen.findByTestId("library-table");
    expect(screen.getByTestId("library-table-name")).toHaveTextContent("Club nights");
    expect(screen.getByTestId("library-table-description")).toHaveTextContent("Every Tuesday.");
    expect(uploadedCollectionsSnapshot()?.[0]).toMatchObject({ name: "Club nights", description: "Every Tuesday." });
    // The page title follows the record's name through the shell (`usePageTitle`);
    // outside the shell (this mount) the hook is a no-op, so the header and the
    // list above are what is asserted.
  });

  it("refuses to save a blank title", async () => {
    const mine = await upload();
    await mountSettings(`/library/${mine.id}/settings`);
    fireEvent.change(screen.getByTestId("library-settings-form-name"), { target: { value: "   " } });
    expect(screen.getByTestId("library-settings-save")).toBeDisabled();
    expect(uploadedCollectionsSnapshot()?.[0].name).toBe("Club games");
  });

  it("marks a one-event collection as a tournament — Swiss, the default type when first switched on", async () => {
    const mine = await upload();
    await mountSettings(`/library/${mine.id}/settings`);
    const mark = screen.getByTestId("library-settings-form-tournament-switch");
    expect(mark).toBeEnabled();
    expect(mark).not.toBeChecked();
    // No type is offered while the mark is off.
    expect(screen.queryByTestId("library-settings-form-type-swiss")).toBeNull();

    fireEvent.click(mark);
    expect(screen.getByTestId("library-settings-form-type-swiss")).toBeChecked();
    fireEvent.click(screen.getByTestId("library-settings-save"));

    // Marked, it opens on its tournament view (CTA-142).
    await screen.findByTestId("library-tournament-screen");
    expect(uploadedCollectionsSnapshot()?.[0].tournament).toEqual({ enabled: true, type: "swiss" });
  });

  it("offers every format — Arena among them (CTA-142)", async () => {
    const mine = await upload();
    await mountSettings(`/library/${mine.id}/settings`);
    fireEvent.click(screen.getByTestId("library-settings-form-tournament-switch"));
    for (const format of ["roundRobin", "knockout", "doubleElimination", "match", "teamSwiss", "teamKnockout"]) {
      expect(screen.getByTestId(`library-settings-form-type-${format}`)).toBeEnabled();
    }
    expect(screen.getByTestId("library-settings-form-type-arena")).toBeEnabled();
    expect(screen.getByTestId("library-settings-form-arena-description")).toHaveTextContent(/Best for/);

    fireEvent.click(screen.getByTestId("library-settings-form-type-knockout"));
    fireEvent.click(screen.getByTestId("library-settings-save"));

    await screen.findByTestId("library-tournament-screen");
    expect(uploadedCollectionsSnapshot()?.[0].tournament).toEqual({ enabled: true, type: "knockout" });
  });

  it("keeps the mark off a collection whose games do not share one event, and off an empty one — the reason beside the switch", async () => {
    const mixed = await keep("Mixed", [...GAMES, '[Event "Other"]\n[White "E"]\n[Black "F"]\n\n1. e4 *']);
    await mountSettings(`/library/${mixed.id}/settings`);
    const mark = screen.getByTestId("library-settings-form-tournament-switch");
    expect(mark).toBeDisabled();
    expect(mark).not.toBeChecked();
    expect(mark).toHaveAccessibleDescription(/only when every game in it shares one Event/);
    expect(screen.queryByTestId("library-settings-form-type-swiss")).toBeNull();

    // An empty collection cannot be a tournament either — the same message.
    const empty = await keep("Empty", []);
    cleanupAndMount(`/library/${empty.id}/settings`);
    await screen.findByTestId("library-settings-form");
    expect(screen.getByTestId("library-settings-form-tournament-switch")).toBeDisabled();

    // A mark stored under games that stopped sharing one event reads as off — the stored setting kept.
    await updateCollectionSettings(mixed.id, { tournament: { enabled: true, type: "swiss" } });
    cleanupAndMount(`/library/${mixed.id}/settings`);
    await screen.findByTestId("library-settings-form");
    const kept = screen.getByTestId("library-settings-form-tournament-switch");
    expect(kept).toBeDisabled();
    expect(kept).not.toBeChecked();
    expect(uploadedCollectionsSnapshot()?.find((c) => c.id === mixed.id)?.tournament).toEqual({
      enabled: true,
      type: "swiss",
    });
  });

  it("gives a shipped collection no settings entry — the table no gear, the URL the miss", async () => {
    mount("/library/capablanca");
    await screen.findByTestId("library-table");
    expect(screen.queryByTestId("library-table-settings")).toBeNull();

    cleanupAndMount("/library/capablanca/settings");
    expect(await screen.findByTestId("library-not-found")).toHaveTextContent(
      i18n.t("library.notFound.collection"),
    );
  });
});
