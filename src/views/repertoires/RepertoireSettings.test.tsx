import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../i18n";
import { createRepertoireFolder } from "../../lib/savedRepertoireFolderStore";
import {
  fileRepertoire,
  findSavedRepertoire,
  savedRepertoiresSnapshot,
} from "../../lib/savedRepertoireStore";
import { boardOptions } from "../board/boardTestHarness";
import { renderSection, storeRepertoire } from "./repertoireTestKit";

/*
  The settings screen, reached the way a reader reaches it — from the list's
  gear or the board's — and judged by what the rest of the section does with
  what it saves: the list's title and description, the board's orientation.
*/
vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});
vi.mock("../../lib/engines/builtin", async (importOriginal) =>
  (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);
vi.mock("../../lib/openings", async (importOriginal) => {
  const { openingsMock } = await import("../board/boardTestHarness");
  return openingsMock(
    importOriginal as () => Promise<typeof import("../../lib/openings")>,
  );
});

const store = (id: string) => storeRepertoire(id);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("a repertoire's settings screen", () => {
  it("edits the title, description and main color, and the list shows them", async () => {
    await store("a");
    await store("b");
    await renderSection("/repertoires");

    await userEvent.click(screen.getByTestId("repertoires-settings-a"));
    expect(screen.getByTestId("repertoire-settings-name")).toHaveValue("My Caro");
    expect(screen.getByTestId("repertoire-settings-color-white")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.change(screen.getByTestId("repertoire-settings-name"), {
      target: { value: "  Caro-Kann for Black " },
    });
    fireEvent.change(screen.getByTestId("repertoire-settings-description"), {
      target: { value: "Advance and Exchange.\n" },
    });
    await userEvent.click(screen.getByTestId("repertoire-settings-color-black"));
    await userEvent.click(screen.getByTestId("repertoire-settings-save"));

    // Back where it came from — the list — with the record edited in place.
    expect(await screen.findByTestId("repertoires-screen")).toBeInTheDocument();
    expect(savedRepertoiresSnapshot()!.map((row) => row.id)).toEqual(["b", "a"]);
    expect(findSavedRepertoire("a")).toMatchObject({
      name: "Caro-Kann for Black",
      settings: { description: "Advance and Exchange.", color: "black" },
    });
    expect(screen.getByTestId("repertoires-item-a")).toHaveTextContent("Caro-Kann for Black");
    expect(screen.getByTestId("repertoires-description-a")).toHaveTextContent(
      "Advance and Exchange.",
    );
  });

  it("keeps whether the board draws the next-move arrows, on by default", async () => {
    await store("a");
    await renderSection("/repertoires/a/settings");
    const toggle = screen.getByTestId("repertoire-settings-show-arrows");
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);
    await userEvent.click(screen.getByTestId("repertoire-settings-save"));
    expect(findSavedRepertoire("a")?.settings.showArrows).toBe(false);

    // The board, opened afresh, draws none.
    await renderSection("/repertoires/a");
    await waitFor(() => expect(boardOptions().id).toBe("repertoire-board"), { timeout: 10_000 });
    await waitFor(() => expect(boardOptions().arrows).toEqual([]));
  });

  it("keeps whether the board colours the arrows by play chance, off by default", async () => {
    await store("a");
    await renderSection("/repertoires/a/settings");
    const toggle = screen.getByTestId("repertoire-settings-chance-arrows");
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);
    await userEvent.click(screen.getByTestId("repertoire-settings-save"));
    expect(findSavedRepertoire("a")?.settings.chanceArrows).toBe(true);
  });

  it("protects a repertoire by default, and saves the reader's no", async () => {
    await store("a");
    await renderSection("/repertoires/a/settings");
    const toggle = screen.getByTestId("repertoire-settings-protected");
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await userEvent.click(screen.getByTestId("repertoire-settings-save"));
    expect(findSavedRepertoire("a")?.settings.protected).toBe(false);
  });

  it("drops the draft on Cancel", async () => {
    await store("a");
    await renderSection("/repertoires");
    await userEvent.click(screen.getByTestId("repertoires-settings-a"));
    fireEvent.change(screen.getByTestId("repertoire-settings-name"), {
      target: { value: "Something else" },
    });
    await userEvent.click(screen.getByTestId("repertoire-settings-cancel"));

    expect(await screen.findByTestId("repertoires-screen")).toBeInTheDocument();
    expect(findSavedRepertoire("a")?.name).toBe("My Caro");
  });

  it("opens the board facing the main color, with the description above the lines", async () => {
    await store("a");
    await renderSection("/repertoires/a/settings");
    await userEvent.click(screen.getByTestId("repertoire-settings-color-black"));
    fireEvent.change(screen.getByTestId("repertoire-settings-description"), {
      target: { value: "Play it from Black." },
    });
    await userEvent.click(screen.getByTestId("repertoire-settings-save"));

    // The write lands, then the board: back on it, its tree read.
    await screen.findByTestId("repertoire-board-details-description");
    await waitFor(() =>
      expect(screen.queryByTestId("repertoire-board-reading")).not.toBeInTheDocument(),
    );
    expect(boardOptions().id).toBe("repertoire-board");
    expect(screen.getByTestId("board")).toHaveAttribute("data-orientation", "black");
    expect(screen.getByTestId("repertoire-board-details-description")).toHaveTextContent(
      "Play it from Black.",
    );
  });

  // CTA-113: the hand-built one-level tree is the design system's picker list
  // (the saved analyses' folder picker's), the chosen row `aria-current`.
  it("offers the folders under Unfiled, preselected where it is filed", async () => {
    await store("a");
    const caro = (await createRepertoireFolder("Caro"))!;
    const slav = (await createRepertoireFolder("Slav"))!;
    await fileRepertoire("a", slav.id);
    await renderSection("/repertoires/a/settings");

    const list = screen.getByRole("list", { name: "Folder" });
    expect(list).toBe(screen.getByTestId("repertoire-settings-folder"));
    const items = within(list).getAllByRole("button");
    expect(items.map((node) => node.dataset.testid)).toEqual([
      "repertoire-settings-folder-unfiled",
      `repertoire-settings-folder-${caro.id}`,
      `repertoire-settings-folder-${slav.id}`,
    ]);
    expect(screen.getByTestId(`repertoire-settings-folder-${slav.id}`)).toHaveAttribute("aria-current", "true");

    await userEvent.click(screen.getByTestId(`repertoire-settings-folder-${caro.id}`));
    await userEvent.click(screen.getByTestId("repertoire-settings-save"));
    expect(findSavedRepertoire("a")?.folderId).toBe(caro.id);
  });

  it("leaves the folder alone on Cancel", async () => {
    await store("a");
    const caro = (await createRepertoireFolder("Caro"))!;
    await renderSection("/repertoires/a/settings");
    expect(screen.getByTestId("repertoire-settings-folder-unfiled")).toHaveAttribute("aria-current", "true");

    await userEvent.click(screen.getByTestId(`repertoire-settings-folder-${caro.id}`));
    await userEvent.click(screen.getByTestId("repertoire-settings-cancel"));
    expect(findSavedRepertoire("a")?.folderId).toBeNull();
  });

  it("says so for an id this browser does not hold", async () => {
    await renderSection("/repertoires/nope/settings");
    expect(screen.getByTestId("repertoire-settings-missing")).toBeInTheDocument();
  });
});

