import { collectionPathOf, libraryGamePathOf } from "../../views/home/frontPage/paths";
import type { LibraryGame } from "./componentCatalog";
import { withInlinePgn, withPgnImports } from "./pgnImports";
import type { TournamentGuess, TournamentKind } from "./tournamentKind";

/**
 * **The Components gallery's index** (CTA-140) — every component an article
 * can embed (`views/home/frontPage/index.ts`'s `mdxComponents`), one entry
 * each, in folders by what it is (boards, tournament tables, images, the
 * rest, and the components not built yet), each opening on a **shipped
 * sample** that fits it: a PGN beside the Blog's articles, or a Library
 * collection or game. Unlike Components' catalog (`componentCatalog.ts`,
 * by what the game is, for a game already chosen), this one is by
 * component. A new component is one entry here; the test holds the index
 * to `mdxComponents` — every one there, nothing unknown but a mock.
 *
 * A snippet is whole: the PGN's definition first where the component reads
 * one — an `import` of the Blog's file, from the Blog's root, or the PGN
 * written in (`export const`) — then the component's markup.
 */

/** What a component reads its games from: a PGN, one Library game, or a whole collection. */
export type SourceKind = "pgn" | "game" | "collection";

/** A source chosen in the gallery: a PGN beside the Blog's articles (its path under `articles/`), a PGN pasted in, or the Library. */
export type GallerySource = { kind: "file"; file: string } | { kind: "pasted"; text: string } | { kind: "library"; game: LibraryGame };

/** What a component's markup is written for: its PGN, by the name the snippet gives it, or a Library game or collection. */
type Target = { kind: "pgn"; name: string } | { kind: "library"; game: LibraryGame };

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
  /** The shipped sample it opens on: a PGN beside the Blog's articles, or a Library address. */
  sample?: { file: string } | { address: string };
  /** A tournament table's kinds of tournament — a source whose games look like another is told so. */
  tournament?: readonly TournamentKind[];
  /** The PGN's name in the snippet — `games`, else. */
  pgnName?: string;
  /** The component's markup for its source — `guess`, the kind of tournament the games look like. */
  markup: (target: Target | undefined, guess?: TournamentKind) => string;
  /** The entry that shows the same from a Library collection — where a heavy PGN saved as one is opened, for an entry that reads no collection. */
  libraryTwin?: string;
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
};

const pgnOf = (target: Target | undefined) => (target?.kind === "pgn" ? target.name : "games");
const libraryOf = (target: Target | undefined): LibraryGame => (target?.kind === "library" ? target.game : { collection: "REPLACE-WITH-A-COLLECTION" });
const collectionOf = (target: Target | undefined) => `/library/${libraryOf(target).collection}`;
/** One game's address — the collection's first game for a whole collection. */
const gameOf = (target: Target | undefined) => {
  const { collection, number = 1 } = libraryOf(target);
  return { collection, number };
};

