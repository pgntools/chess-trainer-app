import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { positionCaseOfFen } from "./analysisProjects";
import {
  buildExport,
  EXPORT_CATEGORIES,
  exportFileName,
  exportedCollections,
  hasExportSelection,
  zipExport,
  type AnalysisProjectsFile,
  type ExportSelection,
  type ExportSource,
} from "./dataExport";
import type { EnginePreset } from "./enginePresets";
import { DEFAULT_ENGINE_SETTINGS } from "./engineSettings";
import type { CollectionSummary } from "./libraryCollections";
import { splitPgnGames } from "./pgn";
import type { PlayedGame } from "./playedGames";
import { DEFAULT_REPERTOIRE_SETTINGS } from "./repertoireSettings";
import type { GameFolder } from "./savedGameFolders";
import type { RepertoireFolder } from "./savedRepertoireFolders";
import type { SavedRepertoire } from "./savedRepertoires";

const NOW = new Date(2026, 8, 22, 12, 0, 0);
const AT = "2026-09-01T00:00:00.000Z";

const pgn = (event: string, moves = "1. e4 e5 *") =>
  `[Event "${event}"]\n[White "W"]\n[Black "B"]\n[Result "*"]\n\n${moves}`;

const played = (id: string, extra: Partial<PlayedGame> = {}): PlayedGame => ({
  id,
  pgn: pgn(`Played ${id}`),
  settings: DEFAULT_ENGINE_SETTINGS,
  path: ["e4"],
  savedAt: AT,
  updatedAt: AT,
  ...extra,
});

const folder = (id: string, name: string, parentId: string | null = null): GameFolder => ({
  id,
  name,
  parentId,
  savedAt: AT,
  updatedAt: AT,
});

const repertoire = (id: string, folderId: string | null, text = pgn(`Rep ${id}`)): SavedRepertoire => ({
  id,
  name: `Rep ${id}`,
  pgn: text,
  previewFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  stats: { moves: 1, variations: 0 },
  settings: { ...DEFAULT_REPERTOIRE_SETTINGS, color: "black" },
  folderId,
  savedAt: AT,
  updatedAt: AT,
});

const repFolder = (id: string, name: string): RepertoireFolder => ({ id, name, savedAt: AT, updatedAt: AT });

const summary = (
  id: string,
  name: string,
  source: "shipped" | "uploaded",
  count: number,
  folderId: string | null = null,
): CollectionSummary => ({
  id,
  name,
  source,
  count,
  ...(source === "uploaded" ? { folderId } : {}),
});

const EMPTY: ExportSource = {
  playedGames: [],
  repertoires: [],
  repertoireFolders: [],
  collections: [],
  collectionFolders: [],
  enginePresets: [],
  enginePresetSelections: [],
  projectFolders: [],
  analysisProjects: [],
  analysisCases: [],
};

const ALL: ExportSelection = {
  collections: true,
  games: true,
  repertoires: true,
  enginePresets: true,
  analysisProjects: true,
  shippedCollections: true,
};
const NONE: ExportSelection = {
  collections: false,
  games: false,
  repertoires: false,
  enginePresets: false,
  analysisProjects: false,
  shippedCollections: false,
};

const build = (source: Partial<ExportSource>, selection: Partial<ExportSelection> = ALL) =>
  buildExport({ ...EMPTY, ...source }, { ...NONE, ...selection }, { appVersion: "9.9.9", now: NOW });

const fileText = (bundle: ReturnType<typeof build>, path: string) =>
  bundle.files.find((file) => file.path === path)?.text;

