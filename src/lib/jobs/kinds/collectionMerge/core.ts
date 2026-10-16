import { gameTag } from "../../../gameModel";
import { MAX_COLLECTION_CHARS, MAX_COLLECTION_NAME_CHARS, mainlineTokens } from "../../../libraryCollections";
import { parsePgnGames, readPgnParts } from "../../../pgn";

/**
 * **The collection merge, the pure core** (CTA-220, a kind of the Jobs
 * module — CTA-215's *The three kinds*, `library.collection-merge`): two or
 * more Library collections, in the order picked, read into one PGN file —
 * every game once where the reader asked for duplicates to go — and, when it
 * fits, a new Library collection of it.
 *
 * No store, runtime or React here: the collections are read through an
 * injected {@link CollectionMergeReader} (the Library's,
 * `libraryReader.ts`), the file is written through an injected
 * {@link CollectionMergePartWriter} (the runtime's `ctx.artifacts.writePart`
 * under {@link MERGED_PGN_ARTIFACT_KEY}), and the outputs are *planned*
 * ({@link outputPlansOf}) for the adapter to apply. The adapter (`kind.ts`)
 * and its wiring are CTA-221's.
 *
 * ```
 * input ─▶ planOf (each source counted) ─▶ state { cursor 0:0, seen [], seq 0, counts }
 *            stepOf × n (500 games each, one part each) ─▶ state { cursor, seen, seq, counts, chars }
 *                                                       ─▶ summaryOf · outputPlansOf
 * ```
 *
 * - **The checkpoint is a cursor** — a source's place in the input and a
 *   game's in that source — with the hashes of the games kept so far, the next
 *   part's number and the counts. A step starts from it, reads the next
 *   {@link COLLECTION_MERGE_BATCH} games (crossing into the next source inside
 *   the batch), writes **one part at `seq`** and moves the cursor on. From the
 *   same state a step reads the same games and writes the same part at the
 *   same `seq` — so a step re-run after a crash rewrites it, never appends it
 *   twice, and a merge interrupted after any batch and resumed is the same
 *   file, byte for byte, as one that never stopped.
 * - **A game is written normalised** ({@link normalisedGameText}: `\n` line
 *   endings, no trailing space, trimmed), followed by a blank line.
 * - **A game's identity** depends on the dedupe mode ({@link gameKeyOf}):
 *   `identical-pgn` is the normalised text; `same-game` the mainline's moves
 *   (no comments, NAGs, glyphs or side lines) with the White, Black and Date
 *   tags. Each is hashed to 16 hex digits — 64-bit FNV-1a
 *   ({@link fnv1a64}). Two different games colliding is possible but, at
 *   100,000 games, about one chance in 3.7 billion; the merge accepts it (the
 *   second would be counted as a duplicate).
 * - **A game `chess.js` cannot read** (`parsePgnGames` throws) is counted
 *   and skipped, never written.
 */

/** The kind's id in the Jobs module's registry. */
export const COLLECTION_MERGE_KIND = "library.collection-merge";

/** The summary's schema — a data output's `schema`, which its view checks. */
export const COLLECTION_MERGE_SUMMARY_SCHEMA = "library.collection-merge.summary@1";

/** The state's shape version; a state of another reads as none (re-planned). */
export const COLLECTION_MERGE_STATE_VERSION = 1;

/** Games read per step — the checkpoint unit. */
export const COLLECTION_MERGE_BATCH = 500;

/** The artifact the merged PGN's parts are written under (`ctx.artifacts.writePart(key, seq, …)`). */
export const MERGED_PGN_ARTIFACT_KEY = "pgn";

export const PGN_MIME_TYPE = "application/x-chess-pgn";

/** The fewest collections a merge takes. */
export const MIN_MERGE_SOURCES = 2;

/** How duplicates are told: not at all, the same text, or the same game (moves, players, date). */
export const COLLECTION_MERGE_DEDUPE_MODES = ["none", "identical-pgn", "same-game"] as const;
export type CollectionMergeDedupe = (typeof COLLECTION_MERGE_DEDUPE_MODES)[number];

/** The default: exact copies go, a game annotated twice stays twice. */
export const DEFAULT_COLLECTION_MERGE_DEDUPE: CollectionMergeDedupe = "identical-pgn";

/** A collection to merge — its id (shipped or uploaded) and its name when picked. */
export type CollectionMergeSource = { id: string; name: string };

