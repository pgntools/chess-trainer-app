import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ENGINE_STORAGE_KEY, engineChoiceId, readStoredEngineId, storeEngineId } from "./engineChoice";
import {
  DEFAULT_ENGINE_SERVER_URL,
  ENGINE_SERVER_STORAGE_KEY,
  connectEngineServer,
  engineServerStatus,
  ensureEngineServerChecked,
  normalizeEngineServerUrl,
  readEngineServerUrl,
  reportEngineServerFailure,
  storeEngineServerUrl,
  subscribeEngineServer,
} from "./engineServer";
import { BUILTIN_ENGINES, DEFAULT_ENGINE_ID, describeEngines, getEngine, resolveEngine } from "./engines";
import { HostedEngine } from "./hostedEngine";

/*
  The engine server's preference, its status and its engines in the registry
  (docs/engine.md §8) — over a fake `fetch` for `GET /v1/engines`.
*/
const ENGINES = [
  {
    id: "stockfish-18",
    name: "Stockfish 18",
    version: "18",
    options: [
      { name: "Threads", type: "spin", default: "1", min: 1, max: 19 },
      { name: "Skill Level", type: "spin", default: "20", min: 0, max: 20 },
      { name: "UCI_LimitStrength", type: "check", default: "false" },
      { name: "UCI_Elo", type: "spin", default: "1320", min: 1320, max: 3190 },
    ],
    limits: { maxDepth: 99, maxMovetimeMs: 600000 },
  },
  {
    id: "single",
    name: "One Thread",
    options: [
      { name: "Threads", type: "spin", default: "1", min: 1, max: 1 },
      { name: "Skill Level", type: "spin", default: "20", min: 0, max: 20 },
    ],
    limits: { maxDepth: 30 },
  },
];

let answer: () => Promise<Response>;
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => answer());

beforeEach(() => {
  answer = async () => Response.json(ENGINES);
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  await storeEngineServerUrl(undefined);
  vi.unstubAllGlobals();
});

/** Turn the server on and wait for its check. */
const turnOn = async (url = DEFAULT_ENGINE_SERVER_URL) => {
  storeEngineServerUrl(url);
  await vi.waitFor(() => expect(engineServerStatus().state).not.toBe("connecting"));
};

describe("the address", () => {
  it.each([
    ["http://127.0.0.1:8800", "http://127.0.0.1:8800"],
    ["  http://localhost:8800/  ", "http://localhost:8800"],
    ["https://engines.example/api/", "https://engines.example/api"],
  ])("keeps %j as %j", (text, url) => {
    expect(normalizeEngineServerUrl(text)).toBe(url);
  });

  it.each(["", "127.0.0.1:8800", "ftp://host", "http://h/x?a=1", "http://h/#x", "http://user:pw@h", "not a url"])(
    "refuses %j",
    (text) => {
      expect(normalizeEngineServerUrl(text)).toBeNull();
    },
  );
});

describe("off — the default", () => {
  it("asks nothing of any server, and lists the shipped engines alone", async () => {
    ensureEngineServerChecked();
    await connectEngineServer();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(engineServerStatus()).toEqual({ state: "off" });
    expect(readEngineServerUrl()).toBeUndefined();
    expect(describeEngines(false).map((e) => e.descriptor)).toEqual(BUILTIN_ENGINES);
  });
});

