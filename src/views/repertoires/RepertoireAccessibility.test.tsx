import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../i18n";
import { createRepertoireFolder } from "../../lib/savedRepertoireFolderStore";
import { findSavedRepertoire } from "../../lib/savedRepertoireStore";
import { expectNoAxeViolations } from "../../test/axe";
import { renderSection, storeRepertoire } from "./repertoireTestKit";

/*
  The Repertoires section as a screen reader and a keyboard meet it (CTA-113):
  each screen's main states pass axe, its title is the page's h1 over its
  sections' h2s, and its parts are worked from the keyboard.
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

const CARO = ['[Event "My Caro"]', "", "1. e4 c6 2. d4 d5 3. e5 Bf5 (3... c5 4. dxc5) 4. Nf3 *"].join("\n");

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the Repertoires list — accessible", () => {
  it("passes axe as a list with a folder and a repertoire, and as cards", async () => {
    await storeRepertoire("a", CARO, "Caro-Kann");
    await createRepertoireFolder("White");
    await renderSection("/repertoires");
    expect(screen.getByRole("heading", { level: 1, name: "Repertoires" })).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByTestId("repertoires-screen"));
    await userEvent.click(screen.getByTestId("repertoires-view-comfortable"));
    await expectNoAxeViolations(screen.getByTestId("repertoires-screen"));
  });

  it("passes axe empty", async () => {
    await renderSection("/repertoires");
    await expectNoAxeViolations(screen.getByTestId("repertoires-screen"));
  });

  it("names each row's controls for its repertoire, and opens the Games menu from the keyboard", async () => {
    const user = userEvent.setup();
    await storeRepertoire("a", CARO, "Caro-Kann");
    await renderSection("/repertoires");
    expect(screen.getByRole("link", { name: "Open Caro-Kann" })).toHaveAttribute("href", "/repertoires/a");
    const games = screen.getByRole("button", { name: "Games of Caro-Kann" });
    expect(games).toHaveAttribute("aria-haspopup", "menu");
    games.focus();
    await user.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
    expect(games).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});

describe("a repertoire's settings — accessible", () => {
  it("is its page's h1 over a section heading each, passes axe, and saves from the keyboard", async () => {
    const user = userEvent.setup();
    await storeRepertoire("a", CARO, "Caro-Kann");
    await renderSection("/repertoires/a/settings");
    expect(screen.getByRole("heading", { level: 1, name: i18n.t("repertoires.settings.title") })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["General", "Board", "Folder"]);
    await expectNoAxeViolations(screen.getByTestId("repertoire-settings-screen"));

    screen.getByTestId("repertoire-settings-color-white").focus();
    await user.keyboard("{ArrowRight}{Enter}");
    screen.getByRole("switch", { name: i18n.t("repertoires.settings.protected") }).focus();
    await user.keyboard(" ");
    screen.getByRole("textbox", { name: i18n.t("repertoires.settings.name") }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(findSavedRepertoire("a")?.settings).toMatchObject({ color: "black", protected: false }),
    );
  });
});

describe("adding a repertoire — accessible", () => {
  it("is its page's h1, passes axe, and reads a paste from the keyboard", async () => {
    const user = userEvent.setup();
    await renderSection("/repertoires/new");
    expect(screen.getByRole("heading", { level: 1, name: i18n.t("repertoires.upload.title") })).toBeInTheDocument();
    await expectNoAxeViolations(document.body);
    await user.click(screen.getByRole("textbox", { name: i18n.t("repertoires.upload.paste") }));
    await user.paste("not a game at all");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("the repertoire player — accessible", () => {
  it.each(["moves", "map", "settings"])("passes axe on its %s tab", async (tab) => {
    await storeRepertoire("a", CARO, "Caro-Kann");
    await renderSection("/repertoires/a");
    await screen.findByTestId("repertoire-board-panel");
    await userEvent.click(screen.getByTestId(`repertoire-board-panel-tab-${tab}`));
    await expectNoAxeViolations(screen.getByTestId("repertoire-board-panel"));
  });

  it("works its settings tab from the keyboard: the side, Autoplay", async () => {
    const user = userEvent.setup();
    await storeRepertoire("a", CARO, "Caro-Kann");
    await renderSection("/repertoires/a");
    await userEvent.click(await screen.findByTestId("repertoire-board-panel-tab-settings"));
    screen.getByTestId("repertoire-board-side-white").focus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByTestId("repertoire-board-side-black")).toHaveAttribute("aria-pressed", "true");
    const autoplay = screen.getByRole("switch", { name: i18n.t("repertoires.play.autoplay") });
    autoplay.focus();
    await user.keyboard(" ");
    expect(autoplay).toBeChecked();
    expect(screen.getByTestId("repertoire-board-play")).toHaveAttribute("aria-pressed", "true");
  });
});
