import { describe, expect, it } from "vitest";
import { Chess, DEFAULT_POSITION } from "chess.js";

import { DEFAULT_ANALYSIS_SETTINGS } from "./analysisSettings";
import { parsePgnTree } from "./pgn";
import {
  addMove,
  emptyTree,
  fenAtNode,
  mainline,
  nodeAtSanPath,
  type GameTree,
} from "./gameTree";
import {
  isSavedAnalysis,
  SAVED_ANALYSES_PATH,
  SAVED_ANALYSIS_PLAYER,
  savedAnalysisCatalogOf,
  savedAnalysisFen,
  savedAnalysisFrom,
  savedAnalysisNode,
  savedAnalysisOf,
  savedAnalysisSummary,
  savedAnalysisToTree,
  batchAnalysesOf,
  analysisGamesOfText,
  type SavedAnalysis,
} from "./savedAnalyses";

/**
 * A tree grown by playing SAN, the way the Analysis Board grows one: each entry
 * is `[parent path, moves]`, so a second entry branching off an earlier point is
 * how a side line is made.
 */
const grow = (
  lines: readonly (readonly [readonly string[], readonly string[]])[],
  startFen?: string,
): GameTree => {
  let tree = emptyTree(startFen);

  for (const [from, moves] of lines) {
    let nodeId = nodeAtSanPath(tree, from);
    for (const san of moves) {
      const chess = new Chess(fenAtNode(tree, nodeId));
      const move = chess.move(san);
      const added = addMove(tree, nodeId, {
        san: move.san,
        from: move.from,
        to: move.to,
        fen: move.after,
      });
      tree = added.tree;
      nodeId = added.nodeId;
    }
  }

  return tree;
};

const AT = new Date("2026-09-07T10:00:00.000Z");

const save = (
  tree: GameTree,
  path: readonly string[] = [],
  overrides: Partial<SavedAnalysis> = {},
): SavedAnalysis => ({
  ...savedAnalysisOf(
    "a1",
    tree,
    path,
    DEFAULT_ANALYSIS_SETTINGS,
    "white",
    AT,
  ),
  ...overrides,
});

describe("savedAnalysisOf — writing a board down", () => {
  it("keeps the side lines, which a linear game's writer would drop", () => {
    const tree = grow([
      [[], ["e4", "e5", "Nf3"]],
      [["e4"], ["c5"]],
    ]);

    const back = savedAnalysisToTree(save(tree))!;
    expect(mainline(back).map((node) => node.san)).toEqual(["e4", "e5", "Nf3"]);
    expect(back.moves[0].children.map((node) => node.san)).toEqual(["e5", "c5"]);
  });

  it("states a non-standard start position, so it reloads as itself", () => {
    const fen = "8/8/8/4k3/8/8/4K3/7R w - - 0 1";
    const saved = save(grow([[[], ["Rh5+"]]], fen));

    expect(saved.pgn).toContain(`[FEN "${fen}"]`);
    expect(savedAnalysisToTree(saved)!.startFen).toBe(fen);
  });

  it("names the players 'Analysis' for a board that is nobody's game", () => {
    expect(save(grow([[[], ["e4"]]])).pgn).toContain(
      `[White "${SAVED_ANALYSIS_PLAYER}"]`,
    );
  });

  it("lets the tree's own tags win, so a library game keeps its players", () => {
    const tree = grow([[[], ["e4"]]]);
    const named: GameTree = {
      ...tree,
      headers: { White: "Carlsen", Black: "Nakamura", Event: "Titled Tuesday" },
    };

    const pgn = save(named).pgn;
    expect(pgn).toContain('[White "Carlsen"]');
    expect(pgn).toContain('[Event "Titled Tuesday"]');
  });

  it("records where the reader was, and reads the position back off it", () => {
    const tree = grow([
      [[], ["e4", "e5"]],
      [["e4"], ["c5"]],
    ]);
    const path = ["e4", "c5"];
    const saved = save(tree, path);
    const back = savedAnalysisToTree(saved)!;

    expect(savedAnalysisNode(saved, back)).not.toBeNull();
    expect(savedAnalysisFen(saved, back)).toBe(
      fenAtNode(tree, nodeAtSanPath(tree, path)),
    );
  });

  it("previews the start position for an analysis left at ply 0", () => {
    const tree = grow([[[], ["e4", "e5"]]]);
    const saved = save(tree, []);
    expect(savedAnalysisFen(saved, savedAnalysisToTree(saved)!)).toBe(
      DEFAULT_POSITION,
    );
  });

  it("carries the date it was begun, not the date of this write", () => {
    const saved = savedAnalysisOf(
      "a1",
      grow([[[], ["e4"]]]),
      [],
      DEFAULT_ANALYSIS_SETTINGS,
      "white",
      new Date("2026-09-08T09:00:00.000Z"),
      "2026-09-01T09:00:00.000Z",
    );

    expect(saved.savedAt).toBe("2026-09-01T09:00:00.000Z");
    expect(saved.updatedAt).toBe("2026-09-08T09:00:00.000Z");
  });
});

