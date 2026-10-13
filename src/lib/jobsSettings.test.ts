import { afterEach, describe, expect, it, vi } from "vitest";

import {
  connectLichessEvalApi,
  DEFAULT_JOBS_SETTINGS,
  DEFAULT_LICHESS_EVAL_API_URL,
  JOBS_SETTINGS_STORAGE_KEY,
  jobsSettingsFrom,
  lichessEvalApiStatus,
  lichessEvalApiUrl,
  lichessEvalApiWriteUrl,
  readJobsSettings,
  reportLichessEvalUnreachable,
  storeJobsDefaultPreset,
  storeLichessEvalApi,
  storeLichessEvalApiWrite,
  subscribeJobsSettings,
  subscribeLichessEvalUnreachable,
} from "./jobsSettings";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Jobs settings", () => {
  it("are off by default: no default engine, the API off at today's address — and nothing asked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(readJobsSettings()).toEqual(DEFAULT_JOBS_SETTINGS);
    expect(DEFAULT_JOBS_SETTINGS.evalApi).toEqual({ enabled: false, url: DEFAULT_LICHESS_EVAL_API_URL, write: false });
    expect(lichessEvalApiUrl()).toBeUndefined();
    await connectLichessEvalApi();
    expect(lichessEvalApiStatus()).toEqual({ state: "off" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keep the default engine and preset in localStorage, and forget it again", () => {
    storeJobsDefaultPreset({ engineId: "stockfish-19-lite-single", presetId: "deep" });
    expect(JSON.parse(localStorage.getItem(JOBS_SETTINGS_STORAGE_KEY) ?? "{}").defaultPreset).toEqual({
      engineId: "stockfish-19-lite-single",
      presetId: "deep",
    });
    expect(readJobsSettings().defaultPreset).toEqual({ engineId: "stockfish-19-lite-single", presetId: "deep" });
    storeJobsDefaultPreset(null);
    expect(readJobsSettings().defaultPreset).toBeNull();
  });

  it("are the same object until they change — a snapshot", () => {
    const first = readJobsSettings();
    expect(readJobsSettings()).toBe(first);
    storeJobsDefaultPreset({ engineId: "a", presetId: "b" });
    expect(readJobsSettings()).not.toBe(first);
  });

  it("read a stored value leniently", () => {
    expect(jobsSettingsFrom({ defaultPreset: { engineId: "", presetId: "x" }, evalApi: { enabled: "yes", url: "nope" } })).toEqual(
      DEFAULT_JOBS_SETTINGS,
    );
    expect(jobsSettingsFrom({ evalApi: { enabled: true, url: "http://example.org:8000/" } }).evalApi).toEqual({
      enabled: true,
      url: "http://example.org:8000",
      write: false,
    });
    localStorage.setItem(JOBS_SETTINGS_STORAGE_KEY, "{not json");
    expect(readJobsSettings()).toEqual(DEFAULT_JOBS_SETTINGS);
  });

  it("turn the API on at an address, check GET /health, and say it is connected", async () => {
    const fetchMock = vi.fn(async () => json({ status: "ok", positions: 416_000_000 }));
    vi.stubGlobal("fetch", fetchMock);
    const heard = vi.fn();
    const off = subscribeJobsSettings(heard);
    await storeLichessEvalApi(true, "http://127.0.0.1:8000/");
    off();
    expect(lichessEvalApiUrl()).toBe("http://127.0.0.1:8000");
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe("http://127.0.0.1:8000/health");
    expect(lichessEvalApiStatus()).toMatchObject({ state: "online", url: "http://127.0.0.1:8000", positions: 416_000_000 });
    expect(heard).toHaveBeenCalled();
  });

  it("say why the API is not connected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ engines: [] })));
    await storeLichessEvalApi(true);
    expect(lichessEvalApiStatus()).toEqual({ state: "offline", url: DEFAULT_LICHESS_EVAL_API_URL, reason: "not-an-eval-api" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await connectLichessEvalApi();
    expect(lichessEvalApiStatus()).toMatchObject({ state: "offline", reason: "unreachable" });
  });

  it("keep the address while the API is off, and ask nothing then", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ status: "ok", positions: 1 })));
    await storeLichessEvalApi(true, "http://10.0.0.9:8000");
    await storeLichessEvalApi(false);
    expect(lichessEvalApiUrl()).toBeUndefined();
    expect(readJobsSettings().evalApi).toEqual({ enabled: false, url: "http://10.0.0.9:8000", write: false });
    expect(lichessEvalApiStatus()).toEqual({ state: "off" });
  });
});

describe("sending the engine's evals to the API", () => {
  it("is off by default, kept when ticked, and only where the API is on", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ status: "ok", positions: 1, write_enabled: true })));
    expect(lichessEvalApiWriteUrl()).toBeUndefined();
    storeLichessEvalApiWrite(true);
    expect(readJobsSettings().evalApi.write).toBe(true);
    expect(lichessEvalApiWriteUrl()).toBeUndefined();
    await storeLichessEvalApi(true, "http://10.0.0.3:8000");
    expect(lichessEvalApiWriteUrl()).toBe("http://10.0.0.3:8000");
    // The API's check says whether it takes writes; turning it off and on keeps the tick.
    expect(lichessEvalApiStatus()).toMatchObject({ state: "online", writeEnabled: true });
    await storeLichessEvalApi(false);
    expect(lichessEvalApiWriteUrl()).toBeUndefined();
    await storeLichessEvalApi(true);
    expect(lichessEvalApiWriteUrl()).toBe("http://10.0.0.3:8000");
  });
});

describe("the runner's word that the API did not answer", () => {
  it("reaches every listener until it unsubscribes", () => {
    const listener = vi.fn();
    const off = subscribeLichessEvalUnreachable(listener);
    reportLichessEvalUnreachable({ jobId: "j1", name: "Alice – Bob", kind: "read" });
    off();
    reportLichessEvalUnreachable({ jobId: "j2", name: "Carol – Dan", kind: "write" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ jobId: "j1", name: "Alice – Bob", kind: "read" });
  });
});
