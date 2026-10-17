import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { loadUploadedCollections, loadUploadedGames, uploadedCollectionsSnapshot } from "../../lib/libraryCollectionStore";
import { createLibraryFolder } from "../../lib/libraryFolderStore";
import { downloadPgn } from "../../lib/pgnExport";
import { expectNoAxeViolations } from "../../test/axe";
import { GAMES, keep, mount, mountTable, resetLibrary, upload, where } from "./libraryTestKit";

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

// A collection's limit brought down to a few dozen small games, so a merge past it is cheap to make.
vi.mock("../../lib/libraryCollections", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/libraryCollections")>()),
  MAX_COLLECTION_CHARS: 5_000,
}));

// The index pass, held where a test asks — its Cancel tried while it runs.
const indexing = vi.hoisted(() => ({ hold: false }));
vi.mock("./indexCollection", async (importOriginal) => {
  const real = await importOriginal<typeof import("./indexCollection")>();
  return {
    indexCollection: (games: readonly string[], onProgress: (done: number, total: number) => void, signal?: AbortSignal) => {
      if (!indexing.hold) return real.indexCollection(games, onProgress, signal);
      onProgress(1, games.length);
      return new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("Indexing cancelled", "AbortError"))));
    },
  };
});

/*
  **Collections merged — a direct Library action** (CTA-232): the lobby's
  header's *Merge* (two or more ticked — a ticked folder's among them,
  CTA-235) opens its dialog — a collection page's *Merge with…* gone in
  CTA-235; Merge reads, merges and indexes, then keeps a new collection —
  the result offering Open collection and Download PGN; a merge past the
  Library's limit refused with the upload's words; Cancel while it indexes.
*/

const game = (n: number, white = `White ${n}`) =>
  `[Event "Open"]\n[Round "${n}"]\n[White "${white}"]\n[Black "Black ${n}"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 1-0`;

/** A second upload: one game the first holds word for word, one of its own. */
const keepSpring = () => keep("Spring open", [GAMES[0], game(1)]);

beforeEach(async () => {
  indexing.hold = false;
  vi.mocked(downloadPgn).mockClear();
  await resetLibrary();
});

/** The dialog, once open. */
const mergeDialog = () => screen.findByRole("dialog", { name: "Merge collections" });

