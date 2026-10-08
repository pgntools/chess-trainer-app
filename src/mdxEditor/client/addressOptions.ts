import type { AutocompleteOption } from "../../design-system/components/autocompletes";
import { sourceAddressOf, sourcePathOf } from "../../lib/embedSource";
import { gameTag } from "../../lib/gameModel";
import type { CollectionSummary } from "../../lib/libraryCollections";
import { readPgnTags } from "../../lib/pgn";
import type { PlayedGame } from "../../lib/playedGames";
import { savedAnalysisDerivedName, type SavedAnalysis } from "../../lib/savedAnalyses";
import type { SavedRepertoire } from "../../lib/savedRepertoires";

/**
 * **The records an address can name, found by their name** (CTA-150) — the
 * Components gallery's "An address in the app" field, which takes a pasted
 * address as ever and, besides, the first letters of a record's name: a
 * Library collection (shipped or uploaded), a saved analysis, a repertoire
 * or a game played against the engine, each offered as its canonical path
 * (`sourcePathOf`) under its kind's heading.
 *
 * Pure: the stores are read by the dialog. {@link addressEntriesOf} works
 * the names out **once per read** (a store may hold 20,000 analyses, so a
 * name is a tag scan, never a parse, and never repeated per keystroke);
 * {@link addressOptionsOf} then narrows them by a typed text and cuts each
 * group short.
 */

/** What the dialog has read, one list per store. */
export type AddressRecords = {
  collections: readonly CollectionSummary[];
  analyses: readonly SavedAnalysis[];
  repertoires: readonly SavedRepertoire[];
  playedGames: readonly PlayedGame[];
};

/** One record to offer: its option, and the lowercase words it is found by. */
export type AddressEntry = { option: AutocompleteOption; haystack: string };

/** The kinds' headings, in the order the list shows them. */
export const ADDRESS_GROUPS = ["Library", "Saved analyses", "Repertoires", "Played games"] as const;

/** How many of a group the list shows at once — the rest are reached by typing more. */
export const ADDRESS_GROUP_LIMIT = 8;

const entryOf = (group: (typeof ADDRESS_GROUPS)[number], value: string, label: string, extra = ""): AddressEntry => ({
  option: { value, label, group },
  haystack: `${label} ${extra}`.toLowerCase(),
});

/** An untitled record's name, as the app's own lists put it. */
const UNTITLED_ANALYSIS = "Analysis board";
const UNTITLED_REPERTOIRE = "An untitled repertoire";

/** The day a game was first written down, for telling games with the same players apart. */
const dateOf = (iso: string): string => iso.slice(0, 10);

/** Every record as an entry, grouped in {@link ADDRESS_GROUPS}' order. */
export const addressEntriesOf = ({ collections, analyses, repertoires, playedGames }: AddressRecords): readonly AddressEntry[] => {
  const library = collections.map((summary) => entryOf("Library", sourcePathOf({ kind: "collection", collection: summary.id }), summary.name, summary.id));
  const analysed = analyses.map((saved) => {
    const name = saved.name || savedAnalysisDerivedName(readPgnTags(saved.pgn)) || UNTITLED_ANALYSIS;
    return entryOf("Saved analyses", sourcePathOf({ kind: "analysis", id: saved.id }), name, saved.description);
  });
  const kept = repertoires.map((saved) => entryOf("Repertoires", sourcePathOf({ kind: "repertoire", id: saved.id }), saved.name.trim() || UNTITLED_REPERTOIRE));
  const played = playedGames.map((game) => {
    const tags = readPgnTags(game.pgn);
    const players = `${gameTag(tags, "White") ?? "White"} – ${gameTag(tags, "Black") ?? "Black"}`;
    return entryOf("Played games", sourcePathOf({ kind: "playedGame", id: game.id }), `${players}, ${dateOf(game.savedAt)}`);
  });
  return [...library, ...analysed, ...kept, ...played];
};

/**
 * The options a typed text finds — every word of it (any case) somewhere in
 * a record's name, each group cut to {@link ADDRESS_GROUP_LIMIT}. An empty
 * text offers each group's first records, to browse. **Nothing for an
 * address** — one pasted, or typed from its first slash, is the reader's own
 * and is used as it is.
 */
export const addressOptionsOf = (entries: readonly AddressEntry[], text: string): AutocompleteOption[] => {
  const trimmed = text.trim();
  if (trimmed.startsWith("/") || sourceAddressOf(trimmed) !== undefined || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return [];
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const shown: Record<string, number> = {};
  const found: AutocompleteOption[] = [];
  for (const { option, haystack } of entries) {
    const group = option.group ?? "";
    if ((shown[group] ?? 0) >= ADDRESS_GROUP_LIMIT || !words.every((word) => haystack.includes(word))) continue;
    shown[group] = (shown[group] ?? 0) + 1;
    found.push(option);
  }
  return found;
};
