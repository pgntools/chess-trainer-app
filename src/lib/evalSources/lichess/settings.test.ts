import { afterEach, describe, expect, it, vi } from "vitest";

import { JOBS_SETTINGS_STORAGE_KEY, readJobsSettings, storeJobsDefaultPreset } from "../../jobsSettings";
import { backOffEvalSource, evalSourceBackedOff } from "../backOff";
import {
  connectLichessEvalApi,
  DEFAULT_LICHESS_EVAL_API_SETTINGS,
  DEFAULT_LICHESS_EVAL_API_URL,
  LICHESS_EVAL_API_STORAGE_KEY,
  LICHESS_EVAL_SOURCE_ID,
  lichessEvalApiMinWriteDepth,
  lichessEvalApiSettingsFrom,
  lichessEvalApiStatus,
  lichessEvalApiUrl,
  lichessEvalApiWriteUrl,
  readLichessEvalApiSettings,
  storeLichessEvalApi,
  storeLichessEvalApiMinWriteDepth,
  storeLichessEvalApiWrite,
  subscribeLichessEvalApi,
} from "./settings";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the lichess evaluation API's settings (CTA-196)", () => {
  it("are off by default at today's address — and nothing is asked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(readLichessEvalApiSettings()).toEqual(DEFAULT_LICHESS_EVAL_API_SETTINGS);
    expect(DEFAULT_LICHESS_EVAL_API_SETTINGS).toEqual({ enabled: false, url: DEFAULT_LICHESS_EVAL_API_URL, write: false, minWriteDepth: 35 });
    expect(lichessEvalApiUrl()).toBeUndefined();
    await connectLichessEvalApi();
    expect(lichessEvalApiStatus()).toEqual({ state: "off" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("are the same object until they change — a snapshot", () => {
    const first = readLichessEvalApiSettings();
    expect(readLichessEvalApiSettings()).toBe(first);
    storeLichessEvalApiWrite(true);
    expect(readLichessEvalApiSettings()).not.toBe(first);
  });

  it("read a stored value leniently", () => {
    expect(lichessEvalApiSettingsFrom({ enabled: "yes", url: "nope" })).toEqual(DEFAULT_LICHESS_EVAL_API_SETTINGS);
    expect(lichessEvalApiSettingsFrom({ enabled: true, url: "http://example.org:8000/" })).toEqual({
      enabled: true,
      url: "http://example.org:8000",
      write: false,
      minWriteDepth: 35,
    });
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, "{not json");
    expect(readLichessEvalApiSettings()).toEqual(DEFAULT_LICHESS_EVAL_API_SETTINGS);
  });

  it("turn the API on at an address, check GET /health, and say it is connected", async () => {
    const fetchMock = vi.fn(async () => json({ status: "ok", positions: 416_000_000 }));
    vi.stubGlobal("fetch", fetchMock);
    const heard = vi.fn();
    const off = subscribeLichessEvalApi(heard);
    await storeLichessEvalApi(true, "http://127.0.0.1:8000/");
    off();
    expect(lichessEvalApiUrl()).toBe("http://127.0.0.1:8000");
    expect(JSON.parse(localStorage.getItem(LICHESS_EVAL_API_STORAGE_KEY) ?? "{}")).toEqual({
      enabled: true,
      url: "http://127.0.0.1:8000",
      write: false,
      minWriteDepth: 35,
    });
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
    expect(readLichessEvalApiSettings()).toEqual({ enabled: false, url: "http://10.0.0.9:8000", write: false, minWriteDepth: 35 });
    expect(lichessEvalApiStatus()).toEqual({ state: "off" });
  });

  it("send the engine's evals only while ticked and the API on", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ status: "ok", positions: 1, write_enabled: true })));
    expect(lichessEvalApiWriteUrl()).toBeUndefined();
    storeLichessEvalApiWrite(true);
    expect(readLichessEvalApiSettings().write).toBe(true);
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

  it("clear the boards' back-off when they change — the API is asked again at once", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ status: "ok", positions: 1 })));
    backOffEvalSource(LICHESS_EVAL_SOURCE_ID, "read");
    expect(evalSourceBackedOff(LICHESS_EVAL_SOURCE_ID, "read")).toBe(true);
    expect(evalSourceBackedOff(LICHESS_EVAL_SOURCE_ID, "write")).toBe(true);
    await storeLichessEvalApi(true);
    expect(evalSourceBackedOff(LICHESS_EVAL_SOURCE_ID, "read")).toBe(false);
    expect(evalSourceBackedOff(LICHESS_EVAL_SOURCE_ID, "write")).toBe(false);
  });
});