describe("savedAnalysisToTree — reading one back", () => {
  it("returns undefined for a record that will not parse, rather than throwing", () => {
    expect(savedAnalysisToTree(save(grow([]), [], { pgn: "1. Qz9 ??" }))).toBeUndefined();
  });
});

describe("savedAnalysisFrom — a row out of storage", () => {
  it("fills in the settings, the path and the orientation a record lacks", () => {
    const row = savedAnalysisFrom({
      id: "a1",
      pgn: "1. e4 *",
      savedAt: AT.toISOString(),
      updatedAt: AT.toISOString(),
    })!;

    expect(row.settings).toEqual(DEFAULT_ANALYSIS_SETTINGS);
    expect(row.path).toEqual([]);
    expect(row.orientation).toBe("white");
  });

  it("keeps what a record does have", () => {
    const row = savedAnalysisFrom({
      ...save(grow([[[], ["e4"]]]), ["e4"]),
      orientation: "black",
      settings: { depth: 22, multiPv: 5, moveTimeMs: 0, infinite: true, threads: 4, hashMb: 256, writeEvals: true },
    })!;

    expect(row.path).toEqual(["e4"]);
    expect(row.orientation).toBe("black");
    expect(row.settings).toEqual({ depth: 22, multiPv: 5, moveTimeMs: 0, infinite: true, threads: 4, hashMb: 256, writeEvals: true });
  });

  it("reads a record from before infinite analysis, threads and hash (CTA-160) with Play with Engine's defaults, and from before the evaluations switch (CTA-167) with it off", () => {
    const row = savedAnalysisFrom({
      ...save(grow([[[], ["e4"]]])),
      settings: { depth: 16, multiPv: 3, moveTimeMs: 1000 },
    })!;
    expect(row.settings).toEqual({ depth: 16, multiPv: 3, moveTimeMs: 1000, infinite: false, threads: 1, hashMb: 16, writeEvals: false });
  });

  it("drops a path that is not a list of strings", () => {
    const row = savedAnalysisFrom({
      ...save(grow([[[], ["e4"]]])),
      path: "e4",
    })!;
    expect(row.path).toEqual([]);
  });

  it("rejects a value that is not a record at all", () => {
    expect(savedAnalysisFrom(null)).toBeUndefined();
    expect(savedAnalysisFrom({ id: "a1" })).toBeUndefined();
    expect(isSavedAnalysis({ id: "", pgn: "x", savedAt: "", updatedAt: "" })).toBe(
      false,
    );
  });
});

describe("savedAnalysisSummary — what a row says without opening it", () => {
  it("counts the mainline, its one side line, and how far in the reader was", () => {
    const tree = grow([
      [[], ["e4", "e5", "Nf3"]],
      [["e4"], ["c5", "Nf3"]],
    ]);
    const saved = save(tree, ["e4", "c5"]);

    expect(savedAnalysisSummary(saved, tree)).toEqual({
      // Three half-moves numbered as two full moves; five nodes in all, but
      // only one branch point — the c5 side line, whatever it runs to.
      moves: 2,
      nodes: 5,
      variations: 1,
      ply: 2,
    });
  });

  it("counts one variation whether it runs two moves or many", () => {
    const short = grow([
      [[], ["e4", "e5", "Nf3"]],
      [["e4"], ["c5"]],
    ]);
    const long = grow([
      [[], ["e4", "e5", "Nf3"]],
      [["e4"], ["c5", "Nc3", "a6", "Bc4", "e6", "Qf3"]],
    ]);

    expect(savedAnalysisSummary(save(short), short).variations).toBe(1);
    expect(savedAnalysisSummary(save(long), long).variations).toBe(1);
  });

  it("resolves the standing-ply against the tree, not a stale stored path", () => {
    const tree = grow([[[], ["e4", "e5"]]]);
    // A path naming a move this tree no longer has past "e4" — as if the
    // record were written against a tree that has since been edited.
    const saved = save(tree, ["e4", "d5"]);

    expect(savedAnalysisSummary(saved, tree).ply).toBe(1);
  });

  it("reads as empty for a record that will not parse", () => {
    expect(savedAnalysisSummary(save(grow([])), undefined)).toEqual({
      moves: 0,
      nodes: 0,
      variations: 0,
      ply: 0,
    });
  });
});

