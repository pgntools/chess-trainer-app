import { sourceAddressOf, sourcePathOf, type SourceAddress, type SourceKind as AddressKind } from "../../lib/embedSource";
import { withInlinePgn, withPgnImports } from "./pgnImports";
import type { TournamentGuess, TournamentKind } from "../../lib/tournamentKind";
import rubinsteinCapablanca from "../../views/blog/articles/writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw";

/**
 * **The Components gallery's index** (CTA-140) — every component an article
 * can embed (`views/home/frontPage/index.ts`'s `mdxComponents`, but the
 * older names that are another with a source, `MDX_ALIASES`), one entry
 * each, in folders by what it is (boards, collections, repertoires,
 * tournament tables, images, the rest, and the components not built yet), each opening on a **shipped
 * sample** that fits it: a PGN beside the Blog's articles, or a Library
 * collection or game. Unlike Components' catalog (`componentCatalog.ts`,
 * by what the game is, for a game already chosen), this one is by
 * component. A new component is one entry here; the test holds the index
 * to `mdxComponents` — every one there, nothing unknown but a mock.
 *
 * **One component, any source**: a table or a board reads a PGN
 * (`pgn={games}`) or anything the app keeps by its address (`src="<app
 * path>"`, `lib/embedSource.ts`); an entry says which kinds of source it
 * reads, and only its `src` changes.
 *
 * A snippet is whole: the PGN's definition first where the component reads
 * one — an `import` of the Blog's file, from the Blog's root, or the PGN
 * written in (`export const`) — then the component's markup. A one-game
 * board's sample is its file's PGN written in, as an article holds one.
 */

/** What a component reads its games from: a PGN, or what an app address names. */
export type SourceKind = "pgn" | AddressKind;

/** A source chosen in the gallery: a PGN beside the Blog's articles (its path under `articles/`), a PGN pasted in, or an app address. */
export type GallerySource = { kind: "file"; file: string } | { kind: "pasted"; text: string } | { kind: "address"; address: SourceAddress };

/** What a component's markup is written for: its PGN, by the name the snippet gives it, or an address. */
type Target = { kind: "pgn"; name: string } | { kind: "address"; address: SourceAddress };

export type GalleryEntry = {
  /** Unique across the gallery — a tree row's id. */
  id: string;
  /** The component, as an article names it. */
  component: string;
  /** What it shows, in a word or two — the tree's row. */
  label: string;
  /** What it draws, in a line. */
  summary: string;
  /** What it reads its games from — none for a component that reads no game (`<NavCards>`, a repertoire's board, an image). */
  reads: readonly SourceKind[];
  /** The shipped sample it opens on: a PGN beside the Blog's articles — its text written in where `inline` is (the file's, imported with `?raw`) — or an app address. */
  sample?: { file: string; inline?: string } | { address: string };
  /** A tournament table's kinds of tournament — a source whose games look like another is told so. */
  tournament?: readonly TournamentKind[];
  /** The PGN's name in the snippet — `games`, else. */
  pgnName?: string;
  /** The component's markup for its source — `guess`, the kind of tournament the games look like. */
  markup: (target: Target | undefined, guess?: TournamentKind) => string;
  /** Not built yet: a sketch of how it would look, and its code — never rendered. */
  mock?: { sketch: string };
  /** An image: its source is an image, not a game (`imageSnippetOf`). */
  image?: true;
};

export type GalleryFolder = { id: string; title: string; entries: readonly GalleryEntry[] };

/** The image `<ArticleImage>` opens on — beside the Blog's articles — and what it shows. */
export const SAMPLE_IMAGE = { file: "writing-an-article/sample-image.png", alt: "A chessboard after 1. e4 e5 2. Nf3 Nc6 3. Bb5, beside the words Analysis Board" } as const;

/** Each kind of tournament, for a sentence. */
export const KIND_WORDS: Readonly<Record<TournamentKind, string>> = {
  match: "a match",
  doubleElimination: "a double elimination",
  knockout: "a knockout",
  teamKnockout: "a team knockout",
  roundRobin: "a round robin",
  swiss: "a Swiss",
  teamSwiss: "a team Swiss",
  arena: "an arena",
};