describe("buildExport", () => {
  it("stamps the manifest with the format, the app version, the date and the ticked categories", () => {
    const { manifest } = build({}, { games: true, repertoires: true });
    expect(manifest).toMatchObject({
      format: "chessapp-export",
      formatVersion: 5,
      appVersion: "9.9.9",
      exportedAt: NOW.toISOString(),
      categories: ["games", "repertoires"],
      includeShippedCollections: false,
    });
  });

  it("writes every category, and nothing for a category not ticked", () => {
    const source: Partial<ExportSource> = {
      playedGames: [played("g1")],
      repertoires: [repertoire("r1", null)],
      collections: [{ summary: summary("u1", "Mine", "uploaded", 1), games: [pgn("C1")] }],
    };
    expect(build(source).files.map((file) => file.path)).toEqual(["games.pgn", "collections/mine.pgn", "repertoires/unfiled.pgn"]);
    expect(build(source, { repertoires: true }).files.map((file) => file.path)).toEqual(["repertoires/unfiled.pgn"]);
    expect(build(source, {}).files).toEqual([]);
  });

  it("lists an empty ticked category but writes no file for it", () => {
    const bundle = build({}, ALL);
    expect(bundle.manifest.categories).toEqual(["collections", "games", "repertoires", "enginePresets", "analysisProjects"]);
    expect(bundle.files).toEqual([]);
    expect(bundle.manifest.files).toEqual([]);
    expect(bundle.manifest.folders).toEqual({ repertoires: [], collections: [] });
  });

  it("writes Analysis V2's folders and Projects, each with its Cases, as one JSON file (CTA-186)", () => {
    const at = "2026-10-12T00:00:00.000Z";
    const folders = [
      { id: "pf", name: "Openings", parentId: null, savedAt: at, updatedAt: at },
      { id: "ps", name: "Sicilian", parentId: "pf", savedAt: at, updatedAt: at },
    ];
    const projects = [
      { id: "p1", name: "Najdorf", folderId: "ps", createdAt: at, updatedAt: at },
      { id: "p2", name: "Loose", folderId: "gone", createdAt: at, updatedAt: at },
    ];
    const cases = [positionCaseOfFen({ id: "c1", projectId: "p1", name: "" }, "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1")];
    const bundle = build(
      { projectFolders: folders, analysisProjects: projects, analysisCases: cases },
      { analysisProjects: true },
    );
    expect(bundle.manifest.files).toEqual([{ path: "analysis-projects.json", kind: "analysis-projects", projects: 2 }]);
    const file = JSON.parse(fileText(bundle, "analysis-projects.json") ?? "") as AnalysisProjectsFile;
    expect(file.folders).toEqual([["Openings"], ["Openings", "Sicilian"]]);
    expect(file.projects.map(({ id, folderPath, cases: held }) => ({ id, folderPath, cases: held.map((c) => c.id) }))).toEqual([
      { id: "p1", folderPath: ["Openings", "Sicilian"], cases: ["c1"] },
      // A folder that is gone is the top level.
      { id: "p2", folderPath: [], cases: [] },
    ]);
    // Not ticked, nothing.
    expect(build({ analysisProjects: projects }, { games: true }).files).toEqual([]);
  });

  it("writes the engine presets and each engine's selection as one JSON file (CTA-179)", () => {
    const presets: EnginePreset[] = [
      { id: "default", name: "Default", values: { UCI_ShowWDL: true }, groups: {}, search: {}, savedAt: AT, updatedAt: AT },
      { id: "deep", name: "deep-analysis", values: { "Move Overhead": 100, SyzygyPath: "/tb" }, groups: { syzygy: true }, search: {}, savedAt: AT, updatedAt: AT },
    ];
    const selections = [{ id: "stockfish-19-lite-single", presetId: "deep", updatedAt: AT }];
    const bundle = build({ enginePresets: presets, enginePresetSelections: selections }, { enginePresets: true });

    expect(bundle.manifest.files).toEqual([{ path: "engine-presets.json", kind: "engine-presets", presets: 2 }]);
    expect(JSON.parse(fileText(bundle, "engine-presets.json") ?? "")).toEqual({ presets, selections });
    // Not ticked, or nothing kept: no file.
    expect(build({ enginePresets: presets }, { games: true }).files).toEqual([]);
    expect(build({}, { enginePresets: true }).files).toEqual([]);
  });

  it("joins the played games byte for byte, in store order, with their records", () => {
    const games = [played("g1", { resigned: "white" }), played("g2")];
    const bundle = build({ playedGames: games }, { games: true });
    expect(fileText(bundle, "games.pgn")).toBe(`${games[0].pgn}\n\n${games[1].pgn}\n`);
    const entry = bundle.manifest.files[0];
    expect(entry.kind).toBe("games");
    if (entry.kind !== "games") return;
    expect(entry.records.map((record) => [record.id, record.index, record.games, record.resigned])).toEqual([
      ["g1", 0, 1, "white"],
      ["g2", 1, 1, undefined],
    ]);
    expect(entry.records[0].settings).toEqual(DEFAULT_ENGINE_SETTINGS);
  });

  it("records the engine that played a game, and leaves a game without one without (CTA-153)", () => {
    const engine = { id: "stockfish-19-lite-single", name: "Stockfish 19 Lite", version: "19", strength: "elo" as const };
    const bundle = build({ playedGames: [{ ...played("g1"), engine }, played("g2")] }, { games: true });
    const entry = bundle.manifest.files[0];
    if (entry.kind !== "games") throw new Error("expected the games file");
    expect(entry.records[0].engine).toEqual(engine);
    // Additive: a game from before has no key at all, so an older reader sees the manifest it knew.
    expect("engine" in entry.records[1]).toBe(false);
    // And the format is not bumped for it: 3 was the engine presets' file's (CTA-179), 4 Analysis V2's (CTA-186), 5 its links' (CTA-188).
    expect(bundle.manifest.formatVersion).toBe(5);
  });

  it("writes no saved analyses — that category went with the legacy Analysis Board (CTA-192)", () => {
    expect(EXPORT_CATEGORIES).not.toContain("analyses");
    expect(build({}, ALL).files.map((file) => file.path)).not.toContain("analyses.pgn");
  });

  it("writes one repertoire file per folder, plus Unfiled, mapping each game back", () => {
    const bundle = build(
      {
        repertoires: [repertoire("r1", "b"), repertoire("r2", "a"), repertoire("r3", null), repertoire("r4", "a")],
        repertoireFolders: [repFolder("a", "Black repertoire"), repFolder("b", "Alpha"), repFolder("c", "Empty")],
      },
      { repertoires: true },
    );
    expect(bundle.files.map((file) => file.path)).toEqual([
      "repertoires/alpha.pgn",
      "repertoires/black-repertoire.pgn",
      "repertoires/unfiled.pgn",
    ]);
    const entries = bundle.manifest.files.filter((file) => file.kind === "repertoires");
    expect(entries.map((entry) => [entry.folder?.name ?? null, entry.records.map((r) => [r.id, r.index])])).toEqual([
      ["Alpha", [["r1", 0]]],
      ["Black repertoire", [["r2", 0], ["r4", 1]]],
      [null, [["r3", 0]]],
    ]);
    expect(entries[0].records[0]).toMatchObject({ name: "Rep r1", settings: { color: "black" } });
    // Folders are listed whole, the empty one too.
    expect(bundle.manifest.folders.repertoires).toEqual(["Alpha", "Black repertoire", "Empty"]);
  });

  it("counts a legacy multi-game repertoire's games, so later indices stay right", () => {
    const legacy = repertoire("old", null, `${pgn("One")}\n\n${pgn("Two")}`);
    const bundle = build({ repertoires: [legacy, repertoire("new", null)] }, { repertoires: true });
    const entry = bundle.manifest.files[0];
    if (entry.kind !== "repertoires") throw new Error("not a repertoire file");
    expect(entry.records.map((record) => [record.id, record.index, record.games])).toEqual([
      ["old", 0, 2],
      ["new", 2, 1],
    ]);
    expect(splitPgnGames(fileText(bundle, "repertoires/unfiled.pgn") ?? "")).toHaveLength(3);
  });

  it("makes colliding file names unique, and names a non-ASCII one by its id", () => {
    const bundle = build(
      {
        collections: [
          { summary: summary("u1", "My games", "uploaded", 1), games: [pgn("A")] },
          { summary: summary("u2", "My  games!", "uploaded", 1), games: [pgn("B")] },
          { summary: summary("u3", "משחקים", "uploaded", 1), games: [pgn("C")] },
        ],
        repertoires: [repertoire("r1", "x"), repertoire("r2", null)],
        repertoireFolders: [repFolder("x", "Unfiled")],
      },
      { collections: true, repertoires: true },
    );
    expect(bundle.files.map((file) => file.path)).toEqual([
      "collections/my-games.pgn",
      "collections/my-games-2.pgn",
      "collections/u3.pgn",
      // A folder the reader called "Unfiled" does not take Unfiled's file.
      "repertoires/unfiled-2.pgn",
      "repertoires/unfiled.pgn",
    ]);
  });

  it("files the collections in directories mirroring the Library's folders, shipped ones in built-in", () => {
    const bundle = build(
      {
        collections: [
          { summary: summary("s1", "World Cup", "shipped", 1), games: [pgn("S")] },
          { summary: summary("u1", "Najdorf games", "uploaded", 1, "sic"), games: [pgn("A")] },
          { summary: summary("u2", "Loose", "uploaded", 1, null), games: [pgn("B")] },
          { summary: summary("u3", "Orphan", "uploaded", 1, "gone"), games: [pgn("C")] },
          { summary: summary("u4", "Hebrew", "uploaded", 1, "he"), games: [pgn("D")] },
          { summary: summary("u5", "Mine", "uploaded", 1, "bi"), games: [pgn("E")] },
        ],
        collectionFolders: [
          folder("op", "Openings"),
          folder("sic", "Sicilian", "op"),
          folder("empty", "Empty", "op"),
          folder("he", "פתיחות"),
          folder("bi", "Built-in"),
        ],
      },
      { collections: true, shippedCollections: true },
    );
    expect(bundle.files.map((file) => file.path)).toEqual([
      "collections/built-in/world-cup.pgn",
      "collections/openings/sicilian/najdorf-games.pgn",
      "collections/loose.pgn",
      // A folder that is gone is the top level.
      "collections/orphan.pgn",
      // A name with no ASCII is a folder; a reader's "Built-in" does not take Built-in's directory.
      "collections/folder/hebrew.pgn",
      "collections/built-in-2/mine.pgn",
    ]);
    const paths = bundle.manifest.files.map((file) =>
      file.kind === "collection" ? [file.collection.id, file.collection.folderPath] : null,
    );
    expect(paths).toEqual([
      ["s1", undefined],
      ["u1", ["Openings", "Sicilian"]],
      ["u2", []],
      ["u3", []],
      ["u4", ["פתיחות"]],
      ["u5", ["Built-in"]],
    ]);
    // The whole tree rides along, the empty folder too.
    expect(bundle.manifest.folders.collections).toEqual([
      ["Built-in"],
      ["Openings"],
      ["Openings", "Empty"],
      ["Openings", "Sicilian"],
      ["פתיחות"],
    ]);
  });

  it("exports uploaded collections always, and shipped ones only when asked", () => {
    const collections = [
      { summary: summary("world-cup", "World Cup", "shipped", 2), games: [pgn("S1"), pgn("S2")] },
      { summary: summary("u1", "Mine", "uploaded", 1), games: [pgn("U1")] },
    ];
    const without = build({ collections }, { collections: true, shippedCollections: false });
    expect(without.files.map((file) => file.path)).toEqual(["collections/mine.pgn"]);
    expect(without.manifest.includeShippedCollections).toBe(false);

    const withShipped = build({ collections }, { collections: true, shippedCollections: true });
    expect(withShipped.manifest.includeShippedCollections).toBe(true);
    expect(withShipped.manifest.files).toEqual([
      {
        path: "collections/built-in/world-cup.pgn",
        kind: "collection",
        collection: { id: "world-cup", name: "World Cup", source: "shipped", games: 2 },
      },
      {
        path: "collections/mine.pgn",
        kind: "collection",
        collection: { id: "u1", name: "Mine", source: "uploaded", games: 1, folderPath: [] },
      },
    ]);
    expect(fileText(withShipped, "collections/built-in/world-cup.pgn")).toBe(`${pgn("S1")}\n\n${pgn("S2")}\n`);
  });

  it("does not export shipped collections when Collections is not ticked", () => {
    const collections = [{ summary: summary("s", "S", "shipped", 1), games: [pgn("S")] }];
    const bundle = build({ collections }, { shippedCollections: true });
    expect(bundle.files).toEqual([]);
    expect(bundle.manifest.includeShippedCollections).toBe(false);
  });

  it("carries an upload's description and tournament mark beside its games (CTA-121)", () => {
    const described: CollectionSummary = {
      ...summary("u1", "Mine", "uploaded", 1),
      description: "Six rounds.",
      tournament: { enabled: true, type: "swiss" },
    };
    const plain = summary("u2", "Yours", "uploaded", 1);
    const bundle = build({ collections: [{ summary: described, games: [pgn("U")] }, { summary: plain, games: [pgn("V")] }] });
    expect(bundle.manifest.files.map((file) => (file.kind === "collection" ? file.collection : null))).toEqual([
      {
        id: "u1",
        name: "Mine",
        source: "uploaded",
        games: 1,
        folderPath: [],
        description: "Six rounds.",
        tournament: { enabled: true, type: "swiss" },
      },
      // A collection with neither is written without either — an older record, or none made.
      { id: "u2", name: "Yours", source: "uploaded", games: 1, folderPath: [] },
    ]);
  });
});

