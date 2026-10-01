import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../i18n";
import { indexedRowOf } from "../../lib/collectionIndex";
import { addCollection, resetLibraryCollectionStore } from "../../lib/libraryCollectionStore";
import { createLibraryFolder, resetLibraryFolderStore } from "../../lib/libraryFolderStore";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";

/*
  The Library as a screen reader and a keyboard meet it (CTA-113): each
  screen's main states pass axe, its title is the page's h1 over its
  sections' h2s, and its parts are worked from the keyboard.

  A screen as it first opens is not audited here: the browser pass
  (`e2e/a11y/`, every pull request) opens each Library route seeded — the
  list, a collection's table, Add a collection, a game, the settings — and
  runs axe there with colour contrast and target size on. Here axe runs on
  the states it never reaches: a folder opened, picks made, a dialog open, a
  filter leaving nothing, the tournament mark's states (CTA-124).
*/
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});
vi.mock("../../lib/engine", async () => ({
  default: (await import("../board/boardTestHarness")).FakeEngine,
}));
vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../board/boardTestHarness");
  return openingsMock(importOriginal as () => Promise<typeof import("../../lib/openings")>);
});

import CollectionScreen from "./CollectionScreen";
import CollectionSettingsScreen from "./CollectionSettingsScreen";
import LibraryGameScreen from "./LibraryGameScreen";
import LibraryHome from "./LibraryHome";
import LibraryUpload from "./LibraryUpload";

const GAMES = [
  '[Event "Club"]\n[Date "2023.04.02"]\n[White "Zed"]\n[Black "Amy"]\n[Result "0-1"]\n[WhiteElo "1500"]\n[BlackElo "1600"]\n\n1. e4 e5 0-1',
  '[Event "Club"]\n[Date "2023.05.10"]\n[White "Amy"]\n[Black "Bob"]\n[Result "1-0"]\n[WhiteElo "1900"]\n[BlackElo "1700"]\n\n1. d4 d5 2. c4 1-0',
  '[Event "Open"]\n[Date "2024.01.20"]\n[White "Bob"]\n[Black "Zed"]\n[Result "1/2-1/2"]\n\n1. c4 1/2-1/2',
];

const mount = (entry: string) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <Routes>
            <Route path="/library" element={<LibraryHome />} />
            <Route path="/library/new" element={<LibraryUpload />} />
            <Route path="/library/:collectionId" element={<CollectionScreen />} />
            <Route path="/library/:collectionId/settings" element={<CollectionSettingsScreen />} />
            <Route path="/library/:collectionId/:game" element={<LibraryGameScreen />} />
          </Routes>
          <RightPanelOutlet />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const keep = async (name: string, folderId: string | null = null) => {
  const added = await addCollection(name, GAMES, GAMES.map((pgn) => indexedRowOf(pgn)), undefined, undefined, folderId);
  if (!("collection" in added)) throw new Error("not added");
  return added.collection;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
  resetLibraryFolderStore();
  await resetLibraryCollectionStore();
});

describe("the Library home — accessible", () => {
  it("is its page's h1 over a table that passes axe, its folders opened from the keyboard", async () => {
    const user = userEvent.setup();
    const folder = await createLibraryFolder("Openings", null);
    if (folder === undefined) throw new Error("no folder");
    await keep("Club games", folder.id);
    mount("/library");
    expect(await screen.findByRole("heading", { level: 1, name: "Library" })).toBeInTheDocument();
    await screen.findByTestId(`library-folder-${folder.id}`);

    const toggle = screen.getByRole("button", { name: /Openings/, expanded: false });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("link", { name: "Club games" })).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expectNoAxeViolations(document.body);
  });

  it("passes axe with only the built-in collections, filtered to nothing", async () => {
    mount("/library?q=zzzz");
    await screen.findByTestId("library-no-matches");
    await expectNoAxeViolations(document.body);
  });
});

