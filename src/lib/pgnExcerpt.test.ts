import { describe, expect, it } from "vitest";

import { mainline, pathTo, type GameTree } from "./gameTree";
import { parsePgnTree } from "./pgn";
import { excerptRows, excerptTokens, isInExcerpt, moveName, resolveExcerpt, sanPathOfLine, type ExcerptToken } from "./pgnExcerpt";

// 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 — with 2... d6 (2... Nf6 3. Nxe5) and 3. Bc4 (3. Bc4 Bc5).
const PGN = "1. e4 e5 2. Nf3 Nc6 (2... d6 3. d4) (2... Nf6 3. Nxe5) 3. Bb5 (3. Bc4 Bc5 4. c3) 3... a6 4. Ba4 Nf6 *";
const tree: GameTree = parsePgnTree(PGN);
const line = mainline(tree);
const sans = (id: string | null) => pathTo(tree, id).map((node) => node.san);

/** The tokens as text: `1. e4 e5 ( 2... d6 3. d4 )`. */
const text = (tokens: readonly ExcerptToken[]): string =>
  tokens
    .map((token) =>
      token.kind === "variation" ? `( ${text(token.tokens)} )` : token.kind === "comment" ? `{ ${token.text} }` : `${token.label}${token.label === "" ? "" : " "}${token.node.san}`,
    )
    .join(" ");

