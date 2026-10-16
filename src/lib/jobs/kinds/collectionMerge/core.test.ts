import { describe, expect, it } from "vitest";

import { MAX_COLLECTION_CHARS } from "../../../libraryCollections";
import {
  COLLECTION_MERGE_BATCH,
  COLLECTION_MERGE_STATE_VERSION,
  COLLECTION_MERGE_SUMMARY_SCHEMA,
  CollectionMergeError,
  collectionMergeSettingsFrom,
  defaultMergeName,
  fnv1a64,
  gameKeyOf,
  mergedCollectionId,
  mergedPgnFileName,
  normalisedGameText,
  outputPlansOf,
  parseCollectionMergeInput,
  parseCollectionMergeState,
  parseCollectionMergeSummary,
  planOf,
  stepOf,
  summaryOf,
  type CollectionMergeDedupe,
  type CollectionMergeInput,
  type CollectionMergeReader,
  type CollectionMergeState,
} from "./core";

/* ─── Samples ─────────────────────────────────────────────────────────── */

const game = (white: string, black: string, date: string, moves: string, extra = "") =>
  `[Event "Test"]\n[White "${white}"]\n[Black "${black}"]\n[Date "${date}"]\n[Result "*"]${extra}\n\n${moves} *`;

/** Game n of a numbered series: distinct players, one short line. */
const numbered = (n: number) => game(`White ${n}`, `Black ${n}`, "2026.01.01", "1. e4 e5 2. Nf3 Nc6");

const UNREADABLE = game("Broken", "Game", "2026.01.01", "1. e4 e5 2. Ke3 Ke6 3. Qxh8");

/** The in-memory Library: collections by id. */
const readerOf = (collections: Record<string, readonly string[]>): CollectionMergeReader & { reads: number } => {
  const reader = {
    reads: 0,
    count: async (id: string) => {
      const games = collections[id];
      if (games === undefined) throw new Error(`gone: ${id}`);
      return games.length;
    },
    read: async (id: string, from: number, n: number) => {
      reader.reads += 1;
      const games = collections[id];
      if (games === undefined) throw new Error(`gone: ${id}`);
      return games.slice(from, from + n);
    },
  };
  return reader;
};

/** The runtime's part store, in memory: idempotent by `seq`, joined in order. */
const partSink = () => {
  const parts = new Map<number, string>();
  return {
    parts,
    writes: 0,
    write(seq: number, text: string) {
      this.writes += 1;
      parts.set(seq, text);
      return Promise.resolve();
    },
    file: () => [...parts.keys()].sort((a, b) => a - b).map((seq) => parts.get(seq)).join(""),
  };
};

const inputOf = (dedupe: CollectionMergeDedupe, ids: string[], extra: Partial<CollectionMergeInput> = {}): CollectionMergeInput => ({
  sources: ids.map((id) => ({ id, name: id.toUpperCase() })),
  dedupe,
  name: "Merged",
  outputs: { collection: true },
  ...extra,
});

/** A checkpoint as the runtime stores it: written as JSON, read back through `parseState`. */
const persisted = (state: CollectionMergeState): CollectionMergeState => {
  const read = parseCollectionMergeState(JSON.parse(JSON.stringify(state)), COLLECTION_MERGE_STATE_VERSION);
  if (read === undefined) throw new Error("the state did not read back");
  return read;
};

/** Run a merge to its end, uninterrupted. */
const runAll = async (input: CollectionMergeInput, reader: CollectionMergeReader) => {
  const sink = partSink();
  let { state } = await planOf(input, reader);
  let steps = 0;
  for (;;) {
    const result = await stepOf(state, input, reader, (seq, text) => sink.write(seq, text));
    state = persisted(result.state);
    steps += 1;
    if (result.done) break;
  }
  return { state, file: sink.file(), sink, steps };
};

/* ─── The input ───────────────────────────────────────────────────────── */