describe("savedAnalysisCatalogOf — so ?game= already worked", () => {
  it("presents each readable record as a game under one path", () => {
    const catalog = savedAnalysisCatalogOf([
      save(grow([[[], ["e4", "e5"]]]), [], { id: "a1" }),
      save(grow([[[], ["d4"]]]), [], { id: "a2" }),
    ]);

    expect(catalog.path).toBe(SAVED_ANALYSES_PATH);
    expect(catalog.games.map((entry) => entry.id)).toEqual(["a1", "a2"]);
  });

  it("leaves a record that will not parse out, rather than failing the lot", () => {
    const catalog = savedAnalysisCatalogOf([
      save(grow([[[], ["e4"]]]), [], { id: "a1", pgn: "not a game at all ((" }),
      save(grow([[[], ["d4"]]]), [], { id: "a2" }),
    ]);

    expect(catalog.games.map((entry) => entry.id)).toEqual(["a2"]);
  });

  it("reads a record as the board does — two comments in a row, as a lichess study writes them", () => {
    const pgn =
      '[FEN "8/8/8/4k3/3r4/3K4/6Q1/8 w - - 1 1"]\n[SetUp "1"]\n\n' +
      "{ A rule of thumb. } { [%csl Gd4] }\n1. Ke3 { From the tablebase. } { [%cal Bg2e4] } 1... Rd5 (1... Ke6 2. Qg6+) 2. Qg6 *";
    const catalog = savedAnalysisCatalogOf([save(grow([[[], ["e4"]]]), [], { id: "study", pgn })]);

    expect(catalog.games.map((entry) => entry.id)).toEqual(["study"]);
    expect(catalog.games[0].game.moves.map((move) => move.san)).toEqual(["Ke3", "Rd5", "Qg6"]);
    expect(catalog.games[0].game.headers.FEN).toBe("8/8/8/4k3/3r4/3K4/6Q1/8 w - - 1 1");
  });
});

describe("a saved analysis' name and folder (CTA-73)", () => {
  const tree = parsePgnTree('[White "Tal"]\n[Black "Botvinnik"]\n\n1. e4 e5 *');

  it("is named by its players and Unfiled when written", () => {
    const saved = savedAnalysisOf("a", tree, [], DEFAULT_ANALYSIS_SETTINGS, "white");
    expect(saved.name).toBe("Tal – Botvinnik");
    expect(saved.folderId).toBeNull();
  });

  it("names a board of its own by nothing — the screen's generic", () => {
    const saved = savedAnalysisOf("a", emptyTree(), [], DEFAULT_ANALYSIS_SETTINGS, "white");
    expect(saved.name).toBe("");
  });

  it("reads a record from before names and folders as named by its tags, and Unfiled", () => {
    const written = savedAnalysisOf("a", tree, [], DEFAULT_ANALYSIS_SETTINGS, "white");
    const legacy: Record<string, unknown> = { ...written };
    delete legacy.name;
    delete legacy.folderId;
    expect(savedAnalysisFrom(legacy)).toMatchObject({
      name: "Tal – Botvinnik",
      folderId: null,
    });
    expect(savedAnalysisFrom({ ...legacy, name: "Mine", folderId: 7 })).toMatchObject({
      name: "Mine",
      folderId: null,
    });
  });

  it("draws its arrows unsized and classic unless it says otherwise (CTA-98)", () => {
    const written = savedAnalysisOf("a", tree, [], DEFAULT_ANALYSIS_SETTINGS, "white");
    expect(written).toMatchObject({ arrowWidthSource: "none", arrowPalette: "classic" });

    // A record from before the fields, and one naming values this build does not know.
    const legacy: Record<string, unknown> = { ...written };
    delete legacy.arrowWidthSource;
    delete legacy.arrowPalette;
    expect(savedAnalysisFrom(legacy)).toMatchObject({
      arrowWidthSource: "none",
      arrowPalette: "classic",
    });
    expect(
      savedAnalysisFrom({ ...legacy, arrowWidthSource: "thickness", arrowPalette: 3 }),
    ).toMatchObject({ arrowWidthSource: "none", arrowPalette: "classic" });
    expect(
      savedAnalysisFrom({ ...legacy, arrowWidthSource: "games", arrowPalette: "lichess" }),
    ).toMatchObject({ arrowWidthSource: "games", arrowPalette: "lichess" });
  });

  it("names a catalog entry by the record's name", () => {
    const saved = {
      ...savedAnalysisOf("a", tree, [], DEFAULT_ANALYSIS_SETTINGS, "white"),
      name: "Immortal",
    };
    expect(savedAnalysisCatalogOf([saved]).games[0].name).toBe("Immortal");
  });
});

