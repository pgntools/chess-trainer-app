import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import i18n from "../../i18n";
import { readStoredEngineId } from "../../lib/engineChoice";
import { selectedPresetOf } from "../../lib/enginePresets";
import {
  createEnginePreset,
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  loadEnginePresets,
  loadEnginePresetSelections,
  settledEnginePresets,
} from "../../lib/enginePresetStore";
import { readEngineSearchSettings, storeEngineSearchSettings } from "../../lib/engineSearchInEffect";
import { DEFAULT_ENGINE_ID } from "../../lib/engines";
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

const mount = (board?: BoardEngineState, compact = false) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/tools/analysis"]}>
        <EngineMenu compact={compact} />
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
  vi.unstubAllGlobals();
});

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(button());
  return screen.findByRole("dialog", { name: "Engine" });
};

describe("the top bar's Engine menu (CTA-181)", () => {
  it("is a named button that opens a dialog, neutral on a screen with no board", () => {
    mount();
    expect(screen.getByRole("button", { name: "Engine settings — engine off" })).toBe(button());
    expect(button()).toHaveAttribute("aria-haspopup", "dialog");
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(icon()).toHaveAttribute("data-state", "none");
    expect(button()).not.toHaveClass("MuiButton-colorPrimary");
  });

  it("is a robot and \"Engine\", drawn as the language switch is — the robot alone under the breakpoint (CTA-185)", () => {
    const { unmount } = mount();
    expect(button()).toHaveTextContent("Engine");
    expect(button()).toHaveClass("MuiButton-outlined");
    expect(within(icon()).getByTestId("SmartToyRoundedIcon")).toBeInTheDocument();
    // Neutral, the robot at the language switch's 0.56.
    expect(icon()).toHaveStyle({ opacity: "0.56" });
    unmount();

    mount(undefined, true);
    expect(button()).toHaveTextContent("");
    // The words stay in its name; alone, the robot is drawn in full.
    expect(screen.getByRole("button", { name: "Engine settings — engine off" })).toBe(button());
    expect(icon()).toHaveStyle({ opacity: "1" });
  });

  it("opens by keyboard on the search settings, the engine and its preset — and a change is everyone's", async () => {
    const user = userEvent.setup();
    mount();
    button().focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Engine" });
    expect(button()).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("combobox", { name: "Engine" })).toHaveTextContent("Stockfish 19 Lite");
    expect(within(dialog).getByRole("combobox", { name: "Preset" })).toHaveTextContent("Default");
    // The default engine runs on one thread: fixed, and said.
    expect(within(dialog).getByRole("slider", { name: "Threads" })).toBeDisabled();

    within(dialog).getByRole("slider", { name: "Search depth" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(readEngineSearchSettings().depth).toBe(21);
    // No infinite analysis: every search stops at its depth or move time (CTA-185).
    expect(within(dialog).queryByRole("switch")).toBeNull();
    await expectNoAxeViolations(dialog);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(button()).toHaveFocus();
  });

  it("links to Settings → Engine, and closes on the way", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(button());
    await user.click(await screen.findByRole("link", { name: "Settings" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/settings/engine");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows the board on screen's engine: off neutral, on in the theme's colour, searching breathing", () => {
    const { unmount } = mount("off");
    expect(icon()).toHaveAttribute("data-state", "off");
    expect(button()).not.toHaveClass("MuiButton-colorPrimary");
    unmount();

    const on = mount("on");
    expect(screen.getByRole("button", { name: "Engine settings — engine on" })).toHaveClass("MuiButton-colorPrimary");
    expect(icon()).toHaveAttribute("data-breathing", "false");
    on.unmount();

    mount("searching");
    expect(screen.getByRole("button", { name: "Engine settings — engine searching" })).toHaveClass("MuiButton-colorPrimary");
    expect(icon()).toHaveAttribute("data-breathing", "true");
  });

  describe("the engine and its preset, chosen in the menu (CTA-185)", () => {
    it("changes the engine every board uses — as Settings → Engine does — one this page cannot run disabled", async () => {
      const user = userEvent.setup();
      mount();
      const dialog = await openMenu(user);
      await user.click(within(dialog).getByRole("combobox", { name: "Engine" }));
      // Not cross-origin isolated (jsdom): the multi-thread build is listed, and cannot be chosen.
      expect(screen.getByRole("option", { name: /Stockfish 19 Lite \(multi-thread\)/ })).toHaveAttribute("aria-disabled", "true");
      await user.keyboard("{Escape}");
      expect(readStoredEngineId()).toBeUndefined();
    });

    it("stores the engine chosen where the page can run it", async () => {
      vi.stubGlobal("crossOriginIsolated", true);
      const user = userEvent.setup();
      mount();
      const dialog = await openMenu(user);
      await user.click(within(dialog).getByRole("combobox", { name: "Engine" }));
      await user.click(screen.getByRole("option", { name: "Stockfish 19 Lite (multi-thread) (19)" }));
      expect(readStoredEngineId()).toBe("stockfish-19-lite-multi");
      expect(within(dialog).getByRole("combobox", { name: "Engine" })).toHaveTextContent("Stockfish 19 Lite (multi-thread) (19)");
    });

    it("selects a preset for the engine running, as Settings → Engine's presets section does", async () => {
      const made = await createEnginePreset("deep-search");
      if (!("id" in made)) throw new Error("the preset was not made");
      await Promise.all([loadEnginePresets(), loadEnginePresetSelections()]);
      const user = userEvent.setup();
      mount();
      const dialog = await openMenu(user);
      const preset = within(dialog).getByRole("combobox", { name: "Preset" });
      expect(preset).toHaveTextContent("Default");
      await user.click(preset);
      await user.click(await screen.findByRole("option", { name: "deep-search" }));
      await waitFor(() =>
        expect(selectedPresetOf(enginePresetsSnapshot() ?? [], enginePresetSelectionsSnapshot() ?? [], DEFAULT_ENGINE_ID).id).toBe(made.id),
      );
      expect(within(dialog).getByRole("combobox", { name: "Preset" })).toHaveTextContent("deep-search");
    });
  });

  describe("depth and move time — the preset's (CTA-185)", () => {
    it("shows the chosen preset's depth and move time, and switches them with the preset", async () => {
      const made = await createEnginePreset("deep-search", {}, {}, { depth: 34, moveTimeMs: 300000 });
      if (!("id" in made)) throw new Error("the preset was not made");
      await Promise.all([loadEnginePresets(), loadEnginePresetSelections()]);
      const user = userEvent.setup();
      mount();
      const dialog = await openMenu(user);
      const depth = () => within(dialog).getByRole("spinbutton", { name: "Search depth, typed" });
      const moveTime = () => within(dialog).getByRole("spinbutton", { name: "Move time in seconds, typed" });
      // Default's: depth 20, no time limit.
      expect(depth()).toHaveValue(20);
      expect(moveTime()).toBeDisabled();
      await user.click(within(dialog).getByRole("combobox", { name: "Preset" }));
      await user.click(await screen.findByRole("option", { name: "deep-search" }));
      await waitFor(() => expect(depth()).toHaveValue(34));
      expect(moveTime()).toHaveValue(300);
      expect(readEngineSearchSettings()).toMatchObject({ depth: 34, moveTimeMs: 300000 });
    });

    it("writes a depth set in the menu into the preset — never into the preference", async () => {
      await Promise.all([loadEnginePresets(), loadEnginePresetSelections()]);
      const user = userEvent.setup();
      mount();
      const dialog = await openMenu(user);
      within(dialog).getByRole("slider", { name: "Search depth" }).focus();
      await user.keyboard("{ArrowLeft}");
      expect(readEngineSearchSettings().depth).toBe(19);
      await settledEnginePresets();
      expect(selectedPresetOf(enginePresetsSnapshot() ?? [], enginePresetSelectionsSnapshot() ?? [], DEFAULT_ENGINE_ID).search).toEqual({
        depth: 19,
        moveTimeMs: 0,
      });
      expect(localStorage.getItem("chessapp.engineSettings")).toBeNull();
    });
  });

  describe("depth and move time typed (CTA-185)", () => {
    it("takes a depth typed — past the slider's 50, held to 99 — in step with its slider", async () => {
      const user = userEvent.setup();
      mount();
      const dialog = await openMenu(user);
      const box = within(dialog).getByRole("spinbutton", { name: "Search depth, typed" });
      await user.clear(box);
      await user.type(box, "33");
      expect(readEngineSearchSettings().depth).toBe(33);
      expect(within(dialog).getByRole("slider", { name: "Search depth" })).toHaveAttribute("aria-valuenow", "33");
      expect(within(dialog).getByRole("slider", { name: "Search depth" })).toHaveAttribute("aria-valuemax", "50");
      await user.clear(box);
      await user.type(box, "77");
      expect(readEngineSearchSettings().depth).toBe(77);
      // The slider shows it at its end; the box keeps the number.
      expect(within(dialog).getByRole("slider", { name: "Search depth" })).toHaveAttribute("aria-valuenow", "50");
      await user.clear(box);
      await user.type(box, "150");
      expect(readEngineSearchSettings().depth).toBe(99);
    });

    it("keeps the move-time box off on ∞, and takes seconds typed once the slider leaves it", async () => {
      const user = userEvent.setup();
      mount();
      const dialog = await openMenu(user);
      const box = within(dialog).getByRole("spinbutton", { name: "Move time in seconds, typed" });
      // The default is no limit — the ∞ mark.
      expect(box).toBeDisabled();
      expect(within(dialog).getByRole("spinbutton", { name: "Search depth, typed" })).toBeEnabled();

      within(dialog).getByRole("slider", { name: "Move time" }).focus();
      await user.keyboard("{ArrowLeft}");
      expect(readEngineSearchSettings().moveTimeMs).toBe(600000);
      expect(box).toBeEnabled();
      expect(box).toHaveValue(600);
      await user.clear(box);
      await user.type(box, "12.5");
      expect(readEngineSearchSettings().moveTimeMs).toBe(12500);
      // 12.5 s falls between the 10 and 30 marks, an eighth of the way.
      expect(within(dialog).getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuenow", "2.125");
    });

    it("shows a move time stored elsewhere in its box", async () => {
      storeEngineSearchSettings({ moveTimeMs: 5000 });
      const user = userEvent.setup();
      mount();
      const dialog = await openMenu(user);
      expect(within(dialog).getByRole("spinbutton", { name: "Move time in seconds, typed" })).toHaveValue(5);
    });
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
