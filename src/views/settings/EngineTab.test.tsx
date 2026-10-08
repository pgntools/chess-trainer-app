import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../i18n";
import { ENGINE_STORAGE_KEY, engineChoiceId } from "../../lib/engineChoice";
import { DEFAULT_ENGINE_ID } from "../../lib/engines";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { useEngineChoice } from "../shared/useEngineChoice";
import SettingsScreen from "./SettingsScreen";

/*
  Settings → Engine (CTA-153). The registry is the real one — the shipped
  builds, the multi-thread one unavailable here (jsdom is not cross-origin
  isolated) — so what the tab lists is what the app offers. A second page's
  worth of behaviour — a host that does isolate the page — is `crossOriginIsolated`
  stubbed. No engine is built: nothing here searches.
*/

const renderEngine = () =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/settings/engine"]}>
        <Routes>
          <Route path="/settings/:tab" element={<SettingsScreen />} />
        </Routes>
      </MemoryRouter>
      <ChoiceProbe />
    </AppThemeWithLang>,
  );

/** What a board would read: the engine the reader chose. */
function ChoiceProbe() {
  return <span data-testid="engine-in-use">{useEngineChoice().engineId}</span>;
}

const SINGLE = "Stockfish 19 Lite";
const MULTI = "Stockfish 19 Lite (multi-thread)";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Settings → Engine", () => {
  it("is a tab of Settings, with its own route", () => {
    renderEngine();

    expect(screen.getByTestId("settings-tab-engine")).toHaveAttribute("href", "/settings/engine");
    expect(screen.getByTestId("settings-tab-engine")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("engine-tab")).toBeInTheDocument();
  });

  it("lists every shipped engine with its name, version, threading and strength", () => {
    renderEngine();

    const group = screen.getByRole("radiogroup", { name: "Engine" });
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByTestId("engine-picker-facts-stockfish-19-lite-single")).toHaveTextContent(
      "Version 19 · Single-thread · Strength by Skill Level or Elo",
    );
    expect(screen.getByTestId("engine-picker-facts-stockfish-19-lite-multi")).toHaveTextContent("Multi-thread");
  });

  it("starts on the default engine", () => {
    renderEngine();

    expect(screen.getByRole("radio", { name: SINGLE })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent(DEFAULT_ENGINE_ID);
  });

  it("lists the multi-thread build disabled, with why, where the host does not isolate the page", () => {
    renderEngine();

    expect(screen.getByRole("radio", { name: MULTI })).toBeDisabled();
    expect(screen.getByTestId("engine-picker-reason-stockfish-19-lite-multi")).toHaveTextContent(
      "Needs cross-origin isolation — not available on this host",
    );
  });

  it("makes the multi-thread build selectable where the page is cross-origin isolated", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    renderEngine();

    const multi = screen.getByRole("radio", { name: MULTI });
    expect(multi).toBeEnabled();
    expect(screen.queryByTestId("engine-picker-reason-stockfish-19-lite-multi")).toBeNull();

    await userEvent.click(multi);

    expect(screen.getByTestId("engine-in-use")).toHaveTextContent("stockfish-19-lite-multi");
  });

  it("applies a choice at once — to what every board reads — and keeps it for the next visit", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    renderEngine();

    await userEvent.click(screen.getByRole("radio", { name: MULTI }));

    expect(screen.getByRole("radio", { name: MULTI })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent("stockfish-19-lite-multi");
    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe("stockfish-19-lite-multi");
    expect(engineChoiceId()).toBe("stockfish-19-lite-multi");
  });

  it("opens on the engine stored by an earlier visit", () => {
    vi.stubGlobal("crossOriginIsolated", true);
    localStorage.setItem(ENGINE_STORAGE_KEY, "stockfish-19-lite-multi");

    renderEngine();

    expect(screen.getByRole("radio", { name: MULTI })).toBeChecked();
  });

  it("falls back to the default for a stored engine that no longer exists, without discarding it", () => {
    for (const gone of ["stockfish-9000", "stockfish-2019-wasm"]) {
      localStorage.setItem(ENGINE_STORAGE_KEY, gone);

      const { unmount } = renderEngine();

      expect(screen.getByRole("radio", { name: SINGLE })).toBeChecked();
      expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe(gone);
      unmount();
    }
  });

  it("shows the stored engine as the default while this host cannot run it", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "stockfish-19-lite-multi");

    renderEngine();

    expect(screen.getByRole("radio", { name: SINGLE })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent(DEFAULT_ENGINE_ID);
  });

  it("is operated from the keyboard: an arrow moves the choice", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    renderEngine();

    screen.getByRole("radio", { name: SINGLE }).focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(screen.getByRole("radio", { name: MULTI })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent("stockfish-19-lite-multi");
  });

  it("reads in Hebrew", async () => {
    await i18n.changeLanguage("he");
    renderEngine();

    expect(screen.getByRole("radiogroup", { name: "מנוע" })).toBeInTheDocument();
    expect(screen.getByTestId("engine-picker-reason-stockfish-19-lite-multi")).toHaveTextContent("דורש בידוד בין־מקורות");
  });

  it("passes axe", async () => {
    renderEngine();
    await expectNoAxeViolations();
  });
});