/** Each kind of source, for a sentence — and its address's shape. */
export const SOURCE_WORDS: Readonly<Record<SourceKind, string>> = {
  pgn: "a PGN",
  collection: "a whole Library collection, /library/<collection>",
  libraryGame: "one Library game, /library/<collection>/<n>",
  analysis: "a saved analysis, /tools/analysis?analysis=<id>",
  playedGame: "a game played against the engine, /engine/play?saved=<id>",
  repertoire: "a repertoire, /repertoires/<id>",
};

/** The one-game boards' sample: the Blog's game, written in. */
const INLINE_GAME = { file: "writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn", inline: rubinsteinCapablanca } as const;

/** What every board that shows one stored game reads. */
const ONE_GAME: readonly SourceKind[] = ["libraryGame", "analysis", "playedGame"];
/** What every tournament table reads. */
const TABLE: readonly SourceKind[] = ["pgn", "collection"];

/** The source as a prop: `pgn={<name>}` for a PGN, `src="<path>"` for an address. */
const sourceProp = (target: Target | undefined, fallback = "games"): string =>
  target?.kind === "address" ? `src="${sourcePathOf(target.address)}"` : `pgn={${target?.kind === "pgn" ? target.name : fallback}}`;
const pgnOf = (target: Target | undefined) => (target?.kind === "pgn" ? target.name : "games");
/** A Library address's collection and game — a placeholder where the source is none. */
const libraryOf = (target: Target | undefined): { collection: string; number?: number } =>
  target?.kind === "address" && (target.address.kind === "collection" || target.address.kind === "libraryGame")
    ? { collection: target.address.collection, number: target.address.kind === "libraryGame" ? target.address.number : undefined }
    : { collection: "REPLACE-WITH-A-COLLECTION" };

/** A tournament table's markup over its source. */
const table = (component: string, extra = "") => (target: Target | undefined) => `<${component} ${sourceProp(target)}${extra} />`;