/** What is made besides the PGN file, which always is: a new Library collection. */
export type CollectionMergeOutputs = { collection: boolean };

/** **What the reader sets** in the New-job form, besides the collections picked. */
export type CollectionMergeSettings = {
  dedupe: CollectionMergeDedupe;
  /** The merge's name: the file's (`<name>.pgn`) and the new collection's. */
  name: string;
  outputs: CollectionMergeOutputs;
};

/** **The job's input** — immutable once enqueued. */
export type CollectionMergeInput = CollectionMergeSettings & {
  /** Two or more, in the order their games are written. */
  sources: CollectionMergeSource[];
};

export const DEFAULT_COLLECTION_MERGE_SETTINGS: CollectionMergeSettings = {
  dedupe: DEFAULT_COLLECTION_MERGE_DEDUPE,
  name: "",
  outputs: { collection: false },
};

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const isDedupe = (value: unknown): value is CollectionMergeDedupe => (COLLECTION_MERGE_DEDUPE_MODES as readonly unknown[]).includes(value);

/**
 * **The name a merge is given by default**: "<first> + <n> more" — `more`
 * says "<n> more" in the reader's language (the form's), English without it.
 * One collection alone is its name; none, "Merged collections".
 */
export const defaultMergeName = (
  sources: readonly Pick<CollectionMergeSource, "name">[],
  more: (count: number) => string = (count) => `${count} more`,
): string => {
  const [first, ...rest] = sources;
  if (first === undefined) return "Merged collections";
  const name = first.name.trim() || "Collection";
  return rest.length === 0 ? name : `${name} + ${more(rest.length)}`;
};

/** A name held to the Library's limit, or the default where it is blank. */
const nameFor = (name: unknown, sources: readonly CollectionMergeSource[]): string => {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return (trimmed === "" ? defaultMergeName(sources) : trimmed).slice(0, MAX_COLLECTION_NAME_CHARS);
};

/**
 * **Settings from a form or a stored input**, every field read on its own: an
 * unknown dedupe mode is the default, a name that is not a string is blank,
 * an output not ticked is off. Never throws.
 */
export const collectionMergeSettingsFrom = (value: unknown): CollectionMergeSettings => {
  const row = isRow(value) ? value : {};
  const outputs = isRow(row.outputs) ? row.outputs : {};
  return {
    dedupe: isDedupe(row.dedupe) ? row.dedupe : DEFAULT_COLLECTION_MERGE_DEDUPE,
    name: typeof row.name === "string" ? row.name : "",
    outputs: { collection: outputs.collection === true },
  };
};

/**
 * **The input, read leniently** (the kind's `parseInput`): the sources that
 * read (an id, a name — blank where it is not a string), a collection picked
 * twice kept once, in order; `undefined` with fewer than
 * {@link MIN_MERGE_SOURCES}. The settings as
 * {@link collectionMergeSettingsFrom} reads them, a blank name the default
 * ({@link defaultMergeName}). Never throws.
 */
export const parseCollectionMergeInput = (value: unknown): CollectionMergeInput | undefined => {
  if (!isRow(value) || !Array.isArray(value.sources)) return undefined;
  const ids = new Set<string>();
  const sources: CollectionMergeSource[] = [];
  for (const source of value.sources) {
    if (!isRow(source) || typeof source.id !== "string" || source.id === "" || ids.has(source.id)) continue;
    ids.add(source.id);
    sources.push({ id: source.id, name: typeof source.name === "string" ? source.name : "" });
  }
  if (sources.length < MIN_MERGE_SOURCES) return undefined;
  const settings = collectionMergeSettingsFrom(value);
  return { sources, ...settings, name: nameFor(settings.name, sources) };
};

/* ─── A game's identity ───────────────────────────────────────────────── */

/**
 * **A game as the merge writes it**: line endings `\n`, every line's trailing
 * space and tabs dropped, the whole trimmed — so a file saved on Windows and
 * the same file saved elsewhere write, and compare, the same.
 */
export const normalisedGameText = (chunk: string): string =>
  chunk
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim();

const utf8 = new TextEncoder();

/**
 * **64-bit FNV-1a** over a string's UTF-8, as 16 hex digits. Worked in four
 * 16-bit limbs, so no `BigInt` (the prime is 2⁴⁰ + 0x1b3: a limb times 0x1b3,
 * plus the limb two places down times 0x100).
 */