describe("the minimum depth to write (CTA-202)", () => {
  it("is 35 by default — and for settings stored before it, without a migration", () => {
    expect(lichessEvalApiMinWriteDepth()).toBe(35);
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: true, url: "http://10.0.0.1:8000", write: true }));
    expect(readLichessEvalApiSettings()).toEqual({ enabled: true, url: "http://10.0.0.1:8000", write: true, minWriteDepth: 35 });
  });

  it("reads leniently: anything not a number is 35, a number is rounded and held to 1–99", () => {
    const depthOf = (minWriteDepth: unknown) => lichessEvalApiSettingsFrom({ minWriteDepth }).minWriteDepth;
    expect(depthOf("40")).toBe(35);
    expect(depthOf(null)).toBe(35);
    expect(depthOf(Number.NaN)).toBe(35);
    expect(depthOf(40)).toBe(40);
    expect(depthOf(24.6)).toBe(25);
    expect(depthOf(0)).toBe(1);
    expect(depthOf(-3)).toBe(1);
    expect(depthOf(150)).toBe(99);
  });

  it("is stored beside the rest, held to the range, and heard", () => {
    const heard = vi.fn();
    const off = subscribeLichessEvalApi(heard);
    storeLichessEvalApiMinWriteDepth(40);
    off();
    expect(heard).toHaveBeenCalled();
    expect(lichessEvalApiMinWriteDepth()).toBe(40);
    expect(JSON.parse(localStorage.getItem(LICHESS_EVAL_API_STORAGE_KEY) ?? "{}")).toEqual({
      ...DEFAULT_LICHESS_EVAL_API_SETTINGS,
      minWriteDepth: 40,
    });
    storeLichessEvalApiMinWriteDepth(500);
    expect(lichessEvalApiMinWriteDepth()).toBe(99);
    storeLichessEvalApiMinWriteDepth(0);
    expect(lichessEvalApiMinWriteDepth()).toBe(1);
  });
});

describe("the move from the Jobs settings (CTA-196)", () => {
  it("takes a reader's chessapp.jobsSettings.evalApi on the first read — nothing lost, the Jobs settings without it", () => {
    localStorage.setItem(
      JOBS_SETTINGS_STORAGE_KEY,
      JSON.stringify({ defaultPreset: { engineId: "e", presetId: "p" }, evalApi: { enabled: true, url: "http://10.0.0.9:8000/", write: true } }),
    );
    expect(readLichessEvalApiSettings()).toEqual({ enabled: true, url: "http://10.0.0.9:8000", write: true, minWriteDepth: 35 });
    expect(JSON.parse(localStorage.getItem(LICHESS_EVAL_API_STORAGE_KEY) ?? "{}")).toEqual({
      enabled: true,
      url: "http://10.0.0.9:8000",
      write: true,
      minWriteDepth: 35,
    });
    expect(JSON.parse(localStorage.getItem(JOBS_SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({ defaultPreset: { engineId: "e", presetId: "p" } });
    expect(readJobsSettings().defaultPreset).toEqual({ engineId: "e", presetId: "p" });
  });

  it("survives a Jobs settings write that came first", () => {
    localStorage.setItem(JOBS_SETTINGS_STORAGE_KEY, JSON.stringify({ defaultPreset: null, evalApi: { enabled: true, url: "http://10.0.0.9:8000" } }));
    storeJobsDefaultPreset({ engineId: "e", presetId: "p" });
    expect(lichessEvalApiUrl()).toBe("http://10.0.0.9:8000");
  });

  it("never overrides settings already here, and moves nothing that is not there", () => {
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: false, url: "http://10.0.0.1:8000", write: false }));
    localStorage.setItem(JOBS_SETTINGS_STORAGE_KEY, JSON.stringify({ evalApi: { enabled: true, url: "http://10.0.0.9:8000" } }));
    expect(readLichessEvalApiSettings()).toEqual({ enabled: false, url: "http://10.0.0.1:8000", write: false, minWriteDepth: 35 });
    localStorage.clear();
    localStorage.setItem(JOBS_SETTINGS_STORAGE_KEY, JSON.stringify({ defaultPreset: null }));
    expect(readLichessEvalApiSettings()).toEqual(DEFAULT_LICHESS_EVAL_API_SETTINGS);
    expect(localStorage.getItem(LICHESS_EVAL_API_STORAGE_KEY)).toBeNull();
  });
});