export const GALLERY: readonly GalleryFolder[] = [
  {
    id: "boards",
    title: "Boards",
    entries: [
      {
        id: "inline-pgn-game",
        component: "InlinePgnGame",
        label: "Flat PGN game",
        summary: "A window of a game on a board, its moves beside it, side lines nested — from a PGN, the Library, an analysis, a played game or a repertoire's tree",
        reads: ["pgn", "libraryGame", "collection", "analysis", "playedGame", "repertoire"],
        sample: INLINE_GAME,
        pgnName: "game",
        markup: (target) =>
          target?.kind === "address" && target.address.kind === "collection" ? `<InlinePgnGame ${sourceProp(target)} game="1" />` : `<InlinePgnGame ${sourceProp(target, "game")} />`,
      },
      {
        id: "inline-pgn-game-2col-h",
        component: "InlinePgnGame2colH",
        label: "2 columns horizontal",
        summary:
          "<InlinePgnGame> with its moves as the Analysis Board lists them — numbered pairs, side lines a row under their pair — beside the board in a box no taller than it, scrolling",
        reads: ["pgn", "libraryGame", "collection", "analysis", "playedGame", "repertoire"],
        sample: INLINE_GAME,
        pgnName: "game",
        markup: (target) =>
          target?.kind === "address" && target.address.kind === "collection"
            ? `<InlinePgnGame2colH ${sourceProp(target)} game="1" />`
            : `<InlinePgnGame2colH ${sourceProp(target, "game")} />`,
      },
      {
        id: "inline-pgn-game-2col-v",
        component: "InlinePgnGame2colV",
        label: "2 columns vertical",
        summary:
          "The same numbered pairs under the board, in a box half its height, scrolling — for boards side by side in a <BoardRow>",
        reads: ["pgn", "libraryGame", "collection", "analysis", "playedGame", "repertoire"],
        sample: INLINE_GAME,
        pgnName: "game",
        markup: (target) =>
          target?.kind === "address" && target.address.kind === "collection"
            ? `<InlinePgnGame2colV ${sourceProp(target)} game="1" />`
            : `<InlinePgnGame2colV ${sourceProp(target, "game")} />`,
      },
      {
        id: "stored-game-embed",
        component: "StoredGameEmbed",
        label: "A stored game",
        summary: "One stored game on a board, its players over it, with a link to open it — a Library game, a saved analysis, a played game",
        reads: ONE_GAME,
        sample: { address: "/library/capablanca/2" },
        markup: (target) => `<StoredGameEmbed ${sourceProp(target)} />`,
      },
    ],
  },
  {
    id: "collections",
    title: "Collections",
    entries: [
      {
        id: "collection-card",
        component: "CollectionCard",
        label: "A Library collection",
        summary: "A collection: a board on one game, a short table of its games",
        reads: ["collection", "libraryGame"],
        sample: { address: "/library/capablanca" },
        markup: (target) => {
          const { collection, number } = libraryOf(target);
          return `<CollectionCard _id="/library/${collection}"${number === undefined ? "" : ` showGame="${number}"`} />`;
        },
      },
    ],
  },
  {
    id: "repertoires",
    title: "Repertoires",
    entries: [
      {
        id: "repertoire-board",
        component: "RepertoireBoard",
        label: "A repertoire",
        summary: "A repertoire of the reader's, its branches as arrows — a shipped sample where they have none",
        reads: [],
        markup: () => `<RepertoireBoard _id="/repertoires/REPLACE-WITH-A-REPERTOIRE-ID" fallback="e4-white" />`,
      },
    ],
  },
  {
    id: "tournament-tables",
    title: "Tournament tables",
    entries: [
      {
        id: "swiss-standings",
        component: "SwissStandingsTable",
        label: "Swiss standings",
        summary: "A Swiss: a row per player, a cell per round — from a PGN, or a Library collection with its names linked",
        reads: TABLE,
        sample: { file: "tournaments/20th-werner-obermeyer-swiss-5r.pgn" },
        // An arena too (CTA-142): its players ranked by points, which is what the standings show.
        tournament: ["swiss", "arena"],
        markup: table("SwissStandingsTable", ' density="dense" rowsPerPage="25"'),
      },
      {
        id: "round-robin-cross-table",
        component: "RoundRobinCrossTable",
        label: "Round robin crosstable",
        summary: "A round robin: every player against every other, single or double",
        reads: TABLE,
        sample: { file: "tournaments/greenhillsrapid26.pgn" },
        tournament: ["roundRobin"],
        markup: table("RoundRobinCrossTable"),
      },
      {
        id: "knockout-bracket",
        component: "KnockoutBracket",
        label: "Knockout bracket",
        summary: "A knockout: each round's matches, the winners going on",
        reads: TABLE,
        sample: { file: "tournaments/chned26.pgn" },
        tournament: ["knockout"],
        markup: table("KnockoutBracket"),
      },
      {
        id: "team-knockout-bracket",
        component: "KnockoutBracket",
        label: "Team knockout",
        summary: "A knockout of teams: each match in legs",
        reads: TABLE,
        sample: { file: "tournaments/fidewrbtf26.pgn" },
        tournament: ["teamKnockout"],
        markup: table("KnockoutBracket", ' density="dense"'),
      },
      {
        id: "double-elimination-bracket",
        component: "KnockoutBracket",
        label: "Double elimination",
        summary: "A double elimination: the winners' bracket over the losers'",
        reads: TABLE,
        sample: { file: "tournaments/esportswcuppl26.pgn" },
        tournament: ["doubleElimination"],
        markup: table("KnockoutBracket", ' losersFromRound="51"'),
      },
      {
        id: "match-table",
        component: "MatchTable",
        label: "Match",
        summary: "A match: two players, a column per game, the score",
        reads: TABLE,
        sample: { file: "tournaments/clutchlegends26.pgn" },
        tournament: ["match"],
        markup: table("MatchTable"),
      },
      {
        id: "team-standings",
        component: "TeamStandingsTable",
        label: "Team standings",
        summary: "A team Swiss: board points per round, match points",
        reads: TABLE,
        sample: { file: "tournaments/fidewrt26.pgn" },
        tournament: ["teamSwiss"],
        markup: table("TeamStandingsTable", ' density="dense" rowsPerPage="25"'),
      },
    ],
  },
  {
    id: "images",
    title: "Images",
    entries: [
      {
        id: "article-image",
        component: "ArticleImage",
        label: "An image",
        summary: "An image beside the article — its width, height, place, fit, corners, border, shadow and a full-size link",
        reads: [],
        image: true,
        markup: () => `<ArticleImage src={photo} alt="…" />`,
      },
    ],
  },
  {
    id: "other",
    title: "Other",
    entries: [
      {
        id: "nav-cards",
        component: "NavCards",
        label: "The app's screens",
        summary: "Every screen as a card, by section",
        reads: [],
        markup: () => "<NavCards />",
      },
      {
        id: "board-row",
        component: "BoardRow",
        label: "Boards side by side",
        summary: "A row of the boards inside it, side by side from a small screen up",
        reads: ["pgn", "collection", "libraryGame"],
        sample: { address: "/library/capablanca" },
        pgnName: "game",
        markup: (target) => {
          if (target?.kind !== "address") return `<BoardRow>\n${[1, 2].map((game) => `  <InlinePgnGame pgn={${pgnOf(target)}} game="${game}" />`).join("\n")}\n</BoardRow>`;
          const { collection, number = 1 } = libraryOf(target);
          return `<BoardRow>\n${[0, 1].map((step) => `  <StoredGameEmbed src="/library/${collection}/${number + step}" />`).join("\n")}\n</BoardRow>`;
        },
      },
    ],
  },
  {
    id: "future",
    title: "Future components",
    entries: [
      {
        id: "player-games",
        component: "PlayerGames",
        label: "A player's games",
        summary: "One player's games out of a PGN, as a table and a board",
        reads: ["pgn"],
        sample: { file: "tournaments/clutchlegends26.pgn" },
        mock: { sketch: "A table of the player's games out of the PGN — each opponent, colour and result — and a board on the one picked." },
        markup: (target) => `<PlayerGames pgn={${pgnOf(target)}} player="Kasparov, Garry" />`,
      },
      {
        id: "puzzle-board",
        component: "PuzzleBoard",
        label: "A puzzle",
        summary: "A position whose next moves stay hidden until the reader plays them",
        reads: ["pgn"],
        sample: { file: "writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn" },
        pgnName: "game",
        mock: { sketch: "A board at the PGN's position, the moves after it hidden — each shown once the reader plays it on the board." },
        markup: (target) => `<PuzzleBoard pgn={${pgnOf(target)}} hideNextMoves />`,
      },
    ],
  },
];