describe("the player's settings popup (CTA-206)", () => {
  const ready = () =>
    waitFor(() => expect(screen.queryByTestId("repertoire-board-reading")).not.toBeInTheDocument());

  it("opens from the left panel's gear, says they are permanent, and saves them in place", async () => {
    await store("a");
    await renderSection("/repertoires/a");
    await ready();
    expect(screen.getByTestId("board")).toHaveAttribute("data-orientation", "white");

    const gear = screen.getByRole("button", { name: "Repertoire settings" });
    expect(gear).toHaveAttribute("aria-haspopup", "dialog");
    await userEvent.click(gear);
    const dialog = screen.getByRole("dialog", { name: "Repertoire settings" });
    // Unlike the Settings tab beside the board, these are kept with the repertoire.
    expect(within(dialog).getByTestId("repertoire-settings-dialog-note")).toHaveTextContent(
      i18n.t("repertoires.settings.permanentNote"),
    );
    expect(within(dialog).getByTestId("repertoire-settings-name")).toHaveValue("My Caro");

    fireEvent.change(within(dialog).getByTestId("repertoire-settings-name"), { target: { value: " Caro-Kann " } });
    fireEvent.change(within(dialog).getByTestId("repertoire-settings-description"), {
      target: { value: "Play it from Black." },
    });
    await userEvent.click(within(dialog).getByTestId("repertoire-settings-color-black"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    // Written, the popup closed, the reader still on the board.
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Repertoire settings" })).not.toBeInTheDocument());
    expect(findSavedRepertoire("a")?.name).toBe("Caro-Kann");
    expect(findSavedRepertoire("a")?.settings.color).toBe("black");
    expect(screen.getByRole("heading", { name: "Caro-Kann" })).toBeInTheDocument();
    expect(screen.getByTestId("repertoire-board-details-description")).toHaveTextContent("Play it from Black.");
    // The session keeps its side; the main colour is what the board opens facing next time.
    expect(screen.getByTestId("board")).toHaveAttribute("data-orientation", "white");
    cleanup();
    await renderSection("/repertoires/a");
    await ready();
    expect(screen.getByTestId("board")).toHaveAttribute("data-orientation", "black");
  });

  it("drops the draft on Cancel, and starts afresh from the record when opened again", async () => {
    await store("a");
    await renderSection("/repertoires/a");
    await ready();
    const before = savedRepertoiresSnapshot();

    await userEvent.click(screen.getByRole("button", { name: "Repertoire settings" }));
    fireEvent.change(screen.getByTestId("repertoire-settings-name"), { target: { value: "Something else" } });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Repertoire settings" })).not.toBeInTheDocument());
    expect(savedRepertoiresSnapshot()).toBe(before);

    await userEvent.click(screen.getByRole("button", { name: "Repertoire settings" }));
    expect(screen.getByTestId("repertoire-settings-name")).toHaveValue("My Caro");
  });
});