describe("the helpers", () => {
  it("names the download by the date", () => {
    expect(exportFileName(NOW)).toBe("chessapp-export-2026-09-22.zip");
  });

  it("enables Export only with a category ticked — the shipped box alone is not one", () => {
    expect(hasExportSelection(NONE)).toBe(false);
    expect(hasExportSelection({ ...NONE, shippedCollections: true })).toBe(false);
    expect(hasExportSelection({ ...NONE, repertoires: true })).toBe(true);
  });

  it("filters collections by the shipped toggle", () => {
    const list = [summary("s", "S", "shipped", 1), summary("u", "U", "uploaded", 1)];
    expect(exportedCollections(list, { shippedCollections: false }).map((c) => c.id)).toEqual(["u"]);
    expect(exportedCollections(list, { shippedCollections: true }).map((c) => c.id)).toEqual(["s", "u"]);
  });
});

describe("zipExport", () => {
  it("packs the manifest and every file, which unzip back as written", () => {
    const bundle = build(
      { playedGames: [played("g1")], repertoires: [repertoire("r1", null)] },
      { games: true, repertoires: true },
    );
    const unzipped = unzipSync(zipExport(bundle));
    expect(Object.keys(unzipped)).toEqual(["manifest.json", "games.pgn", "repertoires/unfiled.pgn"]);
    expect(JSON.parse(strFromU8(unzipped["manifest.json"]))).toEqual(bundle.manifest);
    expect(strFromU8(unzipped["games.pgn"])).toBe(fileText(bundle, "games.pgn"));
  });
});