describe("the collection merge's input (CTA-220)", () => {
  it("reads two or more sources in order, a repeat kept once", () => {
    const input = parseCollectionMergeInput({
      sources: [{ id: "tal", name: "Tal" }, { id: "u1", name: "Mine" }, { id: "tal", name: "Tal again" }, { id: 4 }, "x"],
      dedupe: "same-game",
      name: "  Both  ",
      outputs: { collection: true },
    });
    expect(input).toEqual({
      sources: [
        { id: "tal", name: "Tal" },
        { id: "u1", name: "Mine" },
      ],
      dedupe: "same-game",
      name: "Both",
      outputs: { collection: true },
    });
  });

  it("refuses fewer than two sources, and what is not an input", () => {
    expect(parseCollectionMergeInput({ sources: [{ id: "tal", name: "Tal" }] })).toBeUndefined();
    expect(parseCollectionMergeInput({ sources: [{ id: "tal" }, { id: "tal" }] })).toBeUndefined();
    expect(parseCollectionMergeInput(null)).toBeUndefined();
    expect(parseCollectionMergeInput({ sources: "tal,fischer" })).toBeUndefined();
  });

  it("takes the defaults leniently: the dedupe mode, no collection, the name '<first> + <n> more'", () => {
    const input = parseCollectionMergeInput({ sources: [{ id: "tal", name: "Tal" }, { id: "fischer", name: "Fischer" }, { id: "u1" }], dedupe: "everything" });
    expect(input).toMatchObject({ dedupe: "identical-pgn", name: "Tal + 2 more", outputs: { collection: false } });
    expect(collectionMergeSettingsFrom(undefined)).toEqual({ dedupe: "identical-pgn", name: "", outputs: { collection: false } });
    expect(defaultMergeName([{ name: "Tal" }, { name: "Fischer" }], (count) => `ועוד ${count}`)).toBe("Tal + ועוד 1");
  });

  it("holds the name to the Library's limit", () => {
    const input = parseCollectionMergeInput({ sources: [{ id: "a" }, { id: "b" }], name: "x".repeat(300) });
    expect(input?.name).toHaveLength(100);
  });
});

/* ─── Identity ────────────────────────────────────────────────────────── */