describe("Merge in the Library's header, over the picks (CTA-232)", () => {
  it("merges two picked collections into a new one — duplicates left out — then opens it", async () => {
    const user = userEvent.setup();
    const club = await upload();
    const spring = await keepSpring();
    mount("/library");
    await user.click(await screen.findByRole("checkbox", { name: `Pick ${club.name}` }));
    const merge = screen.getByRole("button", { name: "Merge" });
    expect(merge).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: `Pick ${spring.name}` }));
    await user.click(merge);

    const dialog = await mergeDialog();
    const sources = within(dialog).getByRole("list", { name: "Collections to merge" });
    expect(within(sources).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["1.Club games3 games", "2.Spring open2 games"]);
    // The picks are the merge's: no picker in the dialog.
    expect(within(dialog).queryByRole("combobox", { name: "Add a collection" })).toBeNull();
    expect(within(dialog).getByRole("radio", { name: /^Drop exact copies/ })).toBeChecked();
    expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveAttribute("placeholder", "Club games + 1 more");
    await expectNoAxeViolations(dialog);

    await user.click(within(dialog).getByRole("button", { name: "Merge" }));
    const done = await screen.findByRole("dialog", { name: "Collections merged" }, { timeout: 10_000 });
    expect(within(done).getByRole("status")).toHaveTextContent("“Club games + 1 more” holds 4 games.1 duplicate was left out.");

    // A new collection — the sources as they were.
    await loadUploadedCollections();
    const made = uploadedCollectionsSnapshot()?.find((each) => each.name === "Club games + 1 more");
    expect(made?.count).toBe(4);
    expect(await loadUploadedGames(made!.id)).toEqual([...GAMES, game(1)]);
    expect(uploadedCollectionsSnapshot()?.find((each) => each.id === club.id)?.count).toBe(3);

    await user.click(within(done).getByRole("button", { name: "Download PGN" }));
    expect(downloadPgn).toHaveBeenCalledWith("club-games-1-more", [...GAMES, game(1)]);

    await user.click(within(done).getByRole("link", { name: "Open collection" }));
    await waitFor(() => expect(where()).toBe(`/library/${made!.id}`));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("merges the collections under a ticked folder, in the table's order, after those ticked before it (CTA-235)", async () => {
    const user = userEvent.setup();
    const club = await upload();
    const folder = await createLibraryFolder("Spring", null);
    await keep("Spring open", [GAMES[0], game(1)], folder!.id);
    await keep("Spring rapid", [game(2)], folder!.id);
    mount("/library");
    await user.click(await screen.findByRole("checkbox", { name: `Pick ${club.name}` }));
    expect(screen.getByRole("button", { name: "Merge" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Pick Spring" }));
    expect(screen.getByTestId("library-picks-bar")).toHaveTextContent("1 folder and 3 collections picked");
    await user.click(screen.getByRole("button", { name: "Merge" }));

    const sources = within(await mergeDialog()).getByRole("list", { name: "Collections to merge" });
    expect(within(sources).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "1.Club games3 games",
      "2.Spring open2 games",
      "3.Spring rapid1 game",
    ]);
  });

  it("refuses a merge past the Library's limit with the upload's words, and makes nothing", async () => {
    const user = userEvent.setup();
    const big = await keep("Big open", Array.from({ length: 60 }, (_, index) => game(index, `Player ${index}`)));
    const club = await upload();
    mount("/library");
    await user.click(await screen.findByRole("checkbox", { name: `Pick ${big.name}` }));
    await user.click(screen.getByRole("checkbox", { name: `Pick ${club.name}` }));
    await user.click(screen.getByRole("button", { name: "Merge" }));
    const dialog = await mergeDialog();
    await user.click(within(dialog).getByRole("button", { name: "Merge" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "That is too large — a collection can be up to about 100 million characters (some 100,000 games).",
    );
    await loadUploadedCollections();
    expect(uploadedCollectionsSnapshot()).toHaveLength(2);
  });

  it("shows its progress while it indexes, and Cancel stops it — nothing made, the dialog as it was", async () => {
    indexing.hold = true;
    const user = userEvent.setup();
    const club = await upload();
    const spring = await keepSpring();
    mount("/library");
    await user.click(await screen.findByRole("checkbox", { name: `Pick ${club.name}` }));
    await user.click(screen.getByRole("checkbox", { name: `Pick ${spring.name}` }));
    await user.click(screen.getByRole("button", { name: "Merge" }));
    await user.click(within(await mergeDialog()).getByRole("button", { name: "Merge" }));

    const progress = await screen.findByTestId("library-merge-progress");
    expect(progress).toHaveTextContent("Checking the games: 1 of 4");
    await user.click(within(progress).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByTestId("library-merge-progress")).toBeNull());
    expect(await mergeDialog()).toBeInTheDocument();
    await loadUploadedCollections();
    expect(uploadedCollectionsSnapshot()).toHaveLength(2);
  });
});

describe("no Merge with… on a collection's page (CTA-235)", () => {
  it("is on neither view's header — an upload's table, a shipped one's, a tournament's Info tab", async () => {
    const club = await upload();
    await mountTable(`/library/${club.id}`);
    expect(screen.queryByRole("button", { name: "Merge with…" })).toBeNull();
    expect(screen.queryByTestId("library-table-merge-with")).toBeNull();
    cleanup();
    await mountTable("/library/capablanca");
    expect(screen.queryByTestId("library-table-merge-with")).toBeNull();
    cleanup();
    mount("/library/candidates2026");
    await screen.findByTestId("library-tournament-screen");
    expect(screen.queryByTestId("library-table-merge-with")).toBeNull();
  });
});
