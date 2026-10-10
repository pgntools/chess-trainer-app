import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { DEFAULT_ANALYSIS_SETTINGS } from "./analysisSettings";
import { buildExport, zipExport, type ExportSelection, type ExportSource } from "./dataExport";
import {
  defaultImportChoices,
  folderKey,
  importPlanOf,
  importWritesOf,
  migrateManifest,
  readImport,
  type ImportCaps,
  type ImportChoices,
  type ImportCurrent,
  type ImportDump,
} from "./dataImport";
import type { EnginePreset } from "./enginePresets";
import { DEFAULT_ENGINE_SETTINGS } from "./engineSettings";
import type { CollectionSummary } from "./libraryCollections";
import type { PlayedGame } from "./playedGames";
import { DEFAULT_REPERTOIRE_SETTINGS } from "./repertoireSettings";
import type { SavedAnalysis } from "./savedAnalyses";
import type { GameFolder } from "./savedGameFolders";
import type { RepertoireFolder } from "./savedRepertoireFolders";
import type { SavedRepertoire } from "./savedRepertoires";

/*
  The import's pure layer (CTA-89): a zip read back, checked, migrated, laid
  beside the app, and turned into writes by the reader's choices. The zips
  are the export's own (`buildExport` + `zipExport`), so the round trip is
  the real one.
*/

const NOW = new Date(2026, 8, 23, 12, 0, 0);
const AT = "2026-09-01T00:00:00.000Z";
const LATER = "2026-09-10T00:00:00.000Z";

const pgn = (event: string, moves = "1. e4 e5 *") =>
  `[Event "${event}"]\n[White "W"]\n[Black "B"]\n[Result "*"]\n\n${moves}`;

const played = (id: string, updatedAt = AT): PlayedGame => ({
  id,
  pgn: pgn(`Played ${id}`),
  settings: DEFAULT_ENGINE_SETTINGS,
  path: ["e4"],
  savedAt: AT,
  updatedAt,
  resigned: "black",
});