export const fnv1a64 = (text: string): string => {
  // The offset basis, 0xcbf29ce484222325, low limb first.
  let h0 = 0x2325;
  let h1 = 0x8422;
  let h2 = 0x9ce4;
  let h3 = 0xcbf2;
  for (const byte of utf8.encode(text)) {
    h0 ^= byte;
    const t0 = h0 * 0x1b3;
    const t1 = h1 * 0x1b3 + (t0 >>> 16);
    const t2 = h2 * 0x1b3 + h0 * 0x100 + (t1 >>> 16);
    const t3 = h3 * 0x1b3 + h1 * 0x100 + (t2 >>> 16);
    h0 = t0 & 0xffff;
    h1 = t1 & 0xffff;
    h2 = t2 & 0xffff;
    h3 = t3 & 0xffff;
  }
  return [h3, h2, h1, h0].map((limb) => limb.toString(16).padStart(4, "0")).join("");
};

/** A mainline move as the same-game identity reads it: its `!` / `?` glyphs dropped, `0-0` as `O-O`. */
const bareMove = (token: string): string => token.replace(/[!?]+$/, "").replace(/^0-0(-0)?/, (castle) => castle.replace(/0/g, "O"));

/**
 * **A game's identity under a dedupe mode** — `undefined` for `none`, which
 * keeps every game. `identical-pgn`: the hash of the normalised text.
 * `same-game`: the hash of the mainline's moves (comments, NAGs, glyphs, side
 * lines, move numbers and the result dropped) with the White, Black and Date
 * tags (a placeholder `?` read as none) — so a game annotated twice is one
 * game, and two games of the same players on the same day are two.
 */
export const gameKeyOf = (normalised: string, dedupe: CollectionMergeDedupe): string | undefined => {
  if (dedupe === "none") return undefined;
  if (dedupe === "identical-pgn") return fnv1a64(normalised);
  const { headers, movetext } = readPgnParts(normalised);
  const tag = (key: string) => gameTag(headers, key) ?? "";
  return fnv1a64([tag("White"), tag("Black"), tag("Date"), mainlineTokens(movetext).map(bareMove).join(" ")].join("\u0000"));
};

/** Whether `chess.js` reads the game (`parsePgnGames`). */
const readable = (normalised: string): boolean => {
  try {
    parsePgnGames(normalised);
    return true;
  } catch {
    return false;
  }
};

/* ─── The plan and its state ──────────────────────────────────────────── */

/** **The Library, as the merge reads it** — `libraryReader.ts`'s, or a test's in memory. */
export type CollectionMergeReader = {
  /** How many games the collection holds. Rejects when it is gone. */
  count(id: string): Promise<number>;
  /** Up to `n` games from the 0-based `from`, each one game's PGN — fewer at its end. Rejects when it is gone. */
  read(id: string, from: number, n: number): Promise<readonly string[]>;
};

/** **Where the PGN goes** — one part per step, idempotent by `seq` (the runtime's `writePart` under {@link MERGED_PGN_ARTIFACT_KEY}). */
export type CollectionMergePartWriter = (seq: number, text: string) => Promise<void>;

/** One source's tally — `total` its games when planned, the rest what the merge has done with them. */
export type CollectionMergeCounts = { total: number; read: number; written: number; duplicates: number; unreadable: number };

/** **The checkpoint.** */
export type CollectionMergeState = {
  version: number;
  /** The next game to read: a source's index in the input, a game's in that source. Past the last source, done. */
  cursor: { source: number; game: number };
  /** The identities of the games written so far ({@link gameKeyOf}) — empty under `none`. */
  seen: string[];
  /** The next part's number: how many parts are written. */
  seq: number;
  /** Per source, in the input's order. */
  counts: CollectionMergeCounts[];
  /** The PGN's length so far, in characters — what the new collection is held to. */
  chars: number;
};

/** How far a job has got — the runtime's `JobProgress`. */
export type CollectionMergeProgress = { done: number; total: number; label?: string };

const emptyCounts = (total: number): CollectionMergeCounts => ({ total, read: 0, written: 0, duplicates: 0, unreadable: 0 });