/** Every entry, in the tree's order. */
export const galleryEntries = (): GalleryEntry[] => GALLERY.flatMap((folder) => folder.entries);

/** What a source gives a component. */
export const sourceKindOf = (source: GallerySource): SourceKind => (source.kind === "address" ? source.address.kind : "pgn");

/** An entry's shipped sample, as a source — `undefined` for one that reads no game. */
export const sampleOf = (entry: GalleryEntry): GallerySource | undefined => {
  if (entry.sample === undefined) return undefined;
  if ("file" in entry.sample) return entry.sample.inline === undefined ? { kind: "file", file: entry.sample.file } : { kind: "pasted", text: entry.sample.inline };
  const address = sourceAddressOf(entry.sample.address);
  return address === undefined ? undefined : { kind: "address", address };
};

/** Why a source does not fit an entry — `undefined` where it does. */
export const misfitOf = (entry: GalleryEntry, source: GallerySource): string | undefined => {
  const kind = sourceKindOf(source);
  if (entry.reads.includes(kind)) return undefined;
  const given = SOURCE_WORDS[kind].replace(/, \/.*$/, "");
  return `<${entry.component}> does not read ${given}: it reads ${entry.reads.map((read) => SOURCE_WORDS[read]).join(" or ")}.`;
};

/** The entry that shows a kind of tournament from a kind of source — what a misfit's games want instead. */
export const entryForKind = (kind: TournamentKind, reads: SourceKind): GalleryEntry | undefined =>
  galleryEntries().find((candidate) => candidate.tournament?.includes(kind) === true && candidate.reads.includes(reads));

/** Where a tournament table's games look like another kind of tournament: what they look like, and the table that shows that — `undefined` where they fit, or nothing can be said. */
export const tournamentMisfitOf = (entry: GalleryEntry, source: GallerySource, guess: TournamentGuess | undefined): string | undefined => {
  if (entry.tournament === undefined || guess === undefined || entry.tournament.includes(guess.kind)) return undefined;
  const better = entryForKind(guess.kind, sourceKindOf(source));
  return `The games look like ${KIND_WORDS[guess.kind]} — ${guess.reason}. <${entry.component}> may not show them as they are${better === undefined ? "." : `: try ${better.label}, <${better.component}>.`}`;
};