describe("a collection's table — accessible", () => {
  it("is the collection's h1 over the filters' h2, passes axe, and sorts and picks from the keyboard", async () => {
    const user = userEvent.setup();
    const club = await keep("Club games");
    mount(`/library/${club.id}`);
    expect(await screen.findByRole("heading", { level: 1, name: "Club games" })).toBeInTheDocument();
    await screen.findByTestId("library-table-row-1");
    expect(screen.getByRole("heading", { level: 2, name: i18n.t("library.filters.title") })).toBeInTheDocument();

    // Every game is a link named by its players.
    expect(screen.getByRole("link", { name: "Amy – Bob" })).toHaveAttribute("href", `/library/${club.id}/2`);
    // A header sorts from Enter; a pick ticks from Space; select-all is in the header.
    screen.getByTestId("library-table-sort-white").focus();
    await user.keyboard("{Enter}");
    within(screen.getByTestId("library-picks-row-2")).getByRole("checkbox").focus();
    await user.keyboard(" ");
    expect(screen.getByTestId("library-picks-selected-count")).toHaveTextContent("1 selected");
    screen.getByRole("checkbox", { name: i18n.t("library.table.picks.selectAll") }).focus();
    await user.keyboard(" ");
    expect(screen.getByTestId("library-picks-selected-count")).toHaveTextContent("3 selected");
    await expectNoAxeViolations(document.body);

    // The delete asks first, in a dialog that passes axe and closes on Escape.
    await user.click(screen.getByRole("button", { name: i18n.t("library.table.picks.deleteSelected") }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Delete 3 games?");
    await expectNoAxeViolations(dialog);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("passes axe with the filters leaving nothing", async () => {
    const club = await keep("Club games");
    mount(`/library/${club.id}?q=nobody`);
    await screen.findByTestId("library-table-empty");
    await expectNoAxeViolations(document.body);
  });
});

describe("adding a collection — accessible", () => {
  it("is its page's h1, and the import popup a paste opens passes axe", async () => {
    mount("/library/new");
    expect(await screen.findByRole("heading", { level: 1, name: i18n.t("library.upload.title") })).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("library-upload-paste"), { target: { value: GAMES.join("\n\n") } });
    fireEvent.click(screen.getByTestId("library-upload-save"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByTestId("library-import-count")).toHaveTextContent("3 of 3");
    await expectNoAxeViolations(dialog);
  });
});

describe("a Library game — accessible", () => {
  it("works its header from the keyboard", async () => {
    const user = userEvent.setup();
    const club = await keep("Club games");
    mount(`/library/${club.id}/2`);
    await screen.findByTestId("library-game-board");
    const next = screen.getByRole("link", { name: i18n.t("library.game.next") });
    expect(next).toHaveAttribute("href", `/library/${club.id}/3`);
    const engine = screen.getByRole("switch", { name: i18n.t("library.game.engineSwitch") });
    engine.focus();
    await user.keyboard(" ");
    expect(engine).not.toBeChecked();
  });

  it("says a game will not read, with the way back, and passes axe", async () => {
    const broken = '[White "Broken"]\n[Black "Game"]\n\n1. e4 Zz9 *';
    const added = await addCollection("Mixed", [broken], [indexedRowOf(broken)]);
    if (!("collection" in added)) throw new Error("not added");
    mount(`/library/${added.collection.id}/1`);
    expect(await screen.findByTestId("library-game-unreadable")).toHaveTextContent(i18n.t("library.game.unreadable"));
    expect(screen.getByRole("link", { name: i18n.t("library.game.back", { name: "Mixed" }) })).toHaveAttribute(
      "href",
      `/library/${added.collection.id}`,
    );
    await expectNoAxeViolations(document.body);
  });
});

describe("a collection's settings — accessible (CTA-121)", () => {
  it("is its page's h1 over its sections' h2s, and passes axe with the mark off", async () => {
    const club = await keep("Club games");
    mount(`/library/${club.id}/settings`);
    expect(await screen.findByTestId("library-settings-form")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Collection settings" })).toBeInTheDocument();
    for (const section of ["General", "Tournament"]) {
      expect(screen.getByRole("heading", { level: 2, name: section })).toBeInTheDocument();
    }
    expect(screen.getByRole("switch", { name: "Mark as tournament" })).not.toBeChecked();
    await expectNoAxeViolations(document.body);
  });

  it("names the mark by its label and its reason when the games will not allow it, and the types by their names", async () => {
    // GAMES holds two events, so the mark is off with its reason — the message is the switch's description.
    const mixed = await keep("Mixed club");
    mount(`/library/${mixed.id}/settings`);
    const blocked = await screen.findByRole("switch", { name: "Mark as tournament" });
    expect(blocked).toBeDisabled();
    expect(blocked).toHaveAccessibleDescription(/only when every game in it shares one Event/);
    await expectNoAxeViolations(document.body);
  });

  it("marks and types from the keyboard, the reason gone once it is allowed", async () => {
    // One event, so the mark can be switched on: the club's games above are two "Club" events and one "Open".
    const one = '[Event "Club"]\n[Date "2023.04.02"]\n[White "Zed"]\n[Black "Amy"]\n[Result "0-1"]\n\n1. e4 e5 0-1';
    const added = await addCollection("One club", [one], [indexedRowOf(one)]);
    if (!("collection" in added)) throw new Error("not added");
    mount(`/library/${added.collection.id}/settings`);
    const mark = await screen.findByRole("switch", { name: "Mark as tournament" });
    mark.focus();
    await userEvent.keyboard(" ");
    const types = screen.getByRole("radiogroup", { name: "Tournament type" });
    await expectNoAxeViolations(document.body);
    const swiss = within(types).getByRole("radio", { name: "Swiss system" });
    expect(swiss).toBeChecked();
    swiss.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(within(types).getByRole("radio", { name: "Round robin" })).toBeChecked();
    expect(mark).toHaveAccessibleDescription(/standings and crosstables/);
    await expectNoAxeViolations(document.body);
  });
});