const analysis = (id: string, folderId: string | null, extra: Partial<SavedAnalysis> = {}): SavedAnalysis => ({
  id,
  pgn: pgn(`Analysis ${id}`, "1. d4 (1. c4) d5 *"),
  settings: DEFAULT_ANALYSIS_SETTINGS,
  path: ["d4", "d5"],
  orientation: "black",
  description: `notes on ${id}`,
  showArrows: false,
  arrowWidthSource: "eval",
  arrowPalette: "colorblind",
  showMoveMarks: false,
  name: `Analysis ${id}`,
  folderId,
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

const repertoire = (id: string, folderId: string | null, extra: Partial<SavedRepertoire> = {}): SavedRepertoire => ({
  id,
  name: `Rep ${id}`,
  pgn: pgn(`Rep ${id}`),
  previewFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  stats: { moves: 1, variations: 0 },
  settings: { ...DEFAULT_REPERTOIRE_SETTINGS, color: "black" },
  folderId,
  savedAt: AT,
  updatedAt: AT,
  ...extra,
});

const repFolder = (id: string, name: string): RepertoireFolder => ({ id, name, savedAt: AT, updatedAt: AT });

const uploaded = (id: string, name: string, folderId: string | null = null): CollectionSummary => ({
  id,
  name,
  source: "uploaded",
  count: 2,
  addedAt: AT,
  folderId,
});

/** What the exporting app held: every category, nested and empty folders, a shipped collection. */
const SOURCE: ExportSource = {
  playedGames: [played("g2", LATER), played("g1")],
  analyses: [analysis("a1", null), analysis("a2", "fo"), analysis("a3", "fs")],
  analysisFolders: [folder("fo", "Openings"), folder("fs", "Sicilian", "fo"), folder("fe", "Endgames")],
  repertoires: [repertoire("r1", "rw"), repertoire("r2", null)],
  repertoireFolders: [repFolder("rw", "White"), repFolder("rb", "Black")],
  collections: [
    { summary: uploaded("u1", "Club games", "lc"), games: [pgn("Club 1"), pgn("Club 2")] },
    { summary: uploaded("u2", "Loose"), games: [pgn("Loose 1"), pgn("Loose 2")] },
    { summary: { id: "worldcup", name: "World Cup", source: "shipped", count: 1 }, games: [pgn("WC")] },
  ],
  collectionFolders: [folder("lc", "Club"), folder("lb", "Blitz", "lc")],
  enginePresets: [],
  enginePresetSelections: [],
};

const ALL: ExportSelection = {
  collections: true,
  games: true,
  analyses: true,
  repertoires: true,
  enginePresets: true,
  shippedCollections: true,
};

const zipOf = (source: Partial<ExportSource> = SOURCE, selection: ExportSelection = ALL) =>
  zipExport(
    buildExport(
      {
        playedGames: [],
        analyses: [],
        analysisFolders: [],
        repertoires: [],
        repertoireFolders: [],
        collections: [],
        collectionFolders: [],
        enginePresets: [],
        enginePresetSelections: [],
        ...source,
      },
      selection,
      { appVersion: "9.9.9", now: NOW },
    ),
  );

const EMPTY: ImportCurrent = {
  playedGames: [],
  analyses: [],
  analysisFolders: [],
  repertoires: [],
  repertoireFolders: [],
  collections: [],
  collectionFolders: [],
  enginePresets: [],
  enginePresetSelections: [],
};

/** The exporting app as the import sees it — what a second import of the same zip meets. */
const SAME: ImportCurrent = {
  playedGames: SOURCE.playedGames,
  analyses: SOURCE.analyses,
  analysisFolders: SOURCE.analysisFolders,
  repertoires: SOURCE.repertoires,
  repertoireFolders: SOURCE.repertoireFolders,
  collections: SOURCE.collections.filter((c) => c.summary.source === "uploaded").map((c) => c.summary),
  collectionFolders: SOURCE.collectionFolders,
  enginePresets: SOURCE.enginePresets,
  enginePresetSelections: SOURCE.enginePresetSelections,
};

const CAPS: ImportCaps = { playedGames: 100, analyses: 20_000, repertoires: 500, folders: 100, enginePresets: 50 };

const dumpOf = (bytes: Uint8Array = zipOf()): ImportDump => {
  const reading = readImport(bytes);
  if (!reading.ok) throw new Error(`unreadable: ${JSON.stringify(reading.problem)}`);
  return reading.dump;
};

/** A minted id per call, in order — so a test can say which folder is which. */
const ids = () => {
  let n = 0;
  return () => `new${(n += 1)}`;
};

const writesOf = (dump: ImportDump, current: ImportCurrent, choices?: Partial<ImportChoices>, caps = CAPS) =>
  importWritesOf(dump, current, { ...defaultImportChoices(importPlanOf(dump, current)), ...choices }, {
    caps,
    now: NOW,
    newId: ids(),
  });

/** A zip with its manifest rewritten, the other files kept. */
const rezip = (bytes: Uint8Array, edit: (manifest: Record<string, unknown>) => unknown, drop: string[] = []) => {
  const files = unzipSync(bytes);
  const manifest = JSON.parse(strFromU8(files["manifest.json"])) as Record<string, unknown>;
  for (const path of drop) delete files[path];
  return zipSync({ ...files, "manifest.json": strToU8(JSON.stringify(edit(manifest))) });
};

describe("reading a zip", () => {
  it("reads back every category, every folder by its path, and counts the shipped collections", () => {
    const dump = dumpOf();
    expect(dump.appVersion).toBe("9.9.9");
    expect(dump.categories).toEqual(["collections", "games", "analyses", "repertoires", "enginePresets"]);
    expect(dump.games).toEqual(SOURCE.playedGames);
    expect(dump.analyses.map(({ record, folder }) => [record.id, folder])).toEqual([
      ["a1", []],
      ["a2", ["Openings"]],
      ["a3", ["Openings", "Sicilian"]],
    ]);
    // Everything a record carries beside its folder comes back.
    expect(dump.analyses[0].record).toEqual(analysis("a1", null));
    expect(dump.analysisFolders).toEqual([["Endgames"], ["Openings"], ["Openings", "Sicilian"]]);
    expect(dump.repertoires.map(({ record, folder }) => [record, folder])).toEqual([
      [repertoire("r1", null), ["White"]],
      [repertoire("r2", null), []],
    ]);
    expect(dump.repertoireFolders).toEqual([["Black"], ["White"]]);
    expect(dump.collections).toEqual([
      { record: { id: "u1", name: "Club games", games: [pgn("Club 1"), pgn("Club 2")] }, folder: ["Club"] },
      { record: { id: "u2", name: "Loose", games: [pgn("Loose 1"), pgn("Loose 2")] }, folder: [] },
    ]);
    expect(dump.collectionFolders).toEqual([["Club"], ["Club", "Blitz"]]);
    expect(dump.shippedCollections).toBe(1);
  });

  it("reads the engine that played a game back, a game without one still reading as the default's (CTA-153)", () => {
    const engine = { id: "stockfish-19-lite-single", name: "Stockfish 19 Lite", version: "19", strength: "elo" as const };
    const dump = dumpOf(zipOf({ playedGames: [{ ...played("g1"), engine }, played("g2")] }));
    expect(dump.games[0].engine).toEqual(engine);
    expect(dump.games[1].engine).toBeUndefined();
    // The Elo setting rides in `settings`, whole.
    expect(dump.games[0].settings.elo).toBe(DEFAULT_ENGINE_SETTINGS.elo);
  });

  it("reads a collection's description and tournament mark back (CTA-121)", () => {
    const bytes = zipOf({
      collections: [
        {
          summary: {
            ...uploaded("u1", "Club games", "lc"),
            description: "Six rounds.",
            tournament: { enabled: true, type: "roundRobin" },
          },
          games: [pgn("Club 1"), pgn("Club 2")],
        },
      ],
      collectionFolders: [folder("lc", "Club")],
    });
    expect(dumpOf(bytes).collections).toEqual([
      {
        record: {
          id: "u1",
          name: "Club games",
          games: [pgn("Club 1"), pgn("Club 2")],
          description: "Six rounds.",
          tournament: { enabled: true, type: "roundRobin" },
        },
        folder: ["Club"],
      },
    ]);
    // A mark not shaped as one is refused, not read.
    const broken = rezip(bytes, (m) => ({
      ...m,
      files: (m.files as Record<string, unknown>[]).map((file) =>
        file.kind === "collection"
          ? { ...file, collection: { ...(file.collection as Record<string, unknown>), tournament: { enabled: true } } }
          : file,
      ),
    }));
    expect(readImport(broken)).toMatchObject({ ok: false, problem: { kind: "unreadable", path: "collections/club/club-games.pgn" } });
  });

  it("accepts the formats CTA-142 added, and an older zip's type unchanged", () => {
    for (const type of ["knockout", "doubleElimination", "match", "teamSwiss", "teamKnockout", "arena", "swiss"] as const) {
      const bytes = zipOf({
        collections: [{ summary: { ...uploaded("u1", "Cup"), tournament: { enabled: true, type } }, games: [pgn("Cup 1")] }],
      });
      expect(dumpOf(bytes).collections[0].record).toMatchObject({ tournament: { enabled: true, type } });
    }
  });

  it("reads a version-1 zip through the table — its collections simply without the settings (CTA-121)", () => {
    const v1 = rezip(
      zipOf({
        collections: [
          {
            summary: { ...uploaded("u1", "Club games"), description: "Six rounds.", tournament: { enabled: true, type: "swiss" } },
            games: [pgn("Club 1"), pgn("Club 2")],
          },
        ],
      }),
      (m) => ({
        ...m,
        formatVersion: 1,
        files: (m.files as Record<string, unknown>[]).map((file) => {
          if (file.kind !== "collection") return file;
          const collection = { ...(file.collection as Record<string, unknown>) };
          delete collection.description;
          delete collection.tournament;
          return { ...file, collection };
        }),
      }),
    );
    const dump = dumpOf(v1);
    expect(dump.collections).toEqual([
      { record: { id: "u1", name: "Club games", games: [pgn("Club 1"), pgn("Club 2")] }, folder: [] },
    ]);
    // The same zip stamped past this build's version is refused as newer.
    expect(readImport(rezip(v1, (m) => ({ ...m, formatVersion: 4 })))).toMatchObject({
      ok: false,
      problem: { kind: "newer", version: 4 },
    });
  });


  it("cuts a legacy multi-game repertoire back out whole", () => {
    const legacy = repertoire("r9", null, { pgn: `${pgn("One")}\n\n${pgn("Two")}` });
    const dump = dumpOf(zipOf({ repertoires: [legacy, repertoire("r8", null)] }));
    expect(dump.repertoires.map(({ record }) => record.pgn)).toEqual([legacy.pgn, pgn("Rep r8")]);
  });

  it("cuts out a game whose tags do not open with Event, and a repertoire with no tags at all", () => {
    // `treeToPgn` writes a game from a set-up position with `SetUp`/`FEN` first;
    // `splitPgnGames` alone would glue it onto the game before it.
    const fromPosition: PlayedGame = {
      ...played("g3"),
      pgn: `[SetUp "1"]\n[FEN "rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1"]\n${pgn("Played g3", "1. Nc3 Qa5 *")}`,
    };
    const bare = repertoire("r9", null, { pgn: "1. e4 e5 2. Nf3 *" });
    const dump = dumpOf(
      zipOf({
        playedGames: [played("g1"), fromPosition, played("g2")],
        repertoires: [repertoire("r1", null), bare, repertoire("r2", null)],
      }),
    );
    expect(dump.games.map((game) => [game.id, game.pgn])).toEqual([
      ["g1", played("g1").pgn],
      ["g3", fromPosition.pgn],
      ["g2", played("g2").pgn],
    ]);
    expect(dump.repertoires.map(({ record }) => [record.id, record.pgn])).toEqual([
      ["r1", pgn("Rep r1")],
      ["r9", bare.pgn],
      ["r2", pgn("Rep r2")],
    ]);
  });

  it("holds only the categories the manifest lists", () => {
    const dump = dumpOf(zipOf(SOURCE, { ...ALL, collections: false, repertoires: false, enginePresets: false }));
    expect(dump.categories).toEqual(["games", "analyses"]);
    expect(importPlanOf(dump, EMPTY).categories).toEqual({
      games: expect.anything(),
      analyses: expect.anything(),
    });
  });

  it.each([
    ["not a zip", strToU8("hello"), { kind: "not-zip" }],
    ["no manifest", zipSync({ "games.pgn": strToU8(pgn("x")) }), { kind: "no-manifest" }],
    ["a manifest that is not JSON", zipSync({ "manifest.json": strToU8("{") }), { kind: "malformed" }],
    ["someone else's format", rezip(zipOf(), (m) => ({ ...m, format: "other" })), { kind: "foreign" }],
    ["a newer version", rezip(zipOf(), (m) => ({ ...m, formatVersion: 4 })), { kind: "newer", version: 4 }],
    ["no version", rezip(zipOf(), (m) => ({ ...m, formatVersion: undefined })), { kind: "malformed" }],
    ["no files list", rezip(zipOf(), (m) => ({ ...m, files: undefined })), { kind: "malformed" }],
    ["a missing file", rezip(zipOf(), (m) => m, ["analyses.pgn"]), { kind: "missing-file", path: "analyses.pgn" }],
    [
      "records that do not add up to the file",
      rezip(zipOf(), (m) => ({
        ...m,
        files: (m.files as { path: string; records?: unknown[] }[]).map((f) =>
          f.path === "games.pgn" ? { ...f, records: f.records?.slice(1) } : f,
        ),
      })),
      { kind: "unreadable", path: "games.pgn" },
    ],
    [
      "a record that will not read",
      rezip(zipOf(), (m) => ({
        ...m,
        files: (m.files as { path: string; records?: Record<string, unknown>[] }[]).map((f) =>
          f.path === "analyses.pgn" ? { ...f, records: f.records?.map((r) => ({ ...r, id: "" })) } : f,
        ),
      })),
      { kind: "unreadable", path: "analyses.pgn" },
    ],
    [
      "a collection whose games do not match its count",
      rezip(zipOf(), (m) => ({
        ...m,
        files: (m.files as { kind: string; collection?: Record<string, unknown> }[]).map((f) =>
          f.kind === "collection" && f.collection?.id === "u2" ? { ...f, collection: { ...f.collection, games: 5 } } : f,
        ),
      })),
      { kind: "unreadable", path: "collections/loose.pgn" },
    ],
  ])("refuses %s, listing the zip's PGN files", (_name, bytes, problem) => {
    const reading = readImport(bytes);
    expect(reading).toMatchObject({ ok: false, problem });
    if (!reading.ok && problem.kind !== "not-zip" && problem.kind !== "no-manifest" && problem.kind !== "malformed") {
      expect(reading.pgnFiles).toContain("games.pgn");
      expect(reading.pgnFiles).not.toContain("manifest.json");
    }
  });
});

describe("migrations", () => {
  it("passes the current version through unchanged", () => {
    const manifest = { format: "chessapp-export", formatVersion: 3 };
    expect(migrateManifest(manifest)).toBe(manifest);
  });

  it("runs each version's upgrade in turn, and refuses a gap or a newer version", () => {
    const migrations = {
      1: (m: Record<string, unknown>) => ({ ...m, formatVersion: 2, renamed: m.old }),
      2: (m: Record<string, unknown>) => ({ ...m, formatVersion: 3 }),
    };
    expect(migrateManifest({ formatVersion: 1, old: "x" }, { migrations, version: 3 })).toEqual({
      formatVersion: 3,
      old: "x",
      renamed: "x",
    });
    expect(migrateManifest({ formatVersion: 1 }, { migrations: { 1: migrations[1] }, version: 3 })).toBeUndefined();
    expect(migrateManifest({ formatVersion: 1 }, { migrations: { 1: (m) => m }, version: 2 })).toBeUndefined();
    expect(migrateManifest({ formatVersion: 4 }, { migrations, version: 3 })).toBe("newer");
    expect(migrateManifest({ formatVersion: 0 })).toBeUndefined();
  });

  it("reads an older zip through the table", () => {
    // Pretend this build reads version 3, where version 2 renamed `files` from `entries`
    // — one step above the real v1 → v2 (the collections' settings, CTA-121).
    const older = rezip(zipOf({ playedGames: [played("g1")] }, { ...ALL, collections: false }), (m) => {
      const { files, ...rest } = m;
      return { ...rest, entries: files, formatVersion: 2 };
    });
    const migrations = {
      2: ({ entries, ...rest }: Record<string, unknown>) => ({ ...rest, files: entries, formatVersion: 3 }),
    };
    const reading = readImport(older, { migrations, version: 3 });
    expect(reading.ok && reading.dump.games.map((game) => game.id)).toEqual(["g1"]);
    // Without the migration the same zip is not readable.
    expect(readImport(older, { version: 3 })).toMatchObject({ ok: false, problem: { kind: "malformed" } });
  });
});

describe("into an empty app", () => {
  it("gives back every record, folder (empty ones too) and filing", () => {
    const writes = writesOf(dumpOf(), EMPTY);

    expect(writes.games?.writes).toEqual({ add: SOURCE.playedGames, remove: [] });

    const analyses = writes.analyses?.writes;
    const pathOf = (id: string | null, folders: readonly GameFolder[]): string[] => {
      const found = folders.find((f) => f.id === id);
      return found === undefined ? [] : [...pathOf(found.parentId, folders), found.name];
    };
    expect(analyses?.folders.map((f) => pathOf(f.id, analyses.folders))).toEqual([
      ["Endgames"],
      ["Openings"],
      ["Openings", "Sicilian"],
    ]);
    expect(analyses?.add.map((a) => [a.id, pathOf(a.folderId, analyses.folders)])).toEqual([
      ["a1", []],
      ["a2", ["Openings"]],
      ["a3", ["Openings", "Sicilian"]],
    ]);
    expect(analyses?.add[2]).toEqual({ ...analysis("a3", null), folderId: analyses?.add[2].folderId });

    const repertoires = writes.repertoires?.writes;
    expect(repertoires?.folders.map((f) => f.name)).toEqual(["Black", "White"]);
    const white = repertoires?.folders.find((f) => f.name === "White")?.id;
    expect(repertoires?.add).toEqual([repertoire("r1", white ?? "?"), repertoire("r2", null)]);

    const collections = writes.collections?.writes;
    expect(collections?.folders.map((f) => pathOf(f.id, collections.folders))).toEqual([["Club"], ["Club", "Blitz"]]);
    expect(collections?.add.map((c) => [c.id, c.name, c.games.length, pathOf(c.folderId, collections.folders)])).toEqual([
      ["u1", "Club games", 2, ["Club"]],
      ["u2", "Loose", 2, []],
    ]);
    // The shipped one is never among them.
    expect(collections?.add.map((c) => c.id)).not.toContain("worldcup");

    expect(writes.analyses?.report).toEqual({ added: 3, replaced: 0, skipped: 0, folders: 3 });
  });

  it("writes nothing of a category left unticked", () => {
    const dump = dumpOf();
    const choices = defaultImportChoices(importPlanOf(dump, EMPTY));
    const writes = importWritesOf(dump, EMPTY, { ...choices, games: { ...choices.games, ticked: false } }, { caps: CAPS });
    expect(writes.games).toBeUndefined();
    expect(writes.analyses).toBeDefined();
  });
});

describe("conflicts", () => {
  it("are folders in both by their path, the top level always there, the played games as a whole", () => {
    const current: ImportCurrent = {
      ...EMPTY,
      playedGames: [played("x1")],
      analyses: [analysis("x2", "mine-openings"), analysis("x3", "gone")],
      analysisFolders: [folder("mine-openings", "Openings"), folder("mine-sic", "Najdorf", "mine-openings")],
      repertoireFolders: [repFolder("mine-black", "Black")],
    };
    const plan = importPlanOf(dumpOf(), current);
    expect(plan.categories.games?.conflicts).toEqual([{ key: "[]", path: [], incoming: 2, existing: 1 }]);
    // A record filed in a folder that is gone counts at the top level.
    expect(plan.categories.analyses?.conflicts).toEqual([
      { key: "[]", path: [], incoming: 1, existing: 1 },
      { key: folderKey(["Openings"]), path: ["Openings"], incoming: 1, existing: 1 },
    ]);
    // An empty folder of the dump's still clashes.
    expect(plan.categories.repertoires?.conflicts).toEqual([
      { key: "[]", path: [], incoming: 1, existing: 0 },
      { key: folderKey(["Black"]), path: ["Black"], incoming: 0, existing: 0 },
    ]);
    expect(plan.categories.collections?.conflicts).toEqual([{ key: "[]", path: [], incoming: 1, existing: 0 }]);
    expect(plan.shippedCollections).toBe(1);
  });
});

describe("the choices", () => {
  /** The app: an Openings folder holding a1 (changed since) and its own x1; Unfiled holding x2. */
  const current: ImportCurrent = {
    ...EMPTY,
    analyses: [
      analysis("a1", "mine", { name: "Changed here" }),
      analysis("x1", "mine"),
      analysis("x2", null),
    ],
    analysisFolders: [folder("mine", "Openings")],
  };
  const dump = () => dumpOf(zipOf({ analyses: SOURCE.analyses, analysisFolders: SOURCE.analysisFolders }));
  const choose = (choice: "merge" | "override" | "skip", folders: Record<string, "merge" | "override" | "skip"> = {}) =>
    ({ analyses: { ticked: true, choice, folders } }) as Partial<ImportChoices>;

  it("Merge adds into the existing folder and keeps a record the app already has", () => {
    const writes = writesOf(dump(), current, choose("merge"));
    expect(writes.analyses?.writes.remove).toEqual([]);
    expect(writes.analyses?.writes.add.map((a) => [a.id, a.folderId])).toEqual([
      ["a2", "mine"],
      ["a3", "new2"],
    ]);
    // Endgames and Sicilian (under the app's Openings) are new; Openings is not.
    expect(writes.analyses?.writes.folders.map((f) => [f.id, f.name, f.parentId])).toEqual([
      ["new1", "Endgames", null],
      ["new2", "Sicilian", "mine"],
    ]);
    expect(writes.analyses?.report).toEqual({ added: 2, replaced: 0, skipped: 1, folders: 2 });
  });

  it("Override replaces the folder's records, and a same-id record anywhere, with the dump's", () => {
    const writes = writesOf(dump(), current, choose("override"));
    expect(new Set(writes.analyses?.writes.remove)).toEqual(new Set(["a1", "x1", "x2"]));
    expect(writes.analyses?.writes.add.map((a) => [a.id, a.name, a.folderId])).toEqual([
      ["a1", "Analysis a1", null],
      ["a2", "Analysis a2", "mine"],
      ["a3", "Analysis a3", "new2"],
    ]);
    expect(writes.analyses?.report).toEqual({ added: 3, replaced: 3, skipped: 0, folders: 2 });
  });

  it("Skip writes nothing into a clashing folder, but still creates the new ones", () => {
    const writes = writesOf(dump(), current, choose("skip"));
    expect(writes.analyses?.writes.add.map((a) => a.id)).toEqual(["a3"]);
    expect(writes.analyses?.writes.folders.map((f) => f.name)).toEqual(["Endgames", "Sicilian"]);
    expect(writes.analyses?.report).toEqual({ added: 1, replaced: 0, skipped: 2, folders: 2 });
  });

  it("a folder's own choice beats the category's", () => {
    const writes = writesOf(dump(), current, choose("skip", { [folderKey(["Openings"])]: "override" }));
    expect(new Set(writes.analyses?.writes.remove)).toEqual(new Set(["a1", "x1"]));
    expect(writes.analyses?.writes.add.map((a) => a.id)).toEqual(["a2", "a3"]);
    expect(writes.analyses?.report).toEqual({ added: 2, replaced: 2, skipped: 1, folders: 2 });
  });

  it("the played games clash as a whole", () => {
    const dumped = dumpOf(zipOf({ playedGames: SOURCE.playedGames }));
    const withGames: ImportCurrent = { ...EMPTY, playedGames: [played("g1"), played("x1")] };
    const games = (choice: "merge" | "override" | "skip") =>
      writesOf(dumped, withGames, { games: { ticked: true, choice, folders: {} } }).games;
    expect(games("merge")?.writes).toEqual({ add: [played("g2", LATER)], remove: [] });
    expect(games("override")?.writes.remove.sort()).toEqual(["g1", "x1"]);
    expect(games("override")?.writes.add).toEqual(SOURCE.playedGames);
    expect(games("skip")?.writes).toEqual({ add: [], remove: [] });
  });

  it("re-importing the same zip with Merge changes nothing", () => {
    const writes = writesOf(dumpOf(), SAME);
    for (const category of ["games", "analyses", "repertoires", "collections"] as const) {
      const planned = writes[category]?.writes;
      expect(planned?.add, category).toEqual([]);
      expect(planned?.remove, category).toEqual([]);
      expect(planned && "folders" in planned ? planned.folders : [], category).toEqual([]);
    }
  });
});

describe("caps", () => {
  it("refuses a category that would pass its records' cap", () => {
    const writes = writesOf(dumpOf(), { ...EMPTY, repertoires: [repertoire("x1", null)] }, {}, { ...CAPS, repertoires: 2 });
    expect(writes.repertoires?.refused).toEqual({ kind: "records", max: 2, total: 3 });
    expect(writes.analyses?.refused).toBeUndefined();
  });

  it("refuses a category that would pass its folders' cap", () => {
    const current: ImportCurrent = { ...EMPTY, collectionFolders: [folder("x", "Mine")] };
    const writes = writesOf(dumpOf(), current, {}, { ...CAPS, folders: 2 });
    expect(writes.collections?.refused).toEqual({ kind: "folders", max: 2, total: 3 });
    expect(writes.analyses?.refused).toEqual({ kind: "folders", max: 2, total: 3 });
    expect(writes.repertoires?.refused).toBeUndefined();
  });

  it("warns that the played games' oldest will be dropped, and refuses nothing", () => {
    const writes = writesOf(dumpOf(), { ...EMPTY, playedGames: [played("x1"), played("x2")] }, {}, { ...CAPS, playedGames: 3 });
    expect(writes.games?.refused).toBeUndefined();
    expect(writes.games?.dropsOldest).toBe(1);
  });
});

describe("the engine presets (CTA-179)", () => {
  const preset = (id: string, values: EnginePreset["values"] = {}, name = id): EnginePreset => ({
    id,
    name,
    values,
    savedAt: AT,
    updatedAt: AT,
  });
  const select = (engine: string, presetId: string) => ({ id: engine, presetId, updatedAt: AT });
  const PRESETS = [preset("default", { UCI_ShowWDL: true }, "Default"), preset("deep", { "Move Overhead": 100, SyzygyPath: "/tb" })];
  const SELECTIONS = [select("stockfish-19-lite-single", "deep"), select("hosted:sf19", "default")];
  const presetsZip = () => zipOf({ enginePresets: PRESETS, enginePresetSelections: SELECTIONS }, { ...ALL, collections: false });

  it("travel as one JSON file and come back as they were — every value in its type", () => {
    const dump = dumpOf(presetsZip());
    expect(dump.categories).toContain("enginePresets");
    expect(dump.enginePresets).toEqual(PRESETS);
    expect(dump.enginePresetSelections).toEqual(SELECTIONS);
    expect(importPlanOf(dump, EMPTY).categories.enginePresets).toEqual({
      count: 2,
      conflicts: [{ key: folderKey([]), path: [], incoming: 2, existing: 0 }],
    });
  });

  it("come into an empty app whole, with each engine's selection", () => {
    const planned = writesOf(dumpOf(presetsZip()), EMPTY).enginePresets;
    expect(planned?.writes).toEqual({
      add: PRESETS,
      remove: [],
      select: SELECTIONS.map((selection) => ({ ...selection, updatedAt: NOW.toISOString() })),
    });
    expect(planned?.report).toEqual({ added: 2, replaced: 0, skipped: 0, folders: 0 });
  });

  it("Merge keeps a preset and a selection the app has; Override replaces them; Skip writes nothing", () => {
    const app: ImportCurrent = {
      ...EMPTY,
      enginePresets: [preset("deep", { Hash: 64 }, "mine")],
      enginePresetSelections: [select("stockfish-19-lite-single", "default")],
    };
    const dump = dumpOf(presetsZip());
    const choose = (choice: "merge" | "override" | "skip") =>
      writesOf(dump, app, { enginePresets: { ticked: true, choice, folders: {} } }).enginePresets?.writes;

    expect(choose("merge")).toEqual({
      add: [PRESETS[0]],
      remove: [],
      select: [{ ...SELECTIONS[1], updatedAt: NOW.toISOString() }],
    });
    expect(choose("override")).toEqual({
      add: PRESETS,
      remove: ["deep"],
      select: SELECTIONS.map((selection) => ({ ...selection, updatedAt: NOW.toISOString() })),
    });
    expect(choose("skip")).toEqual({ add: [], remove: [], select: [] });
  });

  it("re-importing the same zip with Merge changes nothing", () => {
    const writes = writesOf(dumpOf(presetsZip()), { ...EMPTY, enginePresets: PRESETS, enginePresetSelections: SELECTIONS });
    expect(writes.enginePresets?.writes).toEqual({ add: [], remove: [], select: [] });
  });

  it("refuses the category past the library's cap", () => {
    const planned = writesOf(dumpOf(presetsZip()), EMPTY, undefined, { ...CAPS, enginePresets: 1 }).enginePresets;
    expect(planned?.refused).toEqual({ kind: "records", max: 1, total: 2 });
  });

  it("read a version-2 zip — from before them — through the table", () => {
    const v2 = rezip(zipOf({ playedGames: [played("g1")] }, { ...ALL, collections: false, enginePresets: false }), (m) => ({
      ...m,
      formatVersion: 2,
    }));
    const dump = dumpOf(v2);
    expect(dump.games.map((game) => game.id)).toEqual(["g1"]);
    expect(dump.enginePresets).toEqual([]);
    expect(dump.categories).not.toContain("enginePresets");
  });

  it("refuse a file that does not hold what the manifest counts, or a preset that will not read", () => {
    const miscounted = rezip(presetsZip(), (m) => ({
      ...m,
      files: (m.files as Record<string, unknown>[]).map((file) => (file.kind === "engine-presets" ? { ...file, presets: 5 } : file)),
    }));
    expect(readImport(miscounted)).toMatchObject({ ok: false, problem: { kind: "unreadable", path: "engine-presets.json" } });

    const files = unzipSync(presetsZip());
    files["engine-presets.json"] = strToU8(JSON.stringify({ presets: [{ name: "no id" }], selections: [] }));
    expect(readImport(zipSync(files))).toMatchObject({ ok: false, problem: { kind: "unreadable" } });
  });
});
