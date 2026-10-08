import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";

import { approximateElo, DEFAULT_ENGINE_SETTINGS } from "./engineSettings";
import { isReferenceRead, loadReferencedGames, resolveGameReference } from "./gameReference";
import { parsePgnTree } from "./pgn";
import {
  findPlayedGame,
  importPlayedGames,
  loadPlayedGames,
  MAX_PLAYED_GAMES,
  playedGamesSnapshot,
  removePlayedGame,
  resetPlayedGameStore,
  savePlayedGame,
} from "./playedGameStore";
import { MASK_PRESETS, withMaskEntry } from "./pieceMask";
import {
  DEFAULT_PLAYED_GAME_ENGINE,
  playedGameEngineFrom,
  playedGameEngineFromDescriptor,
  playedGameEngineOf,
  playedGameFen,
  playedGameFrom,
  playedGameHeaders,
  samePlayedGameEngine,
  type PlayedGameEngine,
  resultOfFen,
  playedGameOf,
  playedGameSummary,
  playedGameToTree,
  sortedPlayedGames,
  type PlayedGameRow,
} from "./playedGames";

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

const at = (iso: string) => new Date(iso);

/** A record of `pgn` standing at `path`, written at `when`. */
const record = (id: string, pgn: string, path: string[] = [], when = "2026-01-01T10:00:00Z") =>
  // The session carries the day the game began; only `now` moves on.
  playedGameOf(
    id,
    parsePgnTree(pgn),
    path,
    DEFAULT_ENGINE_SETTINGS,
    undefined,
    at(when),
    "2026-01-01T10:00:00.000Z",
  );


describe("a played game, written down and read back", () => {
  it("keeps the side lines, the place in the tree and the settings", () => {
    const game = playedGameOf(
      "p1",
      parsePgnTree("1. e4 (1. d4 d5) 1... e5 *"),
      ["e4"],
      { ...DEFAULT_ENGINE_SETTINGS, playAs: "black", skillLevel: 4 },
    );
    expect(game.pgn).toContain("(1. d4 d5)");
    expect(game.pgn).toContain('[White "Stockfish 19 Lite (Elo 2100)"]');
    expect(game.pgn).toContain('[Black "Player"]');
    const tree = playedGameToTree(game)!;
    expect(playedGameFen(game, tree)).toBe(AFTER_E4);
  });

  it("writes the result of the mainline", () => {
    const mate = record("m", "1. f3 e5 2. g4 Qh4# 0-1");
    expect(mate.pgn).toContain('[Result "0-1"]');
    expect(playedGameSummary(mate, playedGameToTree(mate)).result).toBe("0-1");
  });

  it("writes a resignation as the result, the side that resigned losing", () => {
    const game = playedGameOf(
      "r",
      parsePgnTree("1. e4 e5 *"),
      [],
      DEFAULT_ENGINE_SETTINGS,
      undefined,
      new Date(),
      undefined,
      "white",
    );
    expect(game.pgn).toContain('[Result "0-1"]');
    expect(game.pgn).toContain('[Termination "White resigns"]');
    expect(game.pgn.trim().endsWith("0-1")).toBe(true);
    expect(game.resigned).toBe("white");
    expect(playedGameFrom(JSON.parse(JSON.stringify(game)))?.resigned).toBe("white");
    expect(playedGameSummary(game, playedGameToTree(game)).result).toBe("0-1");
  });

  it("keeps an eval per position the tree reaches, and none it does not", () => {
    const evals = new Map([
      [AFTER_E4, { kind: "cp" as const, value: 30 }],
      ["8/8/8/8/8/8/8/K6k w - - 0 1", { kind: "cp" as const, value: 0 }],
    ]);
    const game = playedGameOf("e", parsePgnTree("1. e4 *"), [], DEFAULT_ENGINE_SETTINGS, evals);
    expect(game.evals).toEqual([{ fen: AFTER_E4, kind: "cp", value: 30 }]);
  });

  it("reads a stored row field by field, and refuses one with no PGN", () => {
    const back = playedGameFrom({
      id: "x",
      pgn: "1. e4 *",
      savedAt: "a",
      updatedAt: "b",
      path: ["e4", 3],
      evals: [{ fen: AFTER_E4, kind: "cp", value: 1 }, { fen: "", kind: "cp", value: 2 }],
    });
    expect(back?.path).toEqual(["e4"]);
    expect(back?.settings).toEqual(DEFAULT_ENGINE_SETTINGS);
    expect(back?.evals).toHaveLength(1);
    expect(playedGameFrom({ id: "x", savedAt: "a", updatedAt: "b" })).toBeUndefined();
  });

  it("summarises the mainline's length and the side lines", () => {
    const game = record("s", "1. e4 (1. d4) 1... e5 (1... c5) 2. Nf3 *");
    expect(playedGameSummary(game, playedGameToTree(game))).toMatchObject({
      moves: 2,
      variations: 2,
      playAs: "white",
    });
    expect(playedGameSummary(game, playedGameToTree(game)).result).toBe("*");
  });

  it("names each side for the table, with the engine's Elo on its own side (CTA-100)", () => {
    const settings = { ...DEFAULT_ENGINE_SETTINGS, playAs: "white" as const, elo: 1750 };
    const asWhite = playedGameOf("w", parsePgnTree("1. e4 *"), [], settings);
    const white = playedGameSummary(asWhite, playedGameToTree(asWhite));
    expect(white.whiteName).toBe("human");
    expect(white.blackName).toBe("engine");
    expect(white.whiteElo).toBeUndefined();
    expect(white.blackElo).toBe(1750);

    const asBlack = playedGameOf("b", parsePgnTree("1. e4 *"), [], { ...settings, playAs: "black" });
    const black = playedGameSummary(asBlack, playedGameToTree(asBlack));
    expect(black.whiteName).toBe("engine");
    expect(black.blackName).toBe("human");
    expect(black.whiteElo).toBe(1750);
    expect(black.blackElo).toBeUndefined();

    // The sides and the settings are the record's, so an unreadable game keeps them.
    expect(playedGameSummary(asWhite, undefined).whiteName).toBe("human");
    expect(playedGameSummary(asWhite, undefined).blackElo).toBe(1750);
  });
});