describe("on", () => {
  it("keeps the address, asks the server for its engines and lists them after the shipped ones", async () => {
    const seen: string[] = [];
    const unsubscribe = subscribeEngineServer(() => seen.push(engineServerStatus().state));
    await turnOn("http://127.0.0.1:8800/");
    unsubscribe();

    expect(localStorage.getItem(ENGINE_SERVER_STORAGE_KEY)).toBe("http://127.0.0.1:8800");
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8800/v1/engines", expect.anything());
    expect(seen).toEqual(["connecting", "online"]);
    expect(describeEngines(false).map((e) => e.descriptor.id)).toEqual([
      ...BUILTIN_ENGINES.map((d) => d.id),
      "hosted:stockfish-18",
      "hosted:single",
    ]);
  });

  it("describes each engine from what it declared", async () => {
    await turnOn();
    expect(getEngine("hosted:stockfish-18")).toMatchObject({
      name: "Stockfish 18",
      version: "18",
      server: DEFAULT_ENGINE_SERVER_URL,
      capabilities: { maxDepth: 99, strength: "both", multiThread: true },
    });
    expect(getEngine("hosted:single")).toMatchObject({
      version: "",
      capabilities: { maxDepth: 30, strength: "skill", multiThread: false },
    });
    expect(BUILTIN_ENGINES.every((d) => d.server === undefined)).toBe(true);
  });

  it("builds a HostedEngine only when one is created — and on the server's address", async () => {
    await turnOn();
    fetchMock.mockClear();
    const engine = getEngine("hosted:stockfish-18")!.create();
    expect(engine).toBeInstanceOf(HostedEngine);
    expect(fetchMock).not.toHaveBeenCalled();
    engine.terminate();
  });

  it("is a reader's choice while the server has it, and the default — still stored — while not", async () => {
    await turnOn();
    storeEngineId("hosted:stockfish-18");
    expect(engineChoiceId()).toBe("hosted:stockfish-18");

    answer = () => Promise.reject(new TypeError("Failed to fetch"));
    await connectEngineServer();
    expect(engineServerStatus()).toEqual({ state: "offline", url: DEFAULT_ENGINE_SERVER_URL, reason: "unreachable" });
    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);
    expect(readStoredEngineId()).toBe("hosted:stockfish-18");
    expect(resolveEngine("hosted:stockfish-18").id).toBe(DEFAULT_ENGINE_ID);

    answer = async () => Response.json(ENGINES);
    await connectEngineServer();
    expect(engineChoiceId()).toBe("hosted:stockfish-18");
    localStorage.removeItem(ENGINE_STORAGE_KEY);
  });

  it("says when every check answered — and hands back the same descriptors when it finds the same engines", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 9, 21, 0, 0));
    await turnOn();
    const before = getEngine("hosted:stockfish-18");
    const listener = vi.fn();
    const unsubscribe = subscribeEngineServer(listener);
    vi.setSystemTime(new Date(2026, 9, 9, 21, 5, 0));
    await connectEngineServer(); // Connect again
    unsubscribe();
    vi.useRealTimers();
    expect(listener).toHaveBeenCalledOnce();
    expect(engineServerStatus()).toMatchObject({ state: "online", checkedAt: new Date(2026, 9, 9, 21, 5, 0).getTime() });
    // A board does not rebuild its engine for a check.
    expect(getEngine("hosted:stockfish-18")).toBe(before);
  });

  it("keeps its engines listed while a failure is re-checked", async () => {
    await turnOn();
    let respond: (response: Response) => void = () => {};
    answer = () => new Promise((resolve) => (respond = resolve));
    reportEngineServerFailure();
    expect(engineServerStatus().state).toBe("online");
    expect(getEngine("hosted:stockfish-18")).toBeDefined();
    respond(new Response("nope", { status: 500 }));
    await vi.waitFor(() =>
      expect(engineServerStatus()).toEqual({
        state: "offline",
        url: DEFAULT_ENGINE_SERVER_URL,
        reason: "not-an-engine-server",
      }),
    );
    expect(getEngine("hosted:stockfish-18")).toBeUndefined();
  });

  it("calls a server that answers with something else not an engine server", async () => {
    answer = async () => Response.json({ hello: "world" });
    await turnOn();
    expect(engineServerStatus()).toMatchObject({ state: "offline", reason: "not-an-engine-server" });
  });

  it("turns off: forgets the address, asks nothing more, and its engines are gone", async () => {
    await turnOn();
    storeEngineServerUrl(undefined);
    await vi.waitFor(() => expect(engineServerStatus()).toEqual({ state: "off" }));
    expect(localStorage.getItem(ENGINE_SERVER_STORAGE_KEY)).toBeNull();
    expect(getEngine("hosted:stockfish-18")).toBeUndefined();
  });

  it("refuses to keep text that is not an address — it is off", async () => {
    storeEngineServerUrl("not a url");
    await vi.waitFor(() => expect(engineServerStatus()).toEqual({ state: "off" }));
    expect(localStorage.getItem(ENGINE_SERVER_STORAGE_KEY)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
