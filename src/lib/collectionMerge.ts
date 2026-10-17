import { gameTag } from "./gameModel";
import { MAX_COLLECTION_NAME_CHARS, mainlineTokens } from "./libraryCollections";
import { readPgnParts } from "./pgn";

/**
 * **Library collections merged, the pure part** (CTA-232 — the merge of
 * CTA-220, a job of the Jobs module until then): two or more collections,
 * in the order picked, joined into one list of games — every game once where
 * the reader asked for duplicates to go — which the Library then keeps as a
 * new collection as it keeps an upload (`views/library/useCollectionMerge.tsx`:
 * the Library's indexer in its worker, `addCollection`).
 *
 * No store and no `chess.js` here: the sources arrive as their games (one
 * PGN chunk each, as the Library holds them — `collectionGamesOf` cut them
 * when they came in, so the merge never cuts a text again), and a game the
 * indexer cannot read is the indexer's to mark (`unreadable`), as on any
 * upload. Joining and hashing is cheap — about 0.02 ms a game, two seconds
 * for 100,000 — so the work a merge costs is the index pass of its result.
 *
 * - **A game is written normalised** ({@link normalisedGameText}: `\n` line
 *   endings, no trailing space, trimmed).
 * - **A game's identity** depends on the dedupe mode ({@link gameKeyOf}):
 *   `identical-pgn` is the normalised text; `same-game` the mainline's moves
 *   (no comments, NAGs, glyphs or side lines) with the White, Black and Date
 *   tags. Each is hashed to 16 hex digits — 64-bit FNV-1a ({@link fnv1a64}).
 *   Two different games colliding is possible but, at 100,000 games, about
 *   one chance in 3.7 billion; the merge accepts it (the second would be
 *   counted as a duplicate).
 */

/** The fewest collections a merge takes. */
export const MIN_MERGE_SOURCES = 2;

/** How duplicates are told: not at all, the same text, or the same game (moves, players, date). */
export const COLLECTION_MERGE_DEDUPE_MODES = ["none", "identical-pgn", "same-game"] as const;
export type CollectionMergeDedupe = (typeof COLLECTION_MERGE_DEDUPE_MODES)[number];

/** The default: exact copies go, a game annotated twice stays twice. */
const DEFAULT_COLLECTION_MERGE_DEDUPE: CollectionMergeDedupe = "identical-pgn";

/** A collection to merge — its id (shipped or uploaded) and its name. */
export type CollectionMergeSource = { id: string; name: string };

/** **What the reader sets**, besides the collections picked. */
export type CollectionMergeSettings = {
  dedupe: CollectionMergeDedupe;
  /** The new collection's name — `""` for the default ({@link defaultMergeName}). */
  name: string;
};

export const DEFAULT_COLLECTION_MERGE_SETTINGS: CollectionMergeSettings = { dedupe: DEFAULT_COLLECTION_MERGE_DEDUPE, name: "" };

/**
 * **The name a merge is given by default**: "<first> + <n> more" — `more`
 * says "<n> more" in the reader's language, English without it. One
 * collection alone is its name; none, "Merged collections".
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

/** **The new collection's name**: as typed, else the default — held to the Library's limit. */
export const mergeNameOf = (
  name: string,
  sources: readonly Pick<CollectionMergeSource, "name">[],
  more?: (count: number) => string,
): string => (name.trim() || defaultMergeName(sources, more)).slice(0, MAX_COLLECTION_NAME_CHARS);

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

/* ─── The merge ───────────────────────────────────────────────────────── */

/** What became of one source's games. */
export type CollectionMergeCounts = { read: number; written: number; duplicates: number };

/** **A merge's result.** */
export type CollectionMerge = {
  /** The games kept, in the sources' order, each normalised — the new collection's. */
  games: string[];
  /** Per source, in the order given. */
  counts: CollectionMergeCounts[];
  totals: CollectionMergeCounts;
  /** The merged PGN's length in characters — each game and the blank line after it — what a collection is held to (`MAX_COLLECTION_CHARS`). */
  chars: number;
};

/**
 * **The merge** — every source's games in order, each normalised, a game
 * whose identity ({@link gameKeyOf}) is one already kept counted as a
 * duplicate and left out. Pure and synchronous: a loop over the games, no
 * spread over them (a merge can hold 100,000).
 */
export const mergeCollectionGames = (sources: readonly (readonly string[])[], dedupe: CollectionMergeDedupe): CollectionMerge => {
  const seen = new Set<string>();
  const games: string[] = [];
  const counts: CollectionMergeCounts[] = [];
  let chars = 0;
  for (const source of sources) {
    const tally: CollectionMergeCounts = { read: 0, written: 0, duplicates: 0 };
    for (const chunk of source) {
      tally.read += 1;
      const text = normalisedGameText(chunk);
      const key = gameKeyOf(text, dedupe);
      if (key !== undefined) {
        if (seen.has(key)) {
          tally.duplicates += 1;
          continue;
        }
        seen.add(key);
      }
      tally.written += 1;
      games.push(text);
      chars += text.length + 2;
    }
    counts.push(tally);
  }
  const totals = counts.reduce(
    (sum, each) => ({ read: sum.read + each.read, written: sum.written + each.written, duplicates: sum.duplicates + each.duplicates }),
    { read: 0, written: 0, duplicates: 0 },
  );
  return { games, counts, totals, chars };
};