describe("the played games' store", () => {
  const ids = () => playedGamesSnapshot()?.map((game) => game.id);

  it("keeps its own database, and nothing in localStorage", async () => {
    await savePlayedGame(record("a", "1. e4 *"));
    expect(localStorage.length).toBe(0);
    // Forget what was read: a second read comes from IndexedDB itself.
    resetPlayedGameStore();
    expect(playedGamesSnapshot()).toBeUndefined();
    expect((await loadPlayedGames()).map((game) => game.id)).toEqual(["a"]);
  });

  it("puts a new game and a game with a new move at the top", async () => {
    await savePlayedGame(record("a", "1. e4 *"));
    await savePlayedGame(record("b", "1. d4 *"));
    expect(ids()).toEqual(["b", "a"]);
    await savePlayedGame(record("a", "1. e4 e5 *", [], "2026-01-02T10:00:00Z"));
    expect(ids()).toEqual(["a", "b"]);
    // The day it began is the stored one.
    expect(findPlayedGame("a")?.savedAt).toBe("2026-01-01T10:00:00.000Z");
  });

  it("writes a new place in the tree in place, keeping the order and the date last played", async () => {
    await savePlayedGame(record("a", "1. e4 e5 *", ["e4", "e5"]));
    await savePlayedGame(record("b", "1. d4 *"));
    await savePlayedGame(record("a", "1. e4 e5 *", ["e4"], "2026-03-01T10:00:00Z"));
    expect(ids()).toEqual(["b", "a"]);
    expect(findPlayedGame("a")?.path).toEqual(["e4"]);
    expect(findPlayedGame("a")?.updatedAt).toBe("2026-01-01T10:00:00.000Z");
    // …and so it reads back after a reload.
    resetPlayedGameStore();
    expect((await loadPlayedGames()).map((game) => game.id)).toEqual(["b", "a"]);
  });

  it("does nothing for a record identical to the stored one", async () => {
    await savePlayedGame(record("a", "1. e4 *"));
    const before = playedGamesSnapshot();
    await savePlayedGame(record("a", "1. e4 *", [], "2026-05-05T10:00:00Z"));
    expect(playedGamesSnapshot()).toBe(before);
  });

  it("keeps a burst of autosaves one record, each seeing the one before", async () => {
    await Promise.all([
      savePlayedGame(record("a", "1. e4 *")),
      savePlayedGame(record("a", "1. e4 e5 *", ["e4", "e5"])),
      savePlayedGame(record("a", "1. e4 e5 *", ["e4"])),
    ]);
    expect(ids()).toEqual(["a"]);
    expect(findPlayedGame("a")?.path).toEqual(["e4"]);
  });

  it("drops the oldest past the cap", async () => {
    // The bulk arrives in one write (the import's own path), so the cap costs
    // two transactions rather than five hundred saves.
    const many = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        record(
          `g${index}`,
          "1. e4 *",
          [],
          new Date(Date.parse("2026-01-01T10:00:00Z") + index * 1000).toISOString(),
        ),
      );
    await importPlayedGames(many(MAX_PLAYED_GAMES + 1));
    expect(playedGamesSnapshot()).toHaveLength(MAX_PLAYED_GAMES);
    expect(findPlayedGame("g0")).toBeUndefined();
    // A save into a full store drops the oldest the same way.
    await savePlayedGame(record("new", "1. d4 *", [], "2026-02-01T10:00:00Z"));
    expect(playedGamesSnapshot()).toHaveLength(MAX_PLAYED_GAMES);
    expect(ids()?.[0]).toBe("new");
    expect(findPlayedGame("g1")).toBeUndefined();
  });

  it("forgets one", async () => {
    await savePlayedGame(record("a", "1. e4 *"));
    await removePlayedGame("a");
    expect(playedGamesSnapshot()).toHaveLength(0);
  });

  it("hands a game on with ?game=play/games/<id>, once the store is read", async () => {
    await savePlayedGame(record("a", "1. e4 (1. d4) 1... e5 *"));
    resetPlayedGameStore();
    expect(isReferenceRead("play/games/a")).toBe(false);
    await loadReferencedGames("play/games/a");
    expect(isReferenceRead("play/games/a")).toBe(true);
    const item = resolveGameReference("play/games/a");
    expect(item?.id).toBe("a");
    expect(item?.pgn).toContain("(1. d4)");
    expect(resolveGameReference("play/games/missing")).toBeUndefined();
  });
});