/** Games read of games planned — the total grows with a source that turned out longer. */
export const progressOf = (state: CollectionMergeState, input?: Pick<CollectionMergeInput, "sources">): CollectionMergeProgress => {
  const read = state.counts.reduce((sum, counts) => sum + counts.read, 0);
  const planned = state.counts.reduce((sum, counts) => sum + counts.total, 0);
  const finished = state.cursor.source >= state.counts.length;
  const total = Math.max(planned, read);
  const label = input?.sources[state.cursor.source]?.name;
  return { done: finished ? total : read, total, ...(label === undefined || finished ? {} : { label }) };
};

/** **The plan** (the kind's `plan`): every source counted; the cursor at the first game. */
export const planOf = async (
  input: CollectionMergeInput,
  reader: CollectionMergeReader,
): Promise<{ state: CollectionMergeState; progress: CollectionMergeProgress }> => {
  const counts: CollectionMergeCounts[] = [];
  for (const source of input.sources) counts.push(emptyCounts(Math.max(0, Math.floor(await reader.count(source.id)))));
  const state: CollectionMergeState = { version: COLLECTION_MERGE_STATE_VERSION, cursor: { source: 0, game: 0 }, seen: [], seq: 0, counts, chars: 0 };
  return { state, progress: progressOf(state, input) };
};

const whole = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;

const countsFrom = (value: unknown): CollectionMergeCounts | undefined => {
  if (!isRow(value)) return undefined;
  const [total, read, written, duplicates, unreadable] = [value.total, value.read, value.written, value.duplicates, value.unreadable].map(whole);
  if (total === undefined || read === undefined || written === undefined || duplicates === undefined || unreadable === undefined) return undefined;
  return { total, read, written, duplicates, unreadable };
};

/**
 * **A stored state, read leniently** (the kind's `parseState`): `undefined` —
 * re-plan — for another shape version, a kind version that is not this one,
 * or a value whose cursor, part number, counts or length do not read. A
 * hash that is not a string is dropped. Never throws.
 */
export const parseCollectionMergeState = (
  value: unknown,
  fromVersion: number = COLLECTION_MERGE_STATE_VERSION,
): CollectionMergeState | undefined => {
  if (fromVersion !== COLLECTION_MERGE_STATE_VERSION) return undefined;
  if (!isRow(value) || value.version !== COLLECTION_MERGE_STATE_VERSION || !isRow(value.cursor)) return undefined;
  const source = whole(value.cursor.source);
  const game = whole(value.cursor.game);
  const seq = whole(value.seq);
  const chars = whole(value.chars);
  if (source === undefined || game === undefined || seq === undefined || chars === undefined || !Array.isArray(value.counts)) return undefined;
  const counts = value.counts.map(countsFrom);
  if (counts.some((each) => each === undefined) || source > counts.length) return undefined;
  const seen = Array.isArray(value.seen) ? value.seen.filter((hash): hash is string => typeof hash === "string") : [];
  return {
    version: COLLECTION_MERGE_STATE_VERSION,
    cursor: { source, game },
    seen,
    seq,
    counts: counts as CollectionMergeCounts[],
    chars,
  };
};

/* ─── One step ────────────────────────────────────────────────────────── */

/** Why a step could not go on: a state that is not this input's (planned for other sources). */
export type CollectionMergeErrorCode = "state";

export class CollectionMergeError extends Error {
  readonly code: CollectionMergeErrorCode;

  constructor(code: CollectionMergeErrorCode, message?: string) {
    super(message ?? code);
    this.name = "CollectionMergeError";
    this.code = code;
  }
}

/**
 * **One unit of work** (the kind's `step`): the next
 * {@link COLLECTION_MERGE_BATCH} games from the cursor — on into the next
 * source when one ends (a read that answers fewer than asked) — each
 * normalised, then counted as unreadable, a duplicate or written; the written
 * ones are **one part at `seq`** (none for a batch that wrote nothing), then
 * the cursor, the hashes, `seq` and the counts move on. At least once: from
 * the same state it reads the same games and writes the same part, so a re-run
 * rewrites, never duplicates. `done` once the cursor is past the last source.
 * A reader's rejection (a collection gone) is the step's.
 */
