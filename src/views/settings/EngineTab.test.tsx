import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../i18n";
import { ENGINE_STORAGE_KEY, engineChoiceId } from "../../lib/engineChoice";
import { ENGINE_SERVER_STORAGE_KEY, connectEngineServer, storeEngineServerUrl } from "../../lib/engineServer";
import { DEFAULT_ENGINE_ID } from "../../lib/engines";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { RightPanelOutlet, RightPanelProvider } from "../main/rightPanel";
import { useEngineChoice } from "../shared/useEngineChoice";
import { LOCAL_ENGINE_GUIDE_PATH } from "./EngineTab";
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
        <RightPanelProvider>
          <main>
            <Routes>
              <Route path="/settings/:tab" element={<SettingsScreen />} />
            </Routes>
          </main>
          {/* The shell's aside: what the tab puts in the right-hand panel. */}
          <aside data-testid="aside">
            <RightPanelOutlet />
          </aside>
        </RightPanelProvider>
      </MemoryRouter>
      <ChoiceProbe />
    </AppThemeWithLang>,
  );

const main = () => screen.getByRole("main");
const aside = () => screen.getByTestId("aside");

/** What a board would read: the engine the reader chose. */
function ChoiceProbe() {
  return <span data-testid="engine-in-use">{useEngineChoice().engineId}</span>;
}

const SINGLE = "Stockfish 19 Lite";
const MULTI = "Stockfish 19 Lite (multi-thread)";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  // The engine server's status lives in its module: turn it off for the next test.
  await storeEngineServerUrl(undefined);
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

/*
  The engine server (docs/engine.md §8) over a fake `GET /v1/engines` — the
  server's list as the real one answers, two engines and a few of their
  options. No session is opened: nothing here searches.
*/
const SERVER_ENGINES = [
  {
    id: "stockfish-18",
    name: "Stockfish 18",
    version: "18",
    options: [{ name: "Threads", type: "spin", default: "1", min: 1, max: 19 }],
    limits: { maxDepth: 99, maxMovetimeMs: 600000 },
  },
  {
    id: "stockfish-19",
    name: "Stockfish 19",
    version: "19",
    options: [
      { name: "Threads", type: "spin", default: "1", min: 1, max: 19 },
      { name: "Clear Hash", type: "button" },
      { name: "UCI_LimitStrength", type: "check", default: "false" },
      { name: "SyzygyPath", type: "string", default: "<empty>" },
    ],
    limits: { maxDepth: 99, maxMovetimeMs: 600000 },
  },
];