export const GALLERY: readonly GalleryFolder[] = [
  {
    id: "boards",
    title: "Boards",
    entries: [
      {
        id: "inline-pgn-game",
        libraryTwin: "collection-game-board",
        component: "InlinePgnGame",
        label: "A PGN's game",
        summary: "A window of a PGN's game on a board, its moves beside it, side lines nested",
        reads: ["pgn"],
        sample: { file: "writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn" },
        pgnName: "game",
        markup: (target) => `<InlinePgnGame pgn={${pgnOf(target)}} />`,
      },
      {
        id: "collection-game-board",
        component: "CollectionGameBoard",
        label: "A Library game",
        summary: "One game of a Library collection on a board, with a link to open it",
        reads: ["game"],
        sample: { address: "/library/capablanca/1" },
        markup: (target) => `<CollectionGameBoard game="/library/${gameOf(target).collection}/${gameOf(target).number}" />`,
      },
      {
        id: "stored-game-embed",
        component: "StoredGameEmbed",
        label: "A stored game",
        summary: "Any stored game on a board, by its reference — here a Library game's",
        reads: ["game"],
        sample: { address: "/library/capablanca/2" },
        markup: (target) => `<StoredGameEmbed reference="library/${gameOf(target).collection}/${gameOf(target).number}" />`,
      },
      {
        id: "collection-card",
        component: "CollectionCard",
        label: "A Library collection",
        summary: "A collection: a board on one game, a short table of its games",
        reads: ["collection", "game"],
        sample: { address: "/library/capablanca" },
        markup: (target) => {
          const { number } = libraryOf(target);
          return `<CollectionCard _id="${collectionOf(target)}"${number === undefined ? "" : ` showGame="${number}"`} />`;
        },
      },
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
        libraryTwin: "collection-tournament-table",
        component: "SwissStandingsTable",
        label: "Swiss standings",
        summary: "A Swiss from its PGN: a row per player, a cell per round",
        reads: ["pgn"],
        sample: { file: "tournaments/20th-werner-obermeyer-swiss-5r.pgn" },
        tournament: ["swiss"],
        markup: (target) => `<SwissStandingsTable pgn={${pgnOf(target)}} density="dense" rowsPerPage="25" />`,
      },
      {
        id: "round-robin-cross-table",
        libraryTwin: "collection-tournament-table",
        component: "RoundRobinCrossTable",
        label: "Round robin crosstable",
        summary: "A round robin from its PGN: every player against every other, single or double",
        reads: ["pgn"],
        sample: { file: "tournaments/greenhillsrapid26.pgn" },
        tournament: ["roundRobin"],
        markup: (target) => `<RoundRobinCrossTable pgn={${pgnOf(target)}} />`,
      },
      {
        id: "knockout-bracket",
        libraryTwin: "collection-knockout-bracket",
        component: "KnockoutBracket",
        label: "Knockout bracket",
        summary: "A knockout from its PGN: each round's matches, the winners going on",
        reads: ["pgn"],
        sample: { file: "tournaments/chned26.pgn" },
        tournament: ["knockout"],
        markup: (target) => `<KnockoutBracket pgn={${pgnOf(target)}} />`,
      },
      {
        id: "team-knockout-bracket",
        libraryTwin: "collection-team-knockout-bracket",
        component: "KnockoutBracket",
        label: "Team knockout",
        summary: "A knockout of teams from its PGN: each match in legs",
        reads: ["pgn"],
        sample: { file: "tournaments/fidewrbtf26.pgn" },
        tournament: ["teamKnockout"],
        markup: (target) => `<KnockoutBracket pgn={${pgnOf(target)}} density="dense" />`,
      },
      {
        id: "double-elimination-bracket",
        libraryTwin: "collection-double-elimination-bracket",
        component: "KnockoutBracket",
        label: "Double elimination",
        summary: "A double elimination from its PGN: the winners' bracket over the losers'",
        reads: ["pgn"],
        sample: { file: "tournaments/esportswcuppl26.pgn" },
        tournament: ["doubleElimination"],
        markup: (target) => `<KnockoutBracket pgn={${pgnOf(target)}} losersFromRound="51" />`,
      },
      {
        id: "match-table",
        libraryTwin: "collection-tournament-table",
        component: "MatchTable",
        label: "Match",
        summary: "A match from its PGN: two players, a column per game, the score",
        reads: ["pgn"],
        sample: { file: "tournaments/clutchlegends26.pgn" },
        tournament: ["match"],
        markup: (target) => `<MatchTable pgn={${pgnOf(target)}} />`,
      },
      {
        id: "team-standings",
        libraryTwin: "collection-team-standings",
        component: "TeamStandingsTable",
        label: "Team standings",
        summary: "A team Swiss from its PGN: board points per round, match points",
        reads: ["pgn"],
        sample: { file: "tournaments/fidewrt26.pgn" },
        tournament: ["teamSwiss"],
        markup: (target) => `<TeamStandingsTable pgn={${pgnOf(target)}} density="dense" rowsPerPage="25" />`,
      },
      {
        id: "collection-tournament-table",
        component: "CollectionTournamentTable",
        label: "Standings — from the Library",
        summary: "A Library collection's Swiss standings, round robin crosstable or match — names and results linked into it",
        reads: ["collection"],
        sample: { address: "/library/candidates2026" },
        tournament: ["swiss", "roundRobin", "match"],
        markup: (target, guess) => {
          const format = guess === "roundRobin" || guess === "match" ? ` format="${guess}"` : "";
          return `<CollectionTournamentTable _id="${collectionOf(target)}"${format} />`;
        },
      },
      {
        id: "collection-knockout-bracket",
        component: "CollectionKnockoutBracket",
        label: "Knockout — from the Library",
        summary: "A Library collection's knockout bracket, names linked, each match's games under it",
        reads: ["collection"],
        sample: { address: "/library/netherlands2026" },
        tournament: ["knockout"],
        markup: (target) => `<CollectionKnockoutBracket _id="${collectionOf(target)}" />`,
      },
      {
        id: "collection-team-knockout-bracket",
        component: "CollectionKnockoutBracket",
        label: "Team knockout — from the Library",
        summary: "A Library collection's team knockout: each match in legs, a team linked to its players' games",
        reads: ["collection"],
        sample: { address: "/library/worldblitzteam2026" },
        tournament: ["teamKnockout"],
        markup: (target) => `<CollectionKnockoutBracket _id="${collectionOf(target)}" density="dense" />`,
      },
      {
        id: "collection-double-elimination-bracket",
        component: "CollectionDoubleEliminationBracket",
        label: "Double elimination — from the Library",
        summary: "A Library collection's winners' and losers' brackets, names and games linked",
        reads: ["collection"],
        sample: { address: "/library/esportsplayin2026" },
        tournament: ["doubleElimination"],
        markup: (target) => `<CollectionDoubleEliminationBracket _id="${collectionOf(target)}" />`,
      },
      {
        id: "collection-team-standings",
        component: "CollectionTeamStandingsTable",
        label: "Team standings — from the Library",
        summary: "A Library collection's team standings, a team linked to its players' games",
        reads: ["collection"],
        sample: { address: "/library/worldrapidteam2026" },
        tournament: ["teamSwiss"],
        markup: (target) => `<CollectionTeamStandingsTable _id="${collectionOf(target)}" rowsPerPage="25" />`,
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
        reads: ["pgn", "collection", "game"],
        sample: { address: "/library/capablanca" },
        pgnName: "game",
        markup: (target) => {
          if (target?.kind === "pgn") return `<BoardRow>\n${[1, 2].map((game) => `  <InlinePgnGame pgn={${target.name}} game="${game}" />`).join("\n")}\n</BoardRow>`;
          const { collection, number } = gameOf(target);
          return `<BoardRow>\n${[0, 1].map((step) => `  <CollectionGameBoard game="/library/${collection}/${number + step}" />`).join("\n")}\n</BoardRow>`;
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

/** What a source gives a component: a PGN, one Library game, or a whole collection. */
export const sourceKindOf = (source: GallerySource): SourceKind => (source.kind !== "library" ? "pgn" : source.game.number === undefined ? "collection" : "game");

/** A Library address → the game or collection it names — `undefined` for anything else. */
export const libraryGameOf = (address: string): LibraryGame | undefined => {
  const game = libraryGamePathOf(address);
  if (game !== undefined) return { collection: game.collectionId, number: game.number };
  const collection = collectionPathOf(address);
  return collection === undefined ? undefined : { collection };
};

/** An entry's shipped sample, as a source — `undefined` for one that reads no game. */
export const sampleOf = (entry: GalleryEntry): GallerySource | undefined => {
  if (entry.sample === undefined) return undefined;
  if ("file" in entry.sample) return { kind: "file", file: entry.sample.file };
  const game = libraryGameOf(entry.sample.address);
  return game === undefined ? undefined : { kind: "library", game };
};

/** What fits an entry, for a sentence. */
const fitWords = (entry: GalleryEntry): string =>
  entry.reads
    .map((kind) => (kind === "pgn" ? "a PGN" : kind === "game" ? "one Library game, /library/<collection>/<n>" : "a whole Library collection, /library/<collection>"))
    .join(" or ");

/** Why a source does not fit an entry — `undefined` where it does. */
export const misfitOf = (entry: GalleryEntry, source: GallerySource): string | undefined => {
  const kind = sourceKindOf(source);
  if (entry.reads.includes(kind)) return undefined;
  const given = kind === "pgn" ? "a PGN" : kind === "game" ? "one Library game" : "a whole Library collection";
  return `<${entry.component}> does not read ${given}: it reads ${fitWords(entry)}.`;
};

/** The entry that shows a kind of tournament from the same kind of source — what a misfit's games want instead. */
export const entryForKind = (kind: TournamentKind, reads: SourceKind): GalleryEntry | undefined =>
  galleryEntries().find((candidate) => candidate.tournament?.includes(kind) === true && candidate.reads.includes(reads));

/** Where a tournament table's games look like another kind of tournament: what they look like, and the table that shows that — `undefined` where they fit, or nothing can be said. */
export const tournamentMisfitOf = (entry: GalleryEntry, source: GallerySource, guess: TournamentGuess | undefined): string | undefined => {
  if (entry.tournament === undefined || guess === undefined || entry.tournament.includes(guess.kind)) return undefined;
  const better = entryForKind(guess.kind, sourceKindOf(source) === "pgn" ? "pgn" : "collection");
  return `The games look like ${KIND_WORDS[guess.kind]} — ${guess.reason}. <${entry.component}> may not show them as they are${better === undefined ? "." : `: try ${better.label}, <${better.component}>.`}`;
};

/**
 * The snippet an entry is shown with, for its source: the PGN's definition
 * first — an `import` of the Blog's file, from the Blog's root, or the PGN
 * written in — then the component's markup.
 */
export const snippetOf = (entry: GalleryEntry, source: GallerySource | undefined, guess?: TournamentKind): string => {
  const name = entry.pgnName ?? "games";
  if (source === undefined) return entry.markup(undefined, guess);
  if (source.kind === "library") return entry.markup({ kind: "library", game: source.game }, guess);
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
  const libraryExample = (game: LibraryGame, name: string): BuiltInExample => {
    const address = game.number === undefined ? `/library/${game.collection}` : `/library/${game.collection}/${game.number}`;
    return { id: address, label: game.number === undefined ? `${name} — ${address}` : `${name}, game ${game.number} — ${address}`, source: { kind: "library", game } };
  };
  const nameOf = (collection: string) => collections.find((candidate) => candidate.id === collection)?.name ?? collection;
  if (sample?.kind === "file") add({ id: sample.file, label: `${sample.file} (the default)`, source: sample });
  if (sample?.kind === "library") add({ ...libraryExample(sample.game, nameOf(sample.game.collection)), label: `${libraryExample(sample.game, nameOf(sample.game.collection)).label} (the default)` });
  if (entry.reads.includes("pgn")) for (const file of pgnFiles) add({ id: file, label: file, source: { kind: "file", file } });
  if (entry.reads.includes("collection")) for (const { id, name } of collections) add(libraryExample({ collection: id }, name));
  else if (entry.reads.includes("game")) for (const { id, name } of collections) add(libraryExample({ collection: id, number: 1 }, name));
  return examples;
};

/** **A heavy PGN** — more games than this, or over `BIG_PGN_BYTES`: asked about before it goes anywhere (saved to disk, saved as a collection, or pasted anyway). */
export const HEAVY_GAMES = 100;

/**
 * Where a heavy PGN saved as a Library collection is shown: the entry
 * itself where it reads a collection; else, for a tournament table, the
 * Library's table for the kind of tournament the games look like; else its
 * Library twin — `undefined` where nothing shows a collection of it.
 */
export const libraryEntryFor = (entry: GalleryEntry, guess: TournamentGuess | undefined): GalleryEntry | undefined => {
  if (entry.reads.includes("collection") || entry.reads.includes("game")) return entry;
  if (entry.tournament !== undefined && guess !== undefined) {
    const byKind = entryForKind(guess.kind, "collection");
    if (byKind !== undefined) return byKind;
  }
  return galleryEntries().find((candidate) => candidate.id === entry.libraryTwin);
};

/** A saved collection as the source an entry reads: the collection, or its first game for an entry that shows one game. */
export const collectionSourceFor = (entry: GalleryEntry, collection: string): GallerySource => ({
  kind: "library",
  game: entry.reads.includes("collection") ? { collection } : { collection, number: 1 },
});