/** One row of the sort's tests — a game as the table built it. */
const tableRow = (id: string, over: Partial<PlayedGameRow> = {}): PlayedGameRow => ({
  id,
  white: "Human",
  whiteElo: undefined,
  black: "Stockfish level 10",
  blackElo: 2100,
  result: "*",
  opening: undefined,
  moves: 1,
  variations: 0,
  masked: false,
  savedAt: "2026-01-01T10:00:00.000Z",
  readable: true,
  ...over,
});

describe("the Lobby table's sort (CTA-100)", () => {
  const ids = (rows: readonly PlayedGameRow[]) => rows.map((row) => row.id);

  it("sorts by the date, the moment it names and not its wording", () => {
    const rows = [
      tableRow("old", { savedAt: "2026-01-01T10:00:00.000Z" }),
      tableRow("new", { savedAt: "2026-03-01T10:00:00.000Z" }),
      tableRow("mid", { savedAt: "2026-02-01T10:00:00.000Z" }),
    ];
    expect(ids(sortedPlayedGames(rows, "date", "desc"))).toEqual(["new", "mid", "old"]);
    expect(ids(sortedPlayedGames(rows, "date", "asc"))).toEqual(["old", "mid", "new"]);
  });

  it("reads an Elo numerically, and one that is unknown goes last either way", () => {
    const rows = [
      tableRow("none", { blackElo: undefined }),
      tableRow("low", { blackElo: 1350 }),
      tableRow("high", { blackElo: 2850 }),
    ];
    expect(ids(sortedPlayedGames(rows, "blackElo", "desc"))).toEqual(["high", "low", "none"]);
    expect(ids(sortedPlayedGames(rows, "blackElo", "asc"))).toEqual(["low", "high", "none"]);
  });

  it("collates names numerically, so a level 3 comes before a level 20", () => {
    const rows = [
      tableRow("e20", { white: "Stockfish level 20", black: "Human" }),
      tableRow("h", { white: "Human", black: "Stockfish level 20" }),
      tableRow("e3", { white: "Stockfish level 3", black: "Human" }),
    ];
    expect(ids(sortedPlayedGames(rows, "white", "asc"))).toEqual(["h", "e3", "e20"]);
    expect(ids(sortedPlayedGames(rows, "white", "desc"))).toEqual(["e20", "e3", "h"]);
  });

  it("sorts an opening that is not yet known last, either way", () => {
    const rows = [
      tableRow("unknown"),
      tableRow("kings", { opening: "King's Pawn Game" }),
      tableRow("queens", { opening: "Queen's Pawn Game" }),
    ];
    expect(ids(sortedPlayedGames(rows, "opening", "asc"))).toEqual(["kings", "queens", "unknown"]);
    expect(ids(sortedPlayedGames(rows, "opening", "desc"))).toEqual(["queens", "kings", "unknown"]);
  });

  it("breaks ties by the date, following the direction", () => {
    const rows = [
      tableRow("old-tie", { moves: 2, savedAt: "2026-01-01T10:00:00.000Z" }),
      tableRow("new-tie", { moves: 2, savedAt: "2026-02-01T10:00:00.000Z" }),
      tableRow("few", { moves: 1, savedAt: "2026-03-01T10:00:00.000Z" }),
    ];
    expect(ids(sortedPlayedGames(rows, "moves", "desc"))).toEqual(["new-tie", "old-tie", "few"]);
    expect(ids(sortedPlayedGames(rows, "moves", "asc"))).toEqual(["few", "old-tie", "new-tie"]);
  });

  it("sorts the Masked column, and a date that will not read is missing", () => {
    const rows = [
      tableRow("masked", { masked: true }),
      tableRow("plain"),
      tableRow("undated", { savedAt: "when?" }),
    ];
    expect(ids(sortedPlayedGames(rows, "masked", "asc"))).toEqual(["plain", "undated", "masked"]);
    expect(ids(sortedPlayedGames(rows, "masked", "desc"))).toEqual(["masked", "plain", "undated"]);
    expect(ids(sortedPlayedGames(rows, "date", "desc"))).toEqual(["masked", "plain", "undated"]);
  });;

  it("sorts the result as PGN writes it", () => {
    const rows = [
      tableRow("draw", { result: "1/2-1/2" }),
      tableRow("black", { result: "0-1" }),
      tableRow("on", { result: "*" }),
      tableRow("white", { result: "1-0" }),
    ];
    expect(ids(sortedPlayedGames(rows, "result", "asc"))).toEqual(["on", "black", "white", "draw"]);
  });
});