export const stepOf = async (
  state: CollectionMergeState,
  input: CollectionMergeInput,
  reader: CollectionMergeReader,
  writePart: CollectionMergePartWriter,
): Promise<{ state: CollectionMergeState; progress: CollectionMergeProgress; done: boolean }> => {
  if (state.counts.length !== input.sources.length) {
    throw new CollectionMergeError("state", `A state of ${state.counts.length} sources for ${input.sources.length}.`);
  }
  let { source, game } = state.cursor;
  const counts = state.counts.map((each) => ({ ...each }));
  const seen = new Set(state.seen);
  const added: string[] = [];
  const written: string[] = [];
  let taken = 0;

  while (taken < COLLECTION_MERGE_BATCH && source < input.sources.length) {
    const asked = COLLECTION_MERGE_BATCH - taken;
    const games = (await reader.read(input.sources[source].id, game, asked)).slice(0, asked);
    const tally = counts[source];
    for (const chunk of games) {
      tally.read += 1;
      const text = normalisedGameText(chunk);
      if (!readable(text)) {
        tally.unreadable += 1;
        continue;
      }
      const key = gameKeyOf(text, input.dedupe);
      if (key !== undefined) {
        if (seen.has(key)) {
          tally.duplicates += 1;
          continue;
        }
        seen.add(key);
        added.push(key);
      }
      tally.written += 1;
      written.push(`${text}\n\n`);
    }
    taken += games.length;
    game += games.length;
    if (games.length < asked) {
      source += 1;
      game = 0;
    }
  }

  const part = written.join("");
  if (part !== "") await writePart(state.seq, part);
  const next: CollectionMergeState = {
    version: COLLECTION_MERGE_STATE_VERSION,
    cursor: { source, game },
    seen: added.length === 0 ? state.seen : [...state.seen, ...added],
    seq: part === "" ? state.seq : state.seq + 1,
    counts,
    chars: state.chars + part.length,
  };
  return { state: next, progress: progressOf(next, input), done: source >= input.sources.length };
};

/* ─── The summary and the outputs ─────────────────────────────────────── */

/**
 * What became of the new collection: not asked for; added (the outbox's
 * `collection` entry, its id); or not made — the PGN over
 * `MAX_COLLECTION_CHARS`, or no game written.
 */
export type CollectionMergeCollectionOutcome =
  | { status: "not-requested" }
  | { status: "added"; id: string; name: string }
  | { status: "too-large"; chars: number; limit: number }
  | { status: "empty" };

/** A source's line of the summary. */
export type CollectionMergeSourceSummary = CollectionMergeSource & Omit<CollectionMergeCounts, "total">;

/** **The summary** — the `library.collection-merge.summary@1` data output. */
export type CollectionMergeSummary = {
  name: string;
  dedupe: CollectionMergeDedupe;
  sources: CollectionMergeSourceSummary[];
  totals: Omit<CollectionMergeCounts, "total">;
  /** The PGN file's length, in characters. */
  chars: number;
  collection: CollectionMergeCollectionOutcome;
};

/** The new collection's id, from the job's: `u` and the job id in `[0-9a-z]` — the same job always makes the same one. */
export const mergedCollectionId = (jobId: string): string => `u${jobId.toLowerCase().replace(/[^0-9a-z]/g, "")}`;