describe("resolveExcerpt — the window (CTA-126)", () => {
  it("is the whole game, opened at the start, when nothing is asked", () => {
    const window = resolveExcerpt(tree);
    expect([window.fromPly, window.toPly, window.startId]).toEqual([0, 8, null]);
    expect(window.toId).toBe(line[7].id);
  });

  it("reads move numbers — White's move, Black's — and opens at from when no start is given", () => {
    const window = resolveExcerpt(tree, { from: "2", to: "3...", start: "3" });
    expect([window.fromPly, window.toPly]).toEqual([3, 6]);
    expect(sans(window.startId)).toEqual(["e4", "e5", "Nf3", "Nc6", "Bb5"]);
    expect(sans(resolveExcerpt(tree, { from: "2..." }).startId)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("takes plies, which win over move numbers, and clamps them to the game and the window", () => {
    const window = resolveExcerpt(tree, { fromPly: 2, from: "3", toPly: 99, startPly: 1 });
    expect([window.fromPly, window.toPly]).toEqual([2, 8]);
    // A start before the window opens at its first position.
    expect(sans(window.startId)).toEqual(["e4", "e5"]);
    expect(resolveExcerpt(tree, { fromPly: 6, toPly: 2 }).toPly).toBe(6);
  });

  it("opens inside a side line on a line of SAN — from the start, or from the mainline before a later move number", () => {
    expect(sans(resolveExcerpt(tree, { start: "1. e4 e5 2. Nf3 Nf6 3. Nxe5" }).startId)).toEqual(["e4", "e5", "Nf3", "Nf6", "Nxe5"]);
    expect(sans(resolveExcerpt(tree, { start: "3. Bc4 Bc5" }).startId)).toEqual(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]);
    expect(sanPathOfLine(tree, "2... d6")).toEqual(["e4", "e5", "Nf3", "d6"]);
  });

  it("will not open in a side line outside the window, or one left out", () => {
    // 2... d6 branches at ply 4; a window from ply 4 on does not hold it.
    expect(resolveExcerpt(tree, { fromPly: 4, start: "2... d6" }).startId).toBe(line[3].id);
    expect(resolveExcerpt(tree, { start: "2... d6", variations: false }).startId).toBeNull();
  });
});

describe("isInExcerpt — what the reader can reach", () => {
  const window = resolveExcerpt(tree, { from: "1...", to: "3" });

  it("holds the window's mainline, and no position outside it", () => {
    expect(isInExcerpt(tree, window, line[1].id)).toBe(true);
    expect(isInExcerpt(tree, window, line[4].id)).toBe(true);
    expect(isInExcerpt(tree, window, null)).toBe(false);
    expect(isInExcerpt(tree, window, line[5].id)).toBe(false);
  });

  it("holds the side lines that branch inside it, to their ends", () => {
    const d4 = line[2].children.find((node) => node.san === "d6")!.children[0];
    expect(isInExcerpt(tree, window, d4.id)).toBe(true);
    // 3. Bc4 branches at ply 5, the window's last: in. Its 4. c3 too.
    const bc4 = line[3].children.find((node) => node.san === "Bc4")!;
    expect(isInExcerpt(tree, window, bc4.children[0].children[0].id)).toBe(true);
    expect(isInExcerpt(tree, { ...window, variations: false }, bc4.id)).toBe(false);
  });
});

describe("excerptTokens — the move list", () => {
  it("writes the window as PGN does: numbers where a line starts or resumes, side lines after the move they replace", () => {
    expect(text(excerptTokens(tree, resolveExcerpt(tree)))).toBe(
      "1. e4 e5 2. Nf3 Nc6 ( 2... d6 3. d4 ) ( 2... Nf6 3. Nxe5 ) 3. Bb5 ( 3. Bc4 Bc5 4. c3 ) 3... a6 4. Ba4 Nf6",
    );
  });

  it("starts at the window's first move and stops at its last", () => {
    expect(text(excerptTokens(tree, resolveExcerpt(tree, { from: "1...", to: "2..." })))).toBe(
      "2. Nf3 Nc6 ( 2... d6 3. d4 ) ( 2... Nf6 3. Nxe5 )",
    );
    expect(excerptTokens(tree, resolveExcerpt(tree, { from: "2", to: "2" }))).toEqual([]);
  });

  it("leaves the side lines out when asked", () => {
    expect(text(excerptTokens(tree, resolveExcerpt(tree, { to: "3", variations: false })))).toBe("1. e4 e5 2. Nf3 Nc6 3. Bb5");
  });

  it("names a move on its own", () => {
    expect(moveName(tree.startFen, line[3])).toBe("2... Nc6");
  });
});

describe("excerptRows — the move list in numbered pairs", () => {
  const rowsOf = (options: Parameters<typeof resolveExcerpt>[1]) => excerptRows(tree.startFen, excerptTokens(tree, resolveExcerpt(tree, options)));
  const summary = (rows: ReturnType<typeof rowsOf>) =>
    rows.map((row) => `${row.number}. ${row.white?.node.san ?? "…"} ${row.black?.node.san ?? "…"}${row.notes.length > 0 ? ` [${row.notes.length}]` : ""}`);

  it("pairs the moves by number, a side line on the pair holding the move it answers", () => {
    const rows = rowsOf({});
    expect(summary(rows)).toEqual(["1. e4 e5", "2. Nf3 Nc6 [2]", "3. Bb5 a6 [1]", "4. Ba4 Nf6"]);
    // Nested lines stay inside their run.
    expect(text((rows[1].notes[0] as Extract<ExcerptToken, { kind: "variation" }>).tokens)).toBe("2... d6 3. d4");
  });

  it("opens a window on Black's move with an empty White cell, and ends on White's with an empty Black one", () => {
    expect(summary(rowsOf({ from: "2", to: "3" }))).toEqual(["2. … Nc6 [2]", "3. Bb5 … [1]"]);
  });

  it("is empty for an empty window, and has no side lines when they are left out", () => {
    expect(rowsOf({ from: "2", to: "2" })).toEqual([]);
    expect(summary(rowsOf({ variations: false }))).toEqual(["1. e4 e5", "2. Nf3 Nc6", "3. Bb5 a6", "4. Ba4 Nf6"]);
  });

  it("numbers from a position that is not the start", () => {
    const fen = parsePgnTree('[FEN "r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 24"]\n[SetUp "1"]\n\n24... Kd7 25. Kd2 *');
    expect(summary(excerptRows(fen.startFen, excerptTokens(fen, resolveExcerpt(fen))))).toEqual(["24. … Kd7", "25. Kd2 …"]);
  });
});

describe("the comments in place — excerptTokens' comments, excerptRows' split", () => {
  // A lichess study's shape: comments two in a row, the text then the shapes; a side line opened by one.
  const STUDY = parsePgnTree(
    "{ Intro. } { [%csl Gd4] } 1. e4 { Best by test. } { [%cal Ge2e4] } (1. d4 { Also good. } d5) 1... e5 2. Nf3 ({ Or } 2. Bc4 Nf6) 2... Nc6 { Develops. } 3. Bb5 *",
  );
  const tokensOf = (window = resolveExcerpt(STUDY)) => excerptTokens(STUDY, window, { comments: true });
  const notesOf = (row: ReturnType<typeof excerptRows>[number]) =>
    row.notes.map((note) => (note.kind === "comment" ? `{ ${note.text} }` : `( ${text(note.tokens)} )`)).join(" ");
  const rowsSummary = (rows: ReturnType<typeof excerptRows>) =>
    rows.map((row) => [`${row.number}. ${row.white?.node.san ?? "…"} ${row.black?.node.san ?? "…"}`, notesOf(row)].filter(Boolean).join(" "));

  it("are left out unless asked for — the tokens and rows as ever", () => {
    expect(text(excerptTokens(STUDY, resolveExcerpt(STUDY)))).toBe("1. e4 ( 1. d4 d5 ) 1... e5 2. Nf3 ( 2. Bc4 Nf6 ) 2... Nc6 3. Bb5");
  });

  it("follow their move — a shapes-only one none — the move after numbered again, a side line's opening one before its move", () => {
    expect(text(tokensOf())).toBe(
      "{ Intro. } 1. e4 { Best by test. } ( 1. d4 { Also good. } 1... d5 ) 1... e5 2. Nf3 ( { Or } 2. Bc4 Nf6 ) 2... Nc6 { Develops. } 3. Bb5",
    );
  });

  it("leave the game's opening one out where the window does not open at the start", () => {
    expect(text(tokensOf(resolveExcerpt(STUDY, { from: "1" })))).toMatch(/^1\.\.\. e5/);
  });

  it("split the pair after White's move, hang under it after Black's, and give the opening one a row of its own", () => {
    const rows = excerptRows(STUDY.startFen, tokensOf());
    expect(rowsSummary(rows)).toEqual([
      "0. … … { Intro. }",
      "1. e4 … { Best by test. } ( 1. d4 { Also good. } 1... d5 )",
      "1. … e5",
      "2. Nf3 Nc6 ( { Or } 2. Bc4 Nf6 ) { Develops. }",
      "3. Bb5 …",
    ]);
    expect([rows[0].white, rows[0].black]).toEqual([null, null]);
  });
});
