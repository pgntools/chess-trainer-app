import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import i18n from "../../i18n";
import { readEngineSearchSettings } from "../../lib/engineSearchSettings";
import { expectNoAxeViolations } from "../../test/axe";
import { stubReducedMotion } from "../../test/reducedMotion";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { usePublishBoardEngineState, type BoardEngineState } from "./boardEngineState";
import { EngineMenu } from "./EngineMenu";

/*
  The top bar's Engine menu (CTA-181): the search settings every board uses,
  the engine running and its preset, and the board on screen's engine as the
  icon's state.
*/

/** A board, as far as the top bar can tell: what its engine is doing. */
function Board({ state }: { state: BoardEngineState }) {
  usePublishBoardEngineState(state);
  return null;
}

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

const mount = (board?: BoardEngineState) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/tools/analysis"]}>
        <EngineMenu />
        <Routes>
          <Route path="/tools/analysis" element={board === undefined ? null : <Board state={board} />} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const button = () => screen.getByTestId("header-engine");
const icon = () => screen.getByTestId("header-engine-icon");

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the top bar's Engine menu (CTA-181)", () => {
  it("is a named button that opens a dialog, neutral on a screen with no board", () => {
    mount();
    expect(screen.getByRole("button", { name: "Engine settings — engine off" })).toBe(button());
    expect(button()).toHaveAttribute("aria-haspopup", "dialog");
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(icon()).toHaveAttribute("data-state", "none");
    expect(button()).not.toHaveClass("MuiIconButton-colorPrimary");
  });

  it("opens by keyboard on the search settings, the engine and its preset — and a change is everyone's", async () => {
    const user = userEvent.setup();
    mount();
    button().focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Engine" });
    expect(button()).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByTestId("engine-menu-engine")).toHaveTextContent("Stockfish 19 Lite");
    expect(within(dialog).getByTestId("engine-menu-preset")).toHaveTextContent("Default");
    // The default engine runs on one thread: fixed, and said.
    expect(within(dialog).getByRole("slider", { name: "Threads" })).toBeDisabled();

    within(dialog).getByRole("slider", { name: "Search depth" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(readEngineSearchSettings().depth).toBe(21);
    await user.click(within(dialog).getByRole("switch", { name: "Infinite analysis" }));
    expect(readEngineSearchSettings().infinite).toBe(true);
    await expectNoAxeViolations(dialog);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(button()).toHaveFocus();
  });

  it("links to Settings → Engine, and closes on the way", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(button());
    await user.click(await screen.findByRole("link", { name: "Change the engine or its preset in Settings → Engine" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/settings/engine");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows the board on screen's engine: off neutral, on in the theme's colour, searching breathing", () => {
    const { unmount } = mount("off");
    expect(icon()).toHaveAttribute("data-state", "off");
    expect(button()).not.toHaveClass("MuiIconButton-colorPrimary");
    unmount();

    const on = mount("on");
    expect(screen.getByRole("button", { name: "Engine settings — engine on" })).toHaveClass("MuiIconButton-colorPrimary");
    expect(icon()).toHaveAttribute("data-breathing", "false");
    on.unmount();

    mount("searching");
    expect(screen.getByRole("button", { name: "Engine settings — engine searching" })).toHaveClass("MuiIconButton-colorPrimary");
    expect(icon()).toHaveAttribute("data-breathing", "true");
  });

  it("stays still while searching when the reader asks for reduced motion", () => {
    stubReducedMotion();
    mount("searching");
    expect(icon()).toHaveAttribute("data-state", "searching");
    expect(icon()).toHaveAttribute("data-breathing", "false");
  });

  it("mirrors under Hebrew — the menu opens on the inline end, in the reader's direction", async () => {
    await i18n.changeLanguage("he");
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: i18n.t("engineMenu.label.off") }));
    const dialog = await screen.findByRole("dialog", { name: i18n.t("engineMenu.title") });
    expect(dialog.closest("[dir]")).toHaveAttribute("dir", "rtl");
    await expectNoAxeViolations(dialog);
  });
});
