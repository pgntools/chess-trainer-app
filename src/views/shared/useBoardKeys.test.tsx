import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../i18n";
import { InlinePgnGame } from "../home/frontPage/InlinePgnGame";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../board/boardTestHarness");
  return reactChessboardMock();
});

const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *";

/** Two boards on one page, as an article has them — each opened at 1... e5. */
const renderPage = () =>
  render(
    <>
      <InlinePgnGame pgn={PGN} start="1..." caption="Board A" />
      <p>Words between the boards.</p>
      <InlinePgnGame pgn={PGN} start="1..." caption="Board B" />
      <input aria-label="A field" />
    </>,
  );

const board = (name: string) => screen.getByRole("group", { name });
const onScreen = (name: string) => board(name).querySelector('[data-testid$="-on-screen"]')?.textContent;

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBoardKeys — the keyboard on a page of boards (CTA-126)", () => {
  it("steps only the board the reader last touched, and rings it", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(board("Board A"));
    expect(board("Board A")).toHaveAttribute("data-keys-active", "true");
    expect(board("Board B")).not.toHaveAttribute("data-keys-active");

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(onScreen("Board A")).toBe("2... Nc6");
    expect(onScreen("Board B")).toBe("1... e5");

    // Touching the other board hands the keys over.
    await user.click(board("Board B"));
    await user.keyboard("{ArrowLeft}");
    expect(onScreen("Board B")).toBe("1. e4");
    expect(onScreen("Board A")).toBe("2... Nc6");
    expect(board("Board A")).not.toHaveAttribute("data-keys-active");
  });

  it("follows the focus: tabbing into a board's moves makes it the one", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(board("Board A"));
    (board("Board B").querySelector("button[aria-label='2. Nf3']") as HTMLButtonElement).focus();
    await user.keyboard("{ArrowRight}");
    expect(onScreen("Board B")).toBe("2. Nf3");
    expect(onScreen("Board A")).toBe("1... e5");
  });

  it("goes to the window's ends with Home and End only from inside the board — elsewhere they scroll the page", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(board("Board A"));
    await user.keyboard("{End}");
    expect(onScreen("Board A")).toBe("3... a6");
    await user.keyboard("{Home}");
    expect(onScreen("Board A")).toBe("The start");

    // Focus on the page's body: ← / → still drive the board, Home / End are the page's.
    (document.activeElement as HTMLElement).blur();
    await user.keyboard("{ArrowRight}");
    expect(onScreen("Board A")).toBe("1. e4");
    await user.keyboard("{End}");
    expect(onScreen("Board A")).toBe("1. e4");
  });

  it("travels the branch with Home / End and the window with PgUp / PgDown — the last two too only from inside (CTA-165)", async () => {
    const user = userEvent.setup();
    render(
      <InlinePgnGame
        pgn="1. e4 e5 (1... c5 2. Nf3 d6) 2. Nf3 Nc6 3. Bb5 a6 *"
        start="1. e4 c5 2. Nf3"
        caption="Board C"
      />,
    );
    await user.click(board("Board C"));
    expect(board("Board C")).toHaveAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight Home End PageUp PageDown");
    expect(onScreen("Board C")).toBe("2. Nf3");

    // Home: the side line's first move, then out to the mainline's start — here the window's.
    await user.keyboard("{Home}");
    expect(onScreen("Board C")).toBe("1... c5");
    await user.keyboard("{End}");
    expect(onScreen("Board C")).toBe("2... d6");
    await user.keyboard("{Home}{Home}");
    expect(onScreen("Board C")).toBe("The start");

    await user.keyboard("{PageDown}");
    expect(onScreen("Board C")).toBe("3... a6");
    await user.keyboard("{PageUp}");
    expect(onScreen("Board C")).toBe("The start");

    // From the page's body, PgUp / PgDown are the page's.
    (document.activeElement as HTMLElement).blur();
    await user.keyboard("{PageDown}");
    expect(onScreen("Board C")).toBe("The start");
  });

  it("leaves the keys alone in a field, and with a modifier held", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(board("Board A"));
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}{Alt>}{ArrowRight}{/Alt}");
    expect(onScreen("Board A")).toBe("1... e5");
    await user.click(screen.getByRole("textbox", { name: "A field" }));
    await user.keyboard("{ArrowRight}");
    expect(onScreen("Board A")).toBe("1... e5");
  });

  it("with no board touched yet, gives ← / → to the first board in view", async () => {
    const user = userEvent.setup();
    renderPage();
    // jsdom lays nothing out: put Board A above the viewport, Board B in it.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const top = this.getAttribute("aria-label") === "Board A" ? -900 : 100;
      return { top, bottom: top + 400, height: 400, left: 0, right: 400, width: 400, x: 0, y: top, toJSON: () => ({}) };
    });
    await user.keyboard("{ArrowRight}");
    expect(onScreen("Board B")).toBe("2. Nf3");
    expect(onScreen("Board A")).toBe("1... e5");
    expect(board("Board B")).toHaveAttribute("data-keys-active", "true");
  });
});