/** A server that answers — or, `down`, one that cannot be reached. */
const stubServer = (state: { down: boolean } = { down: false }) => {
  const fetchMock = vi.fn(async () => {
    if (state.down) throw new TypeError("Failed to fetch");
    return Response.json(SERVER_ENGINES);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const openApiTab = async () => userEvent.click(within(main()).getByRole("tab", { name: "API" }));

const turnServerOn = async () => {
  await userEvent.click(within(main()).getByRole("switch", { name: "Use an engine server" }));
  await waitFor(() => expect(screen.getByTestId("engine-server-indicator")).toHaveAttribute("data-state", "online"));
};

describe("Settings → Engine — where the engine runs", () => {
  it("opens on Browser, the page's own builds; API holds the engine server, off", async () => {
    const fetchMock = stubServer();
    renderEngine();

    expect(within(main()).getByRole("tab", { name: "Browser" })).toHaveAttribute("aria-selected", "true");
    expect(within(main()).getByRole("tabpanel", { name: "Browser" })).toContainElement(screen.getByRole("radiogroup", { name: "Engine" }));

    await openApiTab();

    expect(within(main()).getByRole("tab", { name: "API" })).toHaveAttribute("aria-selected", "true");
    expect(within(main()).getByRole("switch", { name: "Use an engine server" })).not.toBeChecked();
    expect(within(main()).queryByRole("textbox", { name: "Server address" })).toBeNull();
    // Off, nothing contacts any server.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(ENGINE_SERVER_STORAGE_KEY)).toBeNull();
  });

  it("turned on, keeps the address, says it is connected, and lists the server's engines to choose from", async () => {
    stubServer();
    renderEngine();
    await openApiTab();
    await turnServerOn();

    expect(localStorage.getItem(ENGINE_SERVER_STORAGE_KEY)).toBe("http://127.0.0.1:8800");
    expect(screen.getByTestId("engine-server-indicator")).toHaveTextContent(/^Connected · \d+ ms$/);
    const onServer = within(main()).getByRole("radiogroup", { name: "Engines on this server" });
    expect(within(onServer).getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value)).toEqual([
      "hosted:stockfish-18",
      "hosted:stockfish-19",
    ]);
    expect(screen.getByTestId("engine-server-picker-facts-hosted:stockfish-19")).toHaveTextContent(
      "On the engine server 127.0.0.1:8800",
    );

    await userEvent.click(within(onServer).getByRole("radio", { name: "Stockfish 19" }));

    expect(screen.getByTestId("engine-in-use")).toHaveTextContent("hosted:stockfish-19");
    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe("hosted:stockfish-19");
  });

  it("shows in the panel what the chosen server engine declared", async () => {
    stubServer();
    renderEngine();
    await openApiTab();
    await turnServerOn();
    await userEvent.click(within(main()).getByRole("radio", { name: "Stockfish 19" }));

    const table = within(aside()).getByRole("table", { name: "UCI defaults — Stockfish 19" });
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
    expect(rows).toEqual([
      ["Threads", "spin", "1", "1 – 19"],
      ["Clear Hash", "button", "—", "—"],
      ["UCI_LimitStrength", "check", "false", "true / false"],
      ["SyzygyPath", "string", "<empty>", "—"],
    ]);
    expect(aside()).toHaveTextContent("a search goes no deeper than 99");
  });

  it("points the panel to the guide on API with none chosen, and to the API tab on Browser", async () => {
    stubServer();
    renderEngine();

    expect(aside()).toHaveTextContent("Choose an engine on the API tab to see the UCI options it declares.");

    await openApiTab();

    expect(within(aside()).getByRole("heading", { name: "Add an engine on this computer" })).toBeInTheDocument();
    expect(within(aside()).getByRole("link", { name: "Read the guide." })).toHaveAttribute("href", LOCAL_ENGINE_GUIDE_PATH);
  });

  it("answers every Connect on the button — a check mark when the server answers, a warning when not", async () => {
    const server = { down: false };
    stubServer(server);
    renderEngine();
    await openApiTab();
    await turnServerOn();
    const connect = within(main()).getByRole("button", { name: "Connect" });

    await userEvent.click(connect);
    expect(connect).toHaveAttribute("data-feedback", "checking");
    await waitFor(() => expect(connect).toHaveAttribute("data-feedback", "answered"));
    await waitFor(() => expect(connect).toHaveAttribute("data-feedback", "idle"), { timeout: 4000 });

    server.down = true;
    await userEvent.click(connect);
    await waitFor(() => expect(connect).toHaveAttribute("data-feedback", "failed"));
    expect(screen.getByTestId("engine-server-indicator")).toHaveTextContent("Not connected");
    expect(within(main()).getByRole("alert")).toHaveTextContent("Can't reach");
    // Its engines leave the list, and a choice of one reads as the default.
    expect(within(main()).queryByRole("radiogroup", { name: "Engines on this server" })).toBeNull();
  });

  it("refuses an address that is not one, and keeps a new one with Enter", async () => {
    const fetchMock = stubServer();
    renderEngine();
    await openApiTab();
    await turnServerOn();
    const field = within(main()).getByRole("textbox", { name: "Server address" });

    await userEvent.clear(field);
    await userEvent.type(field, "127.0.0.1:9000");
    expect(within(main()).getByRole("button", { name: "Connect" })).toBeDisabled();
    expect(main()).toHaveTextContent("Enter an address like");

    await userEvent.clear(field);
    await userEvent.type(field, "http://127.0.0.1:9000/{Enter}");
    await waitFor(() => expect(localStorage.getItem(ENGINE_SERVER_STORAGE_KEY)).toBe("http://127.0.0.1:9000"));
    expect(fetchMock).toHaveBeenLastCalledWith("http://127.0.0.1:9000/v1/engines", expect.anything());
  });

  it("opens on API when the stored choice is a server engine — and turned off, falls back without forgetting it", async () => {
    stubServer();
    localStorage.setItem(ENGINE_SERVER_STORAGE_KEY, "http://127.0.0.1:8800");
    localStorage.setItem(ENGINE_STORAGE_KEY, "hosted:stockfish-18");
    await connectEngineServer();
    renderEngine();

    expect(within(main()).getByRole("tab", { name: "API" })).toHaveAttribute("aria-selected", "true");
    expect(within(main()).getByRole("radio", { name: "Stockfish 18" })).toBeChecked();
    expect(screen.getByTestId("engine-in-use")).toHaveTextContent("hosted:stockfish-18");

    await userEvent.click(within(main()).getByRole("switch", { name: "Use an engine server" }));

    await waitFor(() => expect(screen.getByTestId("engine-in-use")).toHaveTextContent(DEFAULT_ENGINE_ID));
    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe("hosted:stockfish-18");
  });

  it("reads in Hebrew", async () => {
    stubServer();
    await i18n.changeLanguage("he");
    renderEngine();
    await userEvent.click(within(main()).getByRole("tab", { name: "API" }));

    expect(within(main()).getByRole("switch", { name: "שימוש בשרת מנוע" })).toBeInTheDocument();
    expect(within(aside()).getByRole("link", { name: "למדריך." })).toBeInTheDocument();
  });

  it("passes axe on the API tab, connected, with an engine chosen", async () => {
    stubServer();
    renderEngine();
    await openApiTab();
    await turnServerOn();
    await userEvent.click(within(main()).getByRole("radio", { name: "Stockfish 19" }));
    await expectNoAxeViolations();
  });
});