describe("a game's identity", () => {
  it("is 64-bit FNV-1a, as its reference vectors", () => {
    expect(fnv1a64("")).toBe("cbf29ce484222325");
    expect(fnv1a64("a")).toBe("af63dc4c8601ec8c");
    expect(fnv1a64("foobar")).toBe("85944171f73967e8");
  });

  it("normalises line endings and trailing space before anything compares", () => {
    expect(normalisedGameText("[Event \"x\"]  \r\n\r\n1. e4 *\t\r\n")).toBe('[Event "x"]\n\n1. e4 *');
  });

  const plain = game("Tal", "Botvinnik", "1960.03.15", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6");
  const annotated = game("Tal", "Botvinnik", "1960.03.15", "1. e4 {The king's pawn} e5 2. Nf3! $1 Nc6 (2... d6 3. d4) 3. Bb5 a6?!", '\n[Annotator "Someone"]');
  const otherGame = game("Tal", "Botvinnik", "1960.03.15", "1. d4 Nf6 2. c4 e6");

  it("none: no identity", () => {
    expect(gameKeyOf(plain, "none")).toBeUndefined();
  });

  it("identical-pgn: the text — the same game with other comments is another", () => {
    expect(gameKeyOf(normalisedGameText(`${plain}  \r\n`), "identical-pgn")).toBe(gameKeyOf(plain, "identical-pgn"));
    expect(gameKeyOf(annotated, "identical-pgn")).not.toBe(gameKeyOf(plain, "identical-pgn"));
  });

  it("same-game: the moves, White, Black and Date — comments, NAGs, glyphs and side lines aside", () => {
    expect(gameKeyOf(annotated, "same-game")).toBe(gameKeyOf(plain, "same-game"));
    expect(gameKeyOf(otherGame, "same-game")).not.toBe(gameKeyOf(plain, "same-game"));
    expect(gameKeyOf(game("Tal", "Botvinnik", "1960.03.16", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6"), "same-game")).not.toBe(gameKeyOf(plain, "same-game"));
    expect(gameKeyOf(game("Tal", "Botvinnik", "1960.03.15", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. 0-0"), "same-game")).toBe(
      gameKeyOf(game("Tal", "Botvinnik", "1960.03.15", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O"), "same-game"),
    );
  });
});

/* ─── The plan and the steps ──────────────────────────────────────────── */

describe("the merge's steps", () => {
  it("plans every source counted, the cursor at the start", async () => {
    const reader = readerOf({ a: [numbered(1), numbered(2)], b: [numbered(3)] });
    const { state, progress } = await planOf(inputOf("none", ["a", "b"]), reader);
    expect(state).toEqual({
      version: COLLECTION_MERGE_STATE_VERSION,
      cursor: { source: 0, game: 0 },
      seen: [],
      seq: 0,
      counts: [
        { total: 2, read: 0, written: 0, duplicates: 0, unreadable: 0 },
        { total: 1, read: 0, written: 0, duplicates: 0, unreadable: 0 },
      ],
      chars: 0,
    });
    expect(progress).toEqual({ done: 0, total: 3, label: "A" });
  });

  it("reads 500 games a step, one part each, crossing into the next source inside a batch", async () => {
    const a = Array.from({ length: 700 }, (_, index) => numbered(index));
    const b = Array.from({ length: 450 }, (_, index) => numbered(1000 + index));
    const input = inputOf("none", ["a", "b"]);
    const reader = readerOf({ a, b });
    const sink = partSink();
    const { state: planned } = await planOf(input, reader);

    const first = await stepOf(planned, input, reader, (seq, text) => sink.write(seq, text));
    expect(first.state.cursor).toEqual({ source: 0, game: COLLECTION_MERGE_BATCH });
    expect(first.state.seq).toBe(1);
    expect(first.done).toBe(false);
    expect(first.progress).toEqual({ done: 500, total: 1150, label: "A" });

    const second = await stepOf(first.state, input, reader, (seq, text) => sink.write(seq, text));
    expect(second.state.cursor).toEqual({ source: 1, game: 300 });
    expect(second.state.counts.map((counts) => counts.read)).toEqual([700, 300]);
    expect(second.progress.label).toBe("B");

    const third = await stepOf(second.state, input, reader, (seq, text) => sink.write(seq, text));
    expect(third.done).toBe(true);
    expect(third.state.cursor).toEqual({ source: 2, game: 0 });
    expect(third.progress).toEqual({ done: 1150, total: 1150 });
    expect(sink.parts.size).toBe(3);
    expect(sink.file()).toBe([...a, ...b].map((each) => `${each}\n\n`).join(""));
    expect(third.state.chars).toBe(sink.file().length);
  });

  it("counts and skips a game chess.js cannot read", async () => {
    const reader = readerOf({ a: [numbered(1), UNREADABLE], b: [numbered(2)] });
    const { state, file } = await runAll(inputOf("none", ["a", "b"]), reader);
    expect(state.counts[0]).toEqual({ total: 2, read: 2, written: 1, duplicates: 0, unreadable: 1 });
    expect(file).not.toContain("Broken");
  });

  it("refuses a state planned for other sources", async () => {
    const reader = readerOf({ a: [numbered(1)], b: [numbered(2)], c: [] });
    const { state } = await planOf(inputOf("none", ["a", "b"]), reader);
    await expect(stepOf(state, inputOf("none", ["a", "b", "c"]), reader, async () => {})).rejects.toBeInstanceOf(CollectionMergeError);
  });

  it("passes a reader's rejection on — a collection gone", async () => {
    const reader = readerOf({ a: [numbered(1)], b: [numbered(2)] });
    const input = inputOf("none", ["a", "b"]);
    const { state } = await planOf(input, reader);
    await expect(stepOf(state, { ...input, sources: [{ id: "a", name: "A" }, { id: "gone", name: "Gone" }] }, reader, async () => {})).rejects.toThrow(
      "gone: gone",
    );
  });
});

/* ─── Dedupe, crafted duplicates ──────────────────────────────────────── */

describe("the three dedupe modes over crafted duplicates", () => {
  const original = game("Tal", "Botvinnik", "1960.03.15", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6");
  const copy = `${original}\r\n`;
  const commented = game("Tal", "Botvinnik", "1960.03.15", "1. e4 {Tal's favourite} e5 2. Nf3 $1 Nc6 (2... d6) 3. Bb5!? a6");
  const sameDayOtherGame = game("Tal", "Botvinnik", "1960.03.15", "1. d4 Nf6 2. c4 e6");
  const collections = { a: [original, sameDayOtherGame], b: [copy, commented] };

  const written = async (dedupe: CollectionMergeDedupe) => {
    const { state, file } = await runAll(inputOf(dedupe, ["a", "b"]), readerOf(collections));
    return { state, file, games: file.split("\n\n[Event").length };
  };

  it("none keeps every game", async () => {
    const { state, games } = await written("none");
    expect(games).toBe(4);
    expect(state.seen).toEqual([]);
    expect(state.counts.map((counts) => counts.duplicates)).toEqual([0, 0]);
  });

  it("identical-pgn drops the exact copy, keeps the commented one and the other game of the day", async () => {
    const { state, file, games } = await written("identical-pgn");
    expect(games).toBe(3);
    expect(state.counts[1]).toEqual({ total: 2, read: 2, written: 1, duplicates: 1, unreadable: 0 });
    expect(file).toContain("Tal's favourite");
    expect(file).toContain("1. d4 Nf6");
  });

  it("same-game drops the copy and the commented one, keeps the other game of the same players and date", async () => {
    const { state, file, games } = await written("same-game");
    expect(games).toBe(2);
    expect(state.counts[1]).toEqual({ total: 2, read: 2, written: 0, duplicates: 2, unreadable: 0 });
    expect(file).not.toContain("Tal's favourite");
    expect(file).toContain("1. d4 Nf6");
    expect(state.seen).toHaveLength(2);
  });

  it("finds duplicates inside one source as well as across", async () => {
    const { state } = await runAll(inputOf("identical-pgn", ["a", "b"]), readerOf({ a: [original, original], b: [original] }));
    expect(state.counts.map((counts) => counts.duplicates)).toEqual([1, 1]);
  });
});

/* ─── Resumable: byte-identical ───────────────────────────────────────── */

describe("a merge interrupted after any batch and resumed", () => {
  // Three sources across several batches: duplicates and an unreadable game among them.
  const a = Array.from({ length: 620 }, (_, index) => (index === 33 ? UNREADABLE : numbered(index % 400)));
  const b = Array.from({ length: 180 }, (_, index) => numbered(index * 3));
  const c = Array.from({ length: 510 }, (_, index) => numbered(2000 + index));
  const collections = { a, b, c };

  for (const dedupe of ["none", "identical-pgn", "same-game"] as const) {
    it(`writes the same file, byte for byte, whichever batch it stopped after (${dedupe})`, async () => {
      const input = inputOf(dedupe, ["a", "b", "c"]);
      const whole = await runAll(input, readerOf(collections));
      expect(whole.steps).toBeGreaterThan(2);

      for (let stopAfter = 0; stopAfter < whole.steps; stopAfter += 1) {
        const reader = readerOf(collections);
        const sink = partSink();
        let { state } = await planOf(input, reader);
        for (let step = 0; step < stopAfter; step += 1) {
          state = persisted((await stepOf(state, input, reader, (seq, text) => sink.write(seq, text))).state);
        }
        // The crash: the next step wrote its part, but its checkpoint never landed.
        await stepOf(state, input, reader, (seq, text) => sink.write(seq, text));
        // Resumed from the last checkpoint, run to the end.
        for (;;) {
          const result = await stepOf(state, input, reader, (seq, text) => sink.write(seq, text));
          state = persisted(result.state);
          if (result.done) break;
        }
        expect(sink.file()).toBe(whole.file);
        expect(state).toEqual(whole.state);
      }
    });
  }
});

/* ─── The state read back ─────────────────────────────────────────────── */

describe("the state, read back", () => {
  it("round-trips the plan's state", async () => {
    const { state } = await planOf(inputOf("none", ["a", "b"]), readerOf({ a: [], b: [] }));
    expect(parseCollectionMergeState(JSON.parse(JSON.stringify(state)), COLLECTION_MERGE_STATE_VERSION)).toEqual(state);
  });

  it("re-plans another version or a broken value", () => {
    const state = { version: 1, cursor: { source: 0, game: 0 }, seen: ["x", 2], seq: 0, counts: [{ total: 1, read: 0, written: 0, duplicates: 0, unreadable: 0 }], chars: 0 };
    expect(parseCollectionMergeState(state, 1)?.seen).toEqual(["x"]);
    expect(parseCollectionMergeState(state, 2)).toBeUndefined();
    expect(parseCollectionMergeState({ ...state, version: 2 }, 1)).toBeUndefined();
    expect(parseCollectionMergeState({ ...state, cursor: { source: -1, game: 0 } }, 1)).toBeUndefined();
    expect(parseCollectionMergeState({ ...state, cursor: { source: 5, game: 0 } }, 1)).toBeUndefined();
    expect(parseCollectionMergeState({ ...state, counts: [{ total: 1 }] }, 1)).toBeUndefined();
    expect(parseCollectionMergeState("state", 1)).toBeUndefined();
  });
});

/* ─── The outputs ─────────────────────────────────────────────────────── */

describe("the merge's outputs", () => {
  const finished = (chars: number, written = 3): CollectionMergeState => ({
    version: 1,
    cursor: { source: 2, game: 0 },
    seen: [],
    seq: 1,
    counts: [
      { total: 2, read: 2, written: written === 0 ? 0 : 2, duplicates: 0, unreadable: written === 0 ? 2 : 0 },
      { total: 2, read: 2, written: written === 0 ? 0 : 1, duplicates: 1, unreadable: 0 },
    ],
    chars,
  });
  const input = inputOf("identical-pgn", ["a", "b"], { name: "Tal: all / games" });

  it("plans the file, the collection under a deterministic id, and the summary", () => {
    const plans = outputPlansOf(finished(1200), input, "Job-1x");
    expect(plans).toEqual([
      { key: "pgn-file", kind: "artifact", artifactKey: "pgn", name: "Tal all games.pgn", mimeType: "application/x-chess-pgn" },
      { key: "collection", kind: "library-collection", artifactKey: "pgn", collectionId: "ujob1x", name: "Tal: all / games" },
      {
        key: "summary",
        kind: "data",
        schema: COLLECTION_MERGE_SUMMARY_SCHEMA,
        value: {
          name: "Tal: all / games",
          dedupe: "identical-pgn",
          sources: [
            { id: "a", name: "A", read: 2, written: 2, duplicates: 0, unreadable: 0 },
            { id: "b", name: "B", read: 2, written: 1, duplicates: 1, unreadable: 0 },
          ],
          totals: { read: 4, written: 3, duplicates: 1, unreadable: 0 },
          chars: 1200,
          collection: { status: "added", id: "ujob1x", name: "Tal: all / games" },
        },
      },
    ]);
    expect(outputPlansOf(finished(1200), input, "Job-1x")).toEqual(plans);
    expect(mergedCollectionId("g1abc")).toBe("ug1abc");
    expect(mergedPgnFileName("  ")).toBe("merged.pgn");
  });

  it("omits the collection over MAX_COLLECTION_CHARS, saying why", () => {
    const plans = outputPlansOf(finished(MAX_COLLECTION_CHARS + 1), input, "j1");
    expect(plans.map((plan) => plan.key)).toEqual(["pgn-file", "summary"]);
    expect(summaryOf(finished(MAX_COLLECTION_CHARS + 1), input, "j1").collection).toEqual({
      status: "too-large",
      chars: MAX_COLLECTION_CHARS + 1,
      limit: MAX_COLLECTION_CHARS,
    });
    // At the limit exactly, it is made.
    expect(outputPlansOf(finished(MAX_COLLECTION_CHARS), input, "j1").map((plan) => plan.key)).toEqual(["pgn-file", "collection", "summary"]);
  });

  it("omits it with no game written, and when not asked for", () => {
    expect(summaryOf(finished(0, 0), input, "j1").collection).toEqual({ status: "empty" });
    const notAsked = { ...input, outputs: { collection: false } };
    expect(outputPlansOf(finished(1200), notAsked, "j1").map((plan) => plan.key)).toEqual(["pgn-file", "summary"]);
    expect(summaryOf(finished(1200), notAsked, "j1").collection).toEqual({ status: "not-requested" });
  });

  it("reads a summary back, its totals summed again", () => {
    const summary = summaryOf(finished(1200), input, "j1");
    expect(parseCollectionMergeSummary(JSON.parse(JSON.stringify(summary)))).toEqual(summary);
    expect(parseCollectionMergeSummary({ ...summary, sources: [summary.sources[0], { id: "x" }], totals: { read: 99 } })).toEqual({
      ...summary,
      sources: [summary.sources[0]],
      totals: { read: 2, written: 2, duplicates: 0, unreadable: 0 },
    });
    expect(parseCollectionMergeSummary({ ...summary, collection: { status: "maybe" } })).toBeUndefined();
    expect(parseCollectionMergeSummary(null)).toBeUndefined();
  });
});