/** The PGN file's name: the merge's, made safe, then `.pgn`. */
export const mergedPgnFileName = (name: string): string => {
  const safe = [...name]
    .filter((char) => char >= " ")
    .join("")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${safe || "merged"}.pgn`;
};

const collectionOutcomeOf = (state: CollectionMergeState, input: CollectionMergeInput, jobId: string, written: number): CollectionMergeCollectionOutcome => {
  if (!input.outputs.collection) return { status: "not-requested" };
  if (written === 0) return { status: "empty" };
  if (state.chars > MAX_COLLECTION_CHARS) return { status: "too-large", chars: state.chars, limit: MAX_COLLECTION_CHARS };
  return { status: "added", id: mergedCollectionId(jobId), name: input.name };
};

const totalsOf = (sources: readonly CollectionMergeSourceSummary[]): CollectionMergeSummary["totals"] =>
  sources.reduce(
    (sum, each) => ({
      read: sum.read + each.read,
      written: sum.written + each.written,
      duplicates: sum.duplicates + each.duplicates,
      unreadable: sum.unreadable + each.unreadable,
    }),
    { read: 0, written: 0, duplicates: 0, unreadable: 0 },
  );

/** **The summary of a state**: per source and in all, and what became of the new collection. */
export const summaryOf = (state: CollectionMergeState, input: CollectionMergeInput, jobId: string): CollectionMergeSummary => {
  const sources = input.sources.map((source, index) => {
    const { read, written, duplicates, unreadable } = state.counts[index] ?? emptyCounts(0);
    return { id: source.id, name: source.name, read, written, duplicates, unreadable };
  });
  const totals = totalsOf(sources);
  return { name: input.name, dedupe: input.dedupe, sources, totals, chars: state.chars, collection: collectionOutcomeOf(state, input, jobId, totals.written) };
};

const outcomeFrom = (value: unknown): CollectionMergeCollectionOutcome | undefined => {
  if (!isRow(value)) return undefined;
  switch (value.status) {
    case "not-requested":
    case "empty":
      return { status: value.status };
    case "added":
      return typeof value.id === "string" && typeof value.name === "string" ? { status: "added", id: value.id, name: value.name } : undefined;
    case "too-large": {
      const chars = whole(value.chars);
      const limit = whole(value.limit);
      return chars === undefined || limit === undefined ? undefined : { status: "too-large", chars, limit };
    }
    default:
      return undefined;
  }
};

/**
 * **A summary read back** from a data output — for its view: `undefined` for
 * a value that is not one; a source line that does not read is dropped, and
 * the totals are summed again from the lines kept. Never throws.
 */
export const parseCollectionMergeSummary = (value: unknown): CollectionMergeSummary | undefined => {
  if (!isRow(value) || !Array.isArray(value.sources) || typeof value.name !== "string" || !isDedupe(value.dedupe)) return undefined;
  const collection = outcomeFrom(value.collection);
  const chars = whole(value.chars);
  if (collection === undefined || chars === undefined) return undefined;
  const sources = value.sources.flatMap((source): CollectionMergeSourceSummary[] => {
    if (!isRow(source) || typeof source.id !== "string" || typeof source.name !== "string") return [];
    const counts = countsFrom({ ...source, total: 0 });
    return counts === undefined
      ? []
      : [{ id: source.id, name: source.name, read: counts.read, written: counts.written, duplicates: counts.duplicates, unreadable: counts.unreadable }];
  });
  const totals = totalsOf(sources);
  return { name: value.name, dedupe: value.dedupe, sources, totals, chars, collection };
};

/**
 * **The outbox entries** a finished merge decides — each applied once by its
 * key (the kind's `finalize`). The adapter seals the parts written under
 * {@link MERGED_PGN_ARTIFACT_KEY} into the file, and makes the collection from
 * that same text (`collectionGamesOf`), under its deterministic id.
 */
export type CollectionMergeOutputPlan =
  | { key: "pgn-file"; kind: "artifact"; artifactKey: typeof MERGED_PGN_ARTIFACT_KEY; name: string; mimeType: typeof PGN_MIME_TYPE }
  | { key: "collection"; kind: "library-collection"; artifactKey: typeof MERGED_PGN_ARTIFACT_KEY; collectionId: string; name: string }
  | { key: "summary"; kind: "data"; schema: typeof COLLECTION_MERGE_SUMMARY_SCHEMA; value: CollectionMergeSummary };

/**
 * **The outputs** (the kind's `finalize`, deciding only): always the PGN file
 * `<name>.pgn`; with `outputs.collection`, a new Library collection named as
 * the merge, its id `u<jobId>` ({@link mergedCollectionId}) — only when the
 * PGN is at most `MAX_COLLECTION_CHARS` and holds a game, else not planned and
 * the reason in the summary; and the summary, as data.
 */
export const outputPlansOf = (state: CollectionMergeState, input: CollectionMergeInput, jobId: string): CollectionMergeOutputPlan[] => {
  const summary = summaryOf(state, input, jobId);
  const plans: CollectionMergeOutputPlan[] = [
    { key: "pgn-file", kind: "artifact", artifactKey: MERGED_PGN_ARTIFACT_KEY, name: mergedPgnFileName(input.name), mimeType: PGN_MIME_TYPE },
  ];
  if (summary.collection.status === "added") {
    plans.push({
      key: "collection",
      kind: "library-collection",
      artifactKey: MERGED_PGN_ARTIFACT_KEY,
      collectionId: summary.collection.id,
      name: summary.collection.name,
    });
  }
  plans.push({ key: "summary", kind: "data", schema: COLLECTION_MERGE_SUMMARY_SCHEMA, value: summary });
  return plans;
};
