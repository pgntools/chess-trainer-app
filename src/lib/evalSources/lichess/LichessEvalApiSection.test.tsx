import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { RightPanelOutlet, RightPanelProvider } from "../../../views/main/rightPanel";
import SettingsScreen from "../../../views/settings/SettingsScreen";
import { JOBS_SETTINGS_STORAGE_KEY } from "../../jobsSettings";
import { LICHESS_EVAL_API_STORAGE_KEY, readLichessEvalApiSettings } from "./settings";

/*
  The lichess evaluation API's tab of Settings → Engine (CTA-196 — the
  Jobs settings' until then, CTA-193), mounted where the reader meets it: the
  Settings screen's Engine tab, rendered from the eval-source registry. The
  API is a stubbed `fetch`.
*/

vi.mock("../../engines/builtin", async (importOriginal) =>
  (await import("../../../views/board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

const renderEngineTab = (path = "/settings/engine") =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[path]}>
        <RightPanelProvider>
          <main>
            <Routes>
              <Route path="/settings/:tab" element={<SettingsScreen />} />
            </Routes>
          </main>
          <aside>
            <RightPanelOutlet />
          </aside>
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

/** Its tab — named by its title, then its connection ("…, connected", CTA-199). */
const sourceTab = (name = "Lichess evaluation API") =>
  screen.getByRole("tab", { name: (accessibleName) => accessibleName.startsWith(`${name}, `) });

/** The section, on its own inner tab of Settings → Engine — opened, its lazy chunk landed. */
const section = async (name = "Lichess evaluation API") => {
  await userEvent.setup().click(sourceTab(name));
  return screen.findByRole("region", { name });
};

/** The tab's connection dot. */
const dot = () => screen.getByTestId("eval-source-connection-lichess");

const health = (body: Record<string, unknown>) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the lichess evaluation API in Settings → Engine (CTA-196)", () => {
  it("is a tab of its own, beside Stockfish connectors — and ?source=lichess opens on it", async () => {
    renderEngineTab();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(
      expect.arrayContaining(["Stockfish connectors", "Lichess evaluation API, turned off"]),
    );
    expect(sourceTab()).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByRole("region", { name: "Lichess evaluation API" })).toBeNull();
    cleanup();
    renderEngineTab("/settings/engine?source=lichess");
    expect(sourceTab()).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("region", { name: "Lichess evaluation API" })).toBeInTheDocument();
  });

  it("shows its connection on its tab: gray off, green connected, yellow not answering (CTA-199)", async () => {
    const fetchMock = vi.fn(async () => health({ status: "ok", positions: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderEngineTab();
    expect(dot()).toHaveAttribute("data-connection", "disabled");
    expect(screen.getByRole("tab", { name: "Lichess evaluation API, turned off" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    const api = await section();
    await user.click(within(api).getByRole("switch", { name: /use the lichess evaluation api/i }));
    await waitFor(() => expect(dot()).toHaveAttribute("data-connection", "connected"));
    expect(screen.getByRole("tab", { name: "Lichess evaluation API, connected" })).toBeInTheDocument();

    // It stops answering: Try again finds it gone.
    fetchMock.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    await user.click(within(api).getByRole("button", { name: "Connect" }));
    await waitFor(() => expect(dot()).toHaveAttribute("data-connection", "not-connected"));
    expect(screen.getByRole("tab", { name: "Lichess evaluation API, not connected" })).toBeInTheDocument();
  });

  it("checks a turned-on API as the Engine tab opens, so the dot is true before its tab is (CTA-199)", async () => {
    const fetchMock = vi.fn(async () => health({ status: "ok", positions: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: true, url: "http://10.0.0.3:8000", write: false }));
    renderEngineTab();
    expect(sourceTab()).toHaveAttribute("aria-selected", "false");
    await waitFor(() => expect(dot()).toHaveAttribute("data-connection", "connected"));
    expect(fetchMock).toHaveBeenCalledWith("http://10.0.0.3:8000/health", expect.anything());
  });

  it("is off by default — no address, and nothing asked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderEngineTab();
    const api = await section();
    expect(within(api).getByRole("switch", { name: /use the lichess evaluation api/i })).not.toBeChecked();
    expect(within(api).queryByRole("textbox", { name: /api address/i })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns on, checks GET /health, keeps another address with Connect — and writing, tested for write mode", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/health") ? health({ status: "ok", positions: 416_000_000 }) : new Response("", { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { baseElement, unmount } = renderEngineTab();
    const api = await section();

    // On: its address, checked at once with GET /health.
    await user.click(within(api).getByRole("switch", { name: /use the lichess evaluation api/i }));
    const address = within(api).getByRole("textbox", { name: /api address/i });
    expect(address).toHaveValue("http://127.0.0.1:8000");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/health", expect.anything()));
    expect(await within(api).findByText(/^Connected · \d+ ms$/)).toBeInTheDocument();

    // Another address, kept and checked by Connect.
    await user.clear(address);
    await user.type(address, "http://10.0.0.3:8000");
    await user.click(within(api).getByRole("button", { name: "Connect" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("http://10.0.0.3:8000/health", expect.anything()));
    expect(JSON.parse(localStorage.getItem(LICHESS_EVAL_API_STORAGE_KEY) ?? "{}")).toEqual({
      enabled: true,
      url: "http://10.0.0.3:8000",
      write: false,
    });

    // Writing: kept, and said refused by an API not in write mode (its /health says so).
    await user.click(within(api).getByRole("checkbox", { name: /enable evaluations write api/i }));
    expect(readLichessEvalApiSettings().write).toBe(true);
    expect(await within(api).findByText(/is not in write mode/i)).toBeInTheDocument();

    // Test connection: GET /health again — now in write mode.
    fetchMock.mockImplementation(async () => health({ status: "ok", positions: 416_000_000, write_enabled: true }));
    const calls = fetchMock.mock.calls.length;
    await user.click(within(api).getByRole("button", { name: "Test connection" }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(calls));
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe("http://10.0.0.3:8000/health");
    expect(await within(api).findByText(/is in write mode \(write_enabled\)/i)).toBeInTheDocument();
    await waitFor(() => expect(within(api).getByRole("button", { name: "Test connection" })).toHaveAttribute("data-feedback", "answered"));
    await expectNoAxeViolations(baseElement);

    // A reload keeps them.
    unmount();
    renderEngineTab();
    const again = await section();
    expect(within(again).getByRole("switch", { name: /use the lichess evaluation api/i })).toBeChecked();
    expect(within(again).getByRole("textbox", { name: /api address/i })).toHaveValue("http://10.0.0.3:8000");
    expect(within(again).getByRole("checkbox", { name: /enable evaluations write api/i })).toBeChecked();
  });

  it("says why the API is not connected, with Try again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: true, url: "http://10.0.0.3:8000", write: false }));
    renderEngineTab();
    const api = await section();
    expect(await within(api).findByText(/did not answer\. Is the API running/i)).toBeInTheDocument();
    expect(within(api).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows a reader's Jobs settings API, moved here — nothing lost", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => health({ status: "ok", positions: 1 })));
    localStorage.setItem(
      JOBS_SETTINGS_STORAGE_KEY,
      JSON.stringify({ defaultPreset: null, evalApi: { enabled: true, url: "http://10.0.0.9:8000", write: true } }),
    );
    renderEngineTab();
    const api = await section();
    expect(within(api).getByRole("switch", { name: /use the lichess evaluation api/i })).toBeChecked();
    expect(within(api).getByRole("textbox", { name: /api address/i })).toHaveValue("http://10.0.0.9:8000");
    expect(within(api).getByRole("checkbox", { name: /enable evaluations write api/i })).toBeChecked();
  });

  it("reads in Hebrew, with no axe violations", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => health({ status: "ok", positions: 1, write_enabled: false })));
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: true, url: "http://10.0.0.3:8000", write: true }));
    await i18n.changeLanguage("he");
    const { baseElement } = renderEngineTab();
    const api = await section("ממשק ההערכות של lichess");
    expect(await within(api).findByText(/לא במצב כתיבה/)).toBeInTheDocument();
    await expectNoAxeViolations(baseElement);
  });
});
