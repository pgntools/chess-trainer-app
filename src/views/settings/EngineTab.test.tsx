import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../i18n";
import { ENGINE_STORAGE_KEY, engineChoiceId } from "../../lib/engineChoice";
import type { EngineDescriptor, EngineHandle } from "../../lib/engineTypes";
import { DEFAULT_ENGINE_ID, registerEngine } from "../../lib/engines";
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

const removers: (() => void)[] = [];

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  removers.splice(0).forEach((remove) => remove());
  vi.unstubAllGlobals();
});

describe("Settings → Engine", () => {
  it("is a tab of Settings, with its own route", () => {
    renderEngine();

    expect(screen.getByTestId("settings-tab-engine")).toHaveAttribute("href", "/settings/engine");
    expect(screen.getByTestId("settings-tab-engine")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("engine-tab")).toBeInTheDocument();
  });

  it("lists every registered engine with its name, version, threading and strength", () => {
    renderEngine();

    const group = screen.getByRole("radiogroup", { name: "Engine" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByTestId("engine-picker-facts-stockfish-2019-wasm")).toHaveTextContent(
      "Version 2019-08-15 · Single-thread · Strength by Skill Level",
    );
    expect(screen.getByTestId("engine-picker-facts-stockfish-19-lite-single")).toHaveTextContent(
      "Single-thread · Strength by Skill Level or Elo",
    );
    expect(screen.getByTestId("engine-picker-facts-stockfish-19-lite-multi")).toHaveTextContent("Multi-thread");
  });

  it("starts on the default engine", () => {
    renderEngine();

    expect(screen.getByRole("radio", { name: "Stockfish 2019" })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent(DEFAULT_ENGINE_ID);
  });

  it("lists the multi-thread build disabled, with why, where the host does not isolate the page", () => {
    renderEngine();

    expect(screen.getByRole("radio", { name: "Stockfish 19 Lite (multi-thread)" })).toBeDisabled();
    expect(screen.getByTestId("engine-picker-reason-stockfish-19-lite-multi")).toHaveTextContent(
      "Needs cross-origin isolation — not available on this host",
    );
  });

  it("makes the multi-thread build selectable where the page is cross-origin isolated", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    renderEngine();

    const multi = screen.getByRole("radio", { name: "Stockfish 19 Lite (multi-thread)" });
    expect(multi).toBeEnabled();
    expect(screen.queryByTestId("engine-picker-reason-stockfish-19-lite-multi")).toBeNull();

    await userEvent.click(multi);

    expect(screen.getByTestId("engine-in-use")).toHaveTextContent("stockfish-19-lite-multi");
  });

  it("applies a choice at once — to what every board reads — and keeps it for the next visit", async () => {
    renderEngine();

    await userEvent.click(screen.getByRole("radio", { name: "Stockfish 19 Lite" }));

    expect(screen.getByRole("radio", { name: "Stockfish 19 Lite" })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent("stockfish-19-lite-single");
    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe("stockfish-19-lite-single");
    expect(engineChoiceId()).toBe("stockfish-19-lite-single");
  });

  it("opens on the engine stored by an earlier visit", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "stockfish-19-lite-single");

    renderEngine();

    expect(screen.getByRole("radio", { name: "Stockfish 19 Lite" })).toBeChecked();
  });

  it("falls back to the default for a stored engine that no longer exists, without discarding it", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "stockfish-9000");

    renderEngine();

    expect(screen.getByRole("radio", { name: "Stockfish 2019" })).toBeChecked();
    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe("stockfish-9000");
  });

  it("shows the stored engine as the default while this host cannot run it", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "stockfish-19-lite-multi");

    renderEngine();

    expect(screen.getByRole("radio", { name: "Stockfish 2019" })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent(DEFAULT_ENGINE_ID);
  });

  it("lists an engine registered while it is open", () => {
    renderEngine();
    expect(screen.queryByRole("radio", { name: "Hosted Stockfish" })).toBeNull();

    const hosted: EngineDescriptor = {
      id: "hosted-stockfish",
      name: "Hosted Stockfish",
      version: "18",
      kind: "local",
      capabilities: { maxDepth: 24, strength: "elo", multiThread: true },
      create: () => ({}) as EngineHandle,
    };
    act(() => {
      removers.push(registerEngine(hosted));
    });

    expect(screen.getByRole("radio", { name: "Hosted Stockfish" })).toBeEnabled();
    expect(screen.getByTestId("engine-picker-facts-hosted-stockfish")).toHaveTextContent("Strength by Elo");
  });

  it("is operated from the keyboard: an arrow moves the choice", async () => {
    renderEngine();

    screen.getByRole("radio", { name: "Stockfish 2019" }).focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(screen.getByRole("radio", { name: "Stockfish 19 Lite" })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent("stockfish-19-lite-single");
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