/** The FEN after playing SAN moves from the start. */
const fenAfter = (moves: readonly string[]): string => {
  const chess = new Chess();
  for (const san of moves) chess.move(san);
  return chess.fen();
};

describe("resultOfFen", () => {
  it("reads a checkmate from the position, from whichever side gave it", () => {
    expect(resultOfFen(fenAfter(["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"]))).toBe("1-0");
    expect(resultOfFen(fenAfter(["f3", "e5", "g4", "Qh4#"]))).toBe("0-1");
  });

  it("calls a stalemate a draw and an unfinished game unfinished", () => {
    expect(resultOfFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")).toBe("1/2-1/2");
    expect(resultOfFen(fenAfter([]))).toBe("*");
  });

  it("answers a FEN it cannot read rather than throwing", () => {
    expect(resultOfFen("not a position")).toBe("*");
  });
});

describe("playedGameHeaders", () => {
  it("names the reader and the engine by side, and dates the game", () => {
    const headers = playedGameHeaders(
      { ...DEFAULT_ENGINE_SETTINGS, playAs: "black", elo: 1700 },
      "*",
      new Date(2026, 8, 7),
    );
    expect(headers.White).toBe("Stockfish 19 Lite (Elo 1700)");
    expect(headers.Black).toBe("Player");
    expect(headers.Date).toBe("2026.09.07");
    expect(headers.Event).toBe("Play with Engine");
  });
});

describe("a masked game's costume (CTA-79)", () => {
  const COSTUME = { pieces: MASK_PRESETS.nonPawns, notation: false };

  const masked = (id: string, mask = COSTUME) =>
    playedGameOf(
      id,
      parsePgnTree("1. e4 *"),
      [],
      DEFAULT_ENGINE_SETTINGS,
      undefined,
      at("2026-01-01T10:00:00Z"),
      undefined,
      undefined,
      mask,
    );

  it("rides on the record and reads back", () => {
    const saved = masked("m");
    expect(saved.mask).toEqual(COSTUME);
    expect(playedGameFrom(JSON.parse(JSON.stringify(saved)))?.mask).toEqual(COSTUME);
    expect(playedGameSummary(saved, playedGameToTree(saved)).masked).toBe(true);
  });

  it("is absent on an unmasked game, and a record from before reads as one", () => {
    const plain = record("p", "1. e4 *");
    expect(plain.mask).toBeUndefined();
    expect(playedGameFrom(plain)?.mask).toBeUndefined();
    expect(playedGameSummary(plain, playedGameToTree(plain)).masked).toBe(false);
  });

  it("reads an unreadable costume as unmasked, never throwing", () => {
    const saved = masked("m");
    for (const broken of [
      "nonPawns",
      { pieces: { ...MASK_PRESETS.nonPawns, wQ: "bP" } },
      { pieces: { wK: "wK" } },
      { notation: false },
    ]) {
      expect(playedGameFrom({ ...saved, mask: broken })?.mask).toBeUndefined();
    }
    // The notation defaults to on.
    expect(playedGameFrom({ ...saved, mask: { pieces: MASK_PRESETS.allIdentical } })?.mask)
      .toEqual({ pieces: MASK_PRESETS.allIdentical, notation: true });
  });

  it("is written in place when only the costume changes", async () => {
    await savePlayedGame(masked("a"));
    await savePlayedGame(record("b", "1. d4 *"));
    const changed = { pieces: withMaskEntry(MASK_PRESETS.nonPawns, "wQ", "wQ"), notation: true };
    await savePlayedGame(masked("a", changed));
    expect(playedGamesSnapshot()?.map((game) => game.id)).toEqual(["b", "a"]);
    expect(findPlayedGame("a")?.mask).toEqual(changed);
  });
});

describe("the engine that played a game (CTA-153)", () => {
  const SINGLE: PlayedGameEngine = { id: "stockfish-19-lite-single", name: "Stockfish 19 Lite", version: "19", strength: "elo" };
  const MULTI: PlayedGameEngine = { id: "stockfish-19-lite-multi", name: "Stockfish 19 Lite (multi-thread)", version: "19", strength: "elo" };
  const SKILL_ONLY: PlayedGameEngine = { id: "my-engine", name: "My Engine", version: "3", strength: "skill" };

  const played = (engine?: PlayedGameEngine, settings = DEFAULT_ENGINE_SETTINGS) =>
    playedGameOf(
      "e1",
      parsePgnTree("1. e4 e5 *"),
      [],
      { ...settings, playAs: "white" },
      undefined,
      at("2026-01-01T10:00:00Z"),
      "2026-01-01T10:00:00.000Z",
      undefined,
      undefined,
      engine,
    );

  it("is written on the record, id, name, version and how its strength was set", () => {
    expect(played(SINGLE).engine).toEqual(SINGLE);
  });

  it("is absent from a game that names none — which reads as the default engine's", () => {
    const game = played();
    expect(game.engine).toBeUndefined();
    expect(playedGameEngineOf(game)).toEqual(DEFAULT_PLAYED_GAME_ENGINE);
    // The default engine as the registry builds it — `registry.test.ts` holds the descriptor to the same ids.
    expect(DEFAULT_PLAYED_GAME_ENGINE).toEqual(SINGLE);
  });

  it("signs a game that names no engine as the default's, by its Elo", () => {
    const settings = { ...DEFAULT_ENGINE_SETTINGS, elo: 1900, skillLevel: 7 };
    expect(played(undefined, settings).pgn).toContain('[Black "Stockfish 19 Lite (Elo 1900)"]');
    expect(played(DEFAULT_PLAYED_GAME_ENGINE, settings).pgn).toContain('[Black "Stockfish 19 Lite (Elo 1900)"]');
  });

  it("reads a game the retired 2019 build played as the default's (CTA-160)", () => {
    const stored = JSON.parse(JSON.stringify(played(undefined)));
    stored.engine = { id: "stockfish-2019-wasm", name: "Stockfish 2019", version: "2019-08-15", strength: "skill" };

    const game = playedGameFrom(stored)!;
    expect(game.engine).toBeUndefined();
    expect(playedGameEngineOf(game)).toEqual(DEFAULT_PLAYED_GAME_ENGINE);
    expect(playedGameSummary(game, undefined)).toMatchObject({ engineName: "Stockfish 19 Lite", strength: "elo" });
  });

  it("signs an engine by its name, with the Elo it was set to where it took one", () => {
    const settings = { ...DEFAULT_ENGINE_SETTINGS, elo: 1800, skillLevel: 7 };
    expect(played(SINGLE, settings).pgn).toContain('[Black "Stockfish 19 Lite (Elo 1800)"]');
    expect(played(SKILL_ONLY, settings).pgn).toContain('[Black "My Engine (level 7)"]');
  });

  it("is named on whichever side the engine played", () => {
    const headers = playedGameHeaders({ ...DEFAULT_ENGINE_SETTINGS, playAs: "black", elo: 2000 }, "*", new Date(2026, 0, 1), SINGLE);
    expect(headers.White).toBe("Stockfish 19 Lite (Elo 2000)");
    expect(headers.Black).toBe("Player");
  });

  it("reads back from a stored row — and a row without one reads as the default engine", () => {
    const stored = JSON.parse(JSON.stringify(played(SINGLE)));
    expect(playedGameFrom(stored)?.engine).toEqual(SINGLE);

    delete stored.engine;
    const legacy = playedGameFrom(stored)!;
    expect(legacy.engine).toBeUndefined();
    expect(playedGameEngineOf(legacy)).toEqual(DEFAULT_PLAYED_GAME_ENGINE);
  });

  it("reads an engine field it cannot make sense of as no engine, and fills what is missing", () => {
    expect(playedGameEngineFrom(undefined)).toBeUndefined();
    expect(playedGameEngineFrom("stockfish")).toBeUndefined();
    expect(playedGameEngineFrom({ name: "no id" })).toBeUndefined();
    expect(playedGameEngineFrom({ id: "" })).toBeUndefined();
    // A bare id keeps the game openable: its name is the id, its strength Skill Level.
    expect(playedGameEngineFrom({ id: "future-engine" })).toEqual({
      id: "future-engine",
      name: "future-engine",
      version: "",
      strength: "skill",
    });
    expect(playedGameEngineFrom({ id: "x", name: "X", version: "2", strength: "elo" })?.strength).toBe("elo");
    expect(playedGameEngineFrom({ id: "x", strength: "sideways" })?.strength).toBe("skill");
  });

  it("is built from a registry descriptor: Elo where the build declares one, Skill Level where it does not", () => {
    const base = { id: "e", name: "E", version: "1" } as const;
    expect(
      playedGameEngineFromDescriptor({ ...base, capabilities: { maxDepth: 24, strength: "skill", multiThread: false } }).strength,
    ).toBe("skill");
    expect(
      playedGameEngineFromDescriptor({ ...base, capabilities: { maxDepth: 24, strength: "both", multiThread: false } }).strength,
    ).toBe("elo");
    expect(
      playedGameEngineFromDescriptor({ ...base, capabilities: { maxDepth: 24, strength: "elo", multiThread: true } }),
    ).toEqual({ id: "e", name: "E", version: "1", strength: "elo" });
  });

  it("compares an absent engine as the default one, so opening an old game rewrites nothing", () => {
    expect(samePlayedGameEngine(undefined, DEFAULT_PLAYED_GAME_ENGINE)).toBe(true);
    expect(samePlayedGameEngine(undefined, undefined)).toBe(true);
    expect(samePlayedGameEngine(undefined, SINGLE)).toBe(true);
    expect(samePlayedGameEngine(undefined, MULTI)).toBe(false);
    expect(samePlayedGameEngine(SINGLE, { ...SINGLE })).toBe(true);
    expect(samePlayedGameEngine(SINGLE, { ...SINGLE, version: "20" })).toBe(false);
  });

  it("is written in place when only the engine changes, and not at all when it is the same", async () => {
    await savePlayedGame(played(undefined));
    // The same game under the default engine named outright: nothing to write.
    await savePlayedGame(played(DEFAULT_PLAYED_GAME_ENGINE));
    expect(findPlayedGame("e1")?.engine).toBeUndefined();

    await savePlayedGame(played(MULTI));
    expect(findPlayedGame("e1")?.engine).toEqual(MULTI);
  });

  it("shows in the Lobby's summary: every engine named, an Elo game with its Elo, a Skill Level one with the estimate", () => {
    const base = DEFAULT_ENGINE_SETTINGS;
    const legacy = playedGameSummary(played(undefined, { ...base, elo: 1500 }), undefined);
    expect(legacy).toMatchObject({ engineName: "Stockfish 19 Lite", strength: "elo", engineElo: 1500, blackElo: 1500 });

    const elo = playedGameSummary(played(SINGLE, { ...base, elo: 1650 }), undefined);
    expect(elo).toMatchObject({ engineName: "Stockfish 19 Lite", strength: "elo", engineElo: 1650, blackElo: 1650 });
    expect(elo.whiteElo).toBeUndefined();

    const skill = playedGameSummary(played(SKILL_ONLY, { ...base, skillLevel: 9 }), undefined);
    expect(skill).toMatchObject({ engineName: "My Engine", strength: "skill", engineElo: undefined });
    expect(skill.blackElo).toBe(approximateElo(9));
  });
});
