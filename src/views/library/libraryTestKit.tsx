/**
 * What the Library's screen tests share — not a test file itself (CTA-124).
 *
 * The Library's screens were one test file, `Library.test.tsx`; it is four
 * now, by what each screen does (`Library`, `LibraryFilters`, `LibraryPicks`,
 * `LibraryImport`), so the suite's shards and workers can share what was its
 * longest file. Each mounts every Library route the same way, through this.
 * The stand-ins (`react-chessboard`, the engine, the opening book, the
 * download) are each test file's own `vi.mock`s — a mock is hoisted only in
 * the file that declares it.
 */
import { strToU8, zipSync } from "fflate";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import i18n from "../../i18n";
import { indexedRowOf, type IndexedRow } from "../../lib/collectionIndex";
import { addCollection, resetLibraryCollectionStore } from "../../lib/libraryCollectionStore";
import { resetLibraryFolderStore } from "../../lib/libraryFolderStore";
import { collectionRowOf, readCollectionText } from "../../lib/libraryCollections";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { boardOptions, FakeEngine } from "../board/boardTestHarness";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";
import CollectionScreen from "./CollectionScreen";
import CollectionSettingsScreen from "./CollectionSettingsScreen";
import LibraryGameScreen from "./LibraryGameScreen";
import LibraryHome from "./LibraryHome";
import LibraryUpload from "./LibraryUpload";

export const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

export const GAMES = [
  '[Event "Club"]\n[Round "2"]\n[White "Zed"]\n[Black "Amy"]\n[Result "0-1"]\n[WhiteElo "1500"]\n\n1. e4 e5 0-1',
  '[Event "Club"]\n[Round "1"]\n[White "Amy"]\n[Black "Bob"]\n[Result "1-0"]\n[WhiteElo "1900"]\n\n1. d4 d5 2. c4 1-0',
  '[Event "Club"]\n[Round "10"]\n[White "Bob"]\n[Black "Zed"]\n[Result "1/2-1/2"]\n\n1. c4 1/2-1/2',
];

/** Where the router is — the path and the query the screens wrote. */
export const where = () => screen.getByTestId("where").textContent ?? "";

export const mount = (entry: string) => {
  // The probe `where()` reads; declared here so the kit exports no component (react-refresh's rule).
  const Where = () => {
    const location = useLocation();
    return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
  };
  return render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <Routes>
            <Route path="/library" element={<LibraryHome />} />
            <Route path="/library/new" element={<LibraryUpload />} />
            <Route path="/library/:collectionId" element={<CollectionScreen />} />
            <Route path="/library/:collectionId/settings" element={<CollectionSettingsScreen />} />
            <Route path="/library/:collectionId/:game" element={<LibraryGameScreen />} />
            <Route path="*" element={<div data-testid="elsewhere" />} />
          </Routes>
          <Where />
          <RightPanelOutlet />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );
};

export const keep = async (name: string, games: string[], folderId: string | null = null, at?: string) => {
  const added = await addCollection(
    name,
    games,
    games.map((pgn) => indexedRowOf(pgn)),
    at === undefined ? undefined : new Date(at),
    undefined,
    folderId,
  );
  if (!("collection" in added)) throw new Error("not added");
  return added.collection;
};
export const upload = () => keep("Club games", GAMES);

/** Type into one of the panel's autocompletes. */
export const typeInto = (testId: string, value: string) =>
  fireEvent.change(within(screen.getByTestId(testId)).getByRole("combobox"), { target: { value } });

/** Import from the popup a file or a paste opens (CTA-103), with no filter set. */
export const confirmImport = async () => {
  fireEvent.click(await screen.findByTestId("library-import-confirm"));
};

/** Pick a file in `/library/new`'s file input. */
export const pickFile = (file: File) =>
  fireEvent.change(screen.getByTestId("library-upload-input"), { target: { files: [file] } });

/** A zip of these files, as a picked `File`. */
export const zipOf = (files: Record<string, string>, name = "Club_Games.zip") =>
  new File(
    [zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)]))) as BlobPart],
    name,
    { type: "application/zip" },
  );

/** The real 5,722-game fixture as an upload — its tags' rows (the chess.js pass would take a minute). */
export const keepCarlsen = async () => {
  // Imported only when asked for: some 5 MB of text no other test needs.
  const { default: text } = await import("../../test/fixtures/pgn/Carlsen.pgn?raw");
  const reading = readCollectionText(text);
  if (!reading.ok) throw new Error("the fixture did not read");
  const rows = reading.games.map((pgn): IndexedRow => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { number, ...row } = collectionRowOf(pgn, 0);
    return row;
  });
  const added = await addCollection("Carlsen", reading.games, rows);
  if (!("collection" in added)) throw new Error("not added");
  return { games: reading.games, rows, id: added.collection.id };
};

/** Unmount what is on screen and mount another entry. */
export const cleanupAndMount = (entry: string) => {
  cleanup();
  mount(entry);
};

/** Mount a collection's table and wait for its rows. */
export const mountTable = async (entry: string) => {
  mount(entry);
  await screen.findByTestId("library-table");
};

/** Mount a game and wait for its board. */
export const mountGame = async (entry: string) => {
  mount(entry);
  await screen.findByTestId("library-game-board");
};

export const drag = (from: string, to: string) => {
  act(() => {
    boardOptions().onPieceDrop!({ sourceSquare: from, targetSquare: to });
  });
};

/** The table's rows, as their `#` numbers, in the order on screen — the empty row (a table row since CTA-113) is none. */
export const rowNumbers = () =>
  within(screen.getByTestId("library-table"))
    .getAllByRole("row")
    .map((row) => row.getAttribute("data-testid") ?? "")
    .filter((id) => id.startsWith("library-table-row-"))
    .map((id) => id.replace("library-table-row-", ""));

/** What every Library test starts from: no folder, no upload, no engine history, English. */
export const resetLibrary = async () => {
  localStorage.clear();
  resetLibraryFolderStore();
  await resetLibraryCollectionStore();
  FakeEngine.reset();
  await i18n.changeLanguage("en");
};