/**
 * The snippet an entry is shown with, for its source: the PGN's definition
 * first — an `import` of the Blog's file, from the Blog's root, or the PGN
 * written in — then the component's markup; an address is its `src`.
 */
export const snippetOf = (entry: GalleryEntry, source: GallerySource | undefined, guess?: TournamentKind): string => {
  const name = entry.pgnName ?? "games";
  if (source === undefined) return entry.markup(undefined, guess);
  if (source.kind === "address") return entry.markup({ kind: "address", address: source.address }, guess);
  const markup = entry.markup({ kind: "pgn", name }, guess);
  return source.kind === "file" ? withPgnImports(markup, [{ file: source.file, name }]).body : withInlinePgn(markup, name, source.text);
};

/** `<ArticleImage>`'s snippet: the image imported by its path — from the Blog's root for a Blog's image — then the element. */
export const imageSnippetOf = (path: string, alt = "…"): string => `import photo from "./${path}"\n\n<ArticleImage src={photo} alt="${alt}" />`;

/** A built-in example an entry can read: its id (a select's value), its words, and the source. */
export type BuiltInExample = { id: string; label: string; source: GallerySource };

/**
 * The built-in examples an entry can be switched to — the ones that fit
 * it: its own sample first, then each PGN beside the Blog's articles (for
 * a component that reads a PGN) and each shipped Library collection (as a
 * collection, or its first game for one that reads a single game).
 */
export const builtInsOf = (entry: GalleryEntry, pgnFiles: readonly string[], collections: readonly { id: string; name: string }[]): BuiltInExample[] => {
  const sample = sampleOf(entry);
  const examples: BuiltInExample[] = [];
  const add = (example: BuiltInExample) => {
    if (!examples.some((candidate) => candidate.id === example.id)) examples.push(example);
  };
  const nameOf = (collection: string) => collections.find((candidate) => candidate.id === collection)?.name ?? collection;
  const addressExample = (address: SourceAddress): BuiltInExample => {
    const path = sourcePathOf(address);
    const label = address.kind === "libraryGame" ? `${nameOf(address.collection)}, game ${address.number} — ${path}` : address.kind === "collection" ? `${nameOf(address.collection)} — ${path}` : path;
    return { id: path, label, source: { kind: "address", address } };
  };
  if (sample?.kind === "file") add({ id: sample.file, label: `${sample.file} (the default)`, source: sample });
  // A file's PGN written in: an id of its own, so the same file imported stays one of the others.
  if (sample?.kind === "pasted" && entry.sample !== undefined && "file" in entry.sample) add({ id: `inline:${entry.sample.file}`, label: `${entry.sample.file}, written in (the default)`, source: sample });
  if (sample?.kind === "address") {
    const example = addressExample(sample.address);
    add({ ...example, label: `${example.label} (the default)` });
  }
  if (entry.reads.includes("pgn")) for (const file of pgnFiles) add({ id: file, label: file, source: { kind: "file", file } });
  if (entry.reads.includes("collection")) for (const { id } of collections) add(addressExample({ kind: "collection", collection: id }));
  else if (entry.reads.includes("libraryGame")) for (const { id } of collections) add(addressExample({ kind: "libraryGame", collection: id, number: 1 }));
  return examples;
};

/** **A heavy PGN** — more games than this, or over `BIG_PGN_BYTES`: asked about before it goes anywhere (saved to disk, saved as a collection, or pasted anyway). */
export const HEAVY_GAMES = 100;

/**
 * Where a heavy PGN saved as a Library collection is shown — one
 * component, any source: the entry itself, where it reads a collection or
 * a Library game; `undefined` where it reads neither (a mock).
 */
export const libraryEntryFor = (entry: GalleryEntry): GalleryEntry | undefined =>
  entry.reads.includes("collection") || entry.reads.includes("libraryGame") ? entry : undefined;

/** A saved collection as the source an entry reads: the collection, or its first game for an entry that shows one game. */
export const collectionSourceFor = (entry: GalleryEntry, collection: string): GallerySource => ({
  kind: "address",
  address: entry.reads.includes("collection") ? { kind: "collection", collection } : { kind: "libraryGame", collection, number: 1 },
});