describe("batchAnalysesOf — the Library's picked games (CTA-77)", () => {
  it("keeps each game's PGN as it is, side lines and comments too, opened at the start facing White", () => {
    let next = 0;
    const game = '[White "Carlsen, Magnus"]\n[Black "Nepomniachtchi, Ian"]\n\n1. e4 {Best by test.} e5 (1... c5) 1-0\n';
    const records = batchAnalysesOf(
      () => `id${(next += 1)}`,
      [
        { name: "Carlsen, Magnus – Nepomniachtchi, Ian", pgn: game },
        { name: "Two", pgn: "1. d4 d5 *" },
      ],
      "folder",
      DEFAULT_ANALYSIS_SETTINGS,
      new Date("2026-09-22T10:00:00.000Z"),
    );
    expect(records.map((record) => [record.id, record.name, record.folderId])).toEqual([
      ["id1", "Carlsen, Magnus – Nepomniachtchi, Ian", "folder"],
      ["id2", "Two", "folder"],
    ]);
    expect(records[0]).toMatchObject({ path: [], orientation: "white", showArrows: true, description: "" });
    expect(records[0].pgn).toBe(game.trim());
    const tree = savedAnalysisToTree(records[0])!;
    expect(tree.moves[0].comments).toEqual(["Best by test."]);
    expect(tree.moves[0].children.map((node) => node.san)).toEqual(["e5", "c5"]);
    // A record the store would read back as it was written.
    expect(savedAnalysisFrom(records[0])).toEqual(records[0]);
  });
});

describe("analysisGamesOfText — a text of several games as analyses (CTA-141)", () => {
  const chapter = (name: string, body: string, fen?: string) =>
    [
      `[Event "Queen vs Rook: ${name}"]`,
      `[ChapterName "${name}"]`,
      ...(fen === undefined ? [] : [`[FEN "${fen}"]`, '[SetUp "1"]']),
      "",
      body,
    ].join("\n");
  const POSITION = "8/8/2k5/3r4/4Q3/5K2/8/8 w - - 1 1";

  it("keeps every game that reads, in file order, as written and named by its chapter", () => {
    const first = chapter("Introduction", "{ Begin here. } 1. Qh4 { [%cal Gh4d8] } *", POSITION);
    const second = chapter("Line", "1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *");
    const { games, skipped } = analysisGamesOfText([first, second].join("\n\n"));
    expect(skipped).toBe(0);
    expect(games).toEqual([
      { name: "Introduction", pgn: first },
      { name: "Line", pgn: second },
    ]);
  });

  it("keeps a game that is only a position, and counts only the ones that will not read", () => {
    const position = chapter("Just a position", "*", POSITION);
    const broken = chapter("Broken", "1. e4 e5 2. Qxx9 *");
    const fine = chapter("Fine", "1. d4 *");
    const { games, skipped } = analysisGamesOfText([position, broken, fine].join("\n\n"));
    expect(games.map((game) => game.name)).toEqual(["Just a position", "Fine"]);
    expect(skipped).toBe(1);
    expect(parsePgnTree(games[0].pgn).startFen).toBe(POSITION);
  });

  it("names a game with no chapter by its players, else its event", () => {
    const { games } = analysisGamesOfText(
      ['[Event "Open"]\n[White "A"]\n[Black "B"]\n\n1. e4 *', '[Event "Blitz"]\n\n1. d4 *'].join("\n\n"),
    );
    expect(games.map((game) => game.name)).toEqual(["A – B", "Blitz"]);
  });
});
