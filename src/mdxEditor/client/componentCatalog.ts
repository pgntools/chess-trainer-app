import type { TournamentKind } from "./tournamentKind";

/**
 * **The components an article embeds, as examples to drop in** (CTA-137) —
 * the MDX editor's Components section, its Add a component: folders by
 * what the game is (a single game, a player's, a set of games gathered by
 * no rule, a repertoire, a tournament, a position, a puzzle), each holding the components that show that.
 * Every entry writes its markup for the game step 1 chose — a PGN of the
 * article's own (`pgn={<its name>}`) or a game or a whole collection in the
 * Library (its address) — or nothing, where no component shows that from that kind of
 * game, and is left out. Every component named is one of
 * `views/home/frontPage/index.ts`'s `mdxComponents` (the test holds them to
 * it), but a `mock`'s: a sketch of a component not built yet.
 */

/** A Library collection, or one game of it — by its address's parts (`/library/<collection>` or `/library/<collection>/<n>`). */
export type LibraryGame = { collection: string; number?: number };

/** A game's first moves as one line of SAN, and where a board opens at their end. */
export type MovesLine = { line: string; start: string };

/** The game the examples are written for: a PGN the article binds, by its name, or a Library game — each with its first moves. */
export type ExampleSource = { kind: "pgn"; name: string; moves?: MovesLine } | { kind: "library"; game: LibraryGame; moves?: MovesLine };

type CatalogEntry = {
  /** Unique across the catalog — a tree row's id. */
  id: string;
  /** What it shows, in a word or two — "Swiss standings". */
  label: string;
  /** What it draws, in a line. */
  summary: string;
  /** The markup for this game — `undefined` where it shows nothing of that kind of game. */
  code: (source: ExampleSource) => string | undefined;
  /** Not built yet: shown with a sketch of its markup, never inserted. */
  mock?: boolean;
};

export type CatalogFolder = { id: string; title: string; entries: readonly CatalogEntry[] };

const pgnOf = (source: ExampleSource) => (source.kind === "pgn" ? source.name : undefined);
const libraryOf = (source: ExampleSource) => (source.kind === "library" ? source.game : undefined);
const gamePath = (collection: string, number: number) => `/library/${collection}/${number}`;
/** One Library game — `undefined` for a whole collection, which a single-game component cannot show. */
const oneGameOf = (source: ExampleSource) => {
  const game = libraryOf(source);
  return game?.number === undefined ? undefined : { collection: game.collection, number: game.number };
};
/** `showGame="<n>"` for a game, nothing for a whole collection. */
const showGameOf = (game: LibraryGame) => (game.number === undefined ? "" : ` showGame="${game.number}"`);
/** The first moves, or a short opening where the game gave none. */
const movesOf = (source: ExampleSource): MovesLine => source.moves ?? { line: "1. e4 e5 2. Nf3 Nc6", start: "2..." };

/** A component's name, from the markup it is written as — `<SwissStandingsTable …` → `SwissStandingsTable`. */
export const componentOf = (code: string): string | undefined => /^\s*<([A-Z]\w*)/.exec(code)?.[1];

export const CATALOG: readonly CatalogFolder[] = [
  {
    id: "single-game",
    title: "Single game",
    entries: [
      {
        id: "single-inline",
        label: "The game on a board",
        summary: "The PGN's game, its moves beside the board — the first game of a PGN holding several",
        code: (source) => (pgnOf(source) === undefined ? undefined : `<InlinePgnGame pgn={${pgnOf(source)}} game="1" caption="…" />`),
      },
      {
        id: "single-board",
        label: "The game on a board",
        summary: "The Library game on a board, with a link to open it",
        code: (source) => {
          const game = oneGameOf(source);
          return game === undefined ? undefined : `<CollectionGameBoard game="${gamePath(game.collection, game.number)}" startMove="1" />`;
        },
      },
      {
        id: "single-stored",
        label: "The game, by its reference",
        summary: "The Library game on a board, by its stored-game reference",
        code: (source) => {
          const game = oneGameOf(source);
          return game === undefined ? undefined : `<StoredGameEmbed reference="library/${game.collection}/${game.number}" startMove="1" />`;
        },
      },
    ],
  },
  {
    id: "player",
    title: "Specific player",
    entries: [
      {
        id: "player-collection",
        label: "The player's collection",
        summary: "A collection of the player's games: a board on one, a table of them all",
        code: (source) => {
          const game = libraryOf(source);
          return game === undefined ? undefined : `<CollectionCard _id="/library/${game.collection}"${showGameOf(game)} />`;
        },
      },
      {
        id: "player-games",
        label: "The player's games",
        summary: "Not built yet — one player's games out of the PGN, as a table and a board",
        mock: true,
        code: (source) => (pgnOf(source) === undefined ? undefined : `<PlayerGames pgn={${pgnOf(source)}} player="…" />`),
      },
    ],
  },
  {
    id: "games-set",
    title: "Games set",
    entries: [
      {
        id: "set-row",
        label: "Its games side by side",
        summary: "A row of the set's first games, each on a board of its own — any games, gathered by no rule",
        code: (source) => {
          const name = pgnOf(source);
          if (name !== undefined) return `<BoardRow>\n${[1, 2, 3].map((game) => `  <InlinePgnGame pgn={${name}} game="${game}" />`).join("\n")}\n</BoardRow>`;
          const { collection, number = 1 } = libraryOf(source) ?? { collection: "" };
          return `<BoardRow>\n${[0, 1, 2].map((step) => `  <CollectionGameBoard game="${gamePath(collection, number + step)}" />`).join("\n")}\n</BoardRow>`;
        },
      },
      {
        id: "set-collection",
        label: "The set as a collection",
        summary: "The Library collection: a board on one game, a table of the set's games",
        code: (source) => {
          const game = libraryOf(source);
          return game === undefined ? undefined : `<CollectionCard _id="/library/${game.collection}"${showGameOf(game)} />`;
        },
      },
    ],
  },
  {
    id: "repertoire",
    title: "Repertoire",
    entries: [
      {
        id: "repertoire-tree",
        label: "The tree on a board",
        summary: "The PGN's moves and every side line, nested, on a board",
        code: (source) => (pgnOf(source) === undefined ? undefined : `<InlinePgnGame pgn={${pgnOf(source)}} caption="The repertoire — its side lines nested" />`),
      },
      {
        id: "repertoire-board",
        label: "A saved repertoire",
        summary: "A repertoire of the reader's, its branches' arrows — a shipped sample where they have none",
        code: () => `<RepertoireBoard _id="/repertoires/REPLACE-WITH-A-REPERTOIRE-ID" fallback="e4-white" startMove="1" />`,
      },
    ],
  },
  {
    id: "tournament",
    title: "Tournament",
    entries: [
      {
        id: "tournament-swiss",
        label: "Swiss standings",
        summary: "A row per player, a cell per round",
        code: (source) => {
          const game = libraryOf(source);
          return game === undefined ? `<SwissStandingsTable pgn={${pgnOf(source)}} density="dense" rowsPerPage="25" />` : `<CollectionTournamentTable _id="/library/${game.collection}" />`;
        },
      },
      {
        id: "tournament-round-robin",
        label: "Round robin crosstable",
        summary: "Every player against every other, single or double",
        code: (source) => {
          const game = libraryOf(source);
          return game === undefined ? `<RoundRobinCrossTable pgn={${pgnOf(source)}} />` : `<CollectionTournamentTable _id="/library/${game.collection}" format="roundRobin" />`;
        },
      },
      {
        id: "tournament-knockout",
        label: "Knockout bracket",
        summary: "Each round's matches, the winners going on — a team knockout's in legs",
        code: (source) => {
          const game = libraryOf(source);
          return game === undefined ? `<KnockoutBracket pgn={${pgnOf(source)}} />` : `<CollectionKnockoutBracket _id="/library/${game.collection}" />`;
        },
      },
      {
        id: "tournament-double-elimination",
        label: "Double elimination",
        summary: "The winners' bracket over the losers'",
        code: (source) => {
          const game = libraryOf(source);
          return game === undefined ? `<KnockoutBracket pgn={${pgnOf(source)}} losersFromRound="51" />` : `<CollectionDoubleEliminationBracket _id="/library/${game.collection}" />`;
        },
      },
      {
        id: "tournament-match",
        label: "Match",
        summary: "Two players: a column per game, the score",
        code: (source) => {
          const game = libraryOf(source);
          return game === undefined ? `<MatchTable pgn={${pgnOf(source)}} />` : `<CollectionTournamentTable _id="/library/${game.collection}" format="match" />`;
        },
      },
      {
        id: "tournament-team",
        label: "Team standings",
        summary: "Board points per round, match points",
        code: (source) => {
          const game = libraryOf(source);
          return game === undefined ? `<TeamStandingsTable pgn={${pgnOf(source)}} density="dense" rowsPerPage="25" />` : `<CollectionTeamStandingsTable _id="/library/${game.collection}" />`;
        },
      },
    ],
  },
  {
    id: "position",
    title: "Position",
    entries: [
      {
        id: "position-moves",
        label: "A position by its moves",
        summary: "The game's first moves written out, the board opened at their end — no game behind it",
        code: (source) => {
          const { line, start } = movesOf(source);
          return `<InlinePgnGame pgn="${line}" start="${start}" caption="…" />`;
        },
      },
    ],
  },
  {
    id: "puzzle",
    title: "Puzzle",
    entries: [
      {
        id: "puzzle-board",
        label: "Puzzle board",
        summary: "Not built yet — the position, its next moves hidden until the reader plays them",
        mock: true,
        code: (source) => `<PuzzleBoard pgn="${movesOf(source).line}" hideNextMoves />`,
      },
    ],
  },
];

/** The Tournament entry that shows each kind of tournament — what Components' Add a component suggests from `guessTournamentKind`. */
export const TOURNAMENT_ENTRY: Readonly<Record<TournamentKind, string>> = {
  swiss: "tournament-swiss",
  roundRobin: "tournament-round-robin",
  knockout: "tournament-knockout",
  teamKnockout: "tournament-knockout",
  doubleElimination: "tournament-double-elimination",
  match: "tournament-match",
  teamSwiss: "tournament-team",
};

/** The catalog for one game: each folder with only the entries that show something of it. */
export const catalogFor = (source: ExampleSource): CatalogFolder[] =>
  CATALOG.map((folder) => ({ ...folder, entries: folder.entries.filter((entry) => entry.code(source) !== undefined) }));

/**
 * `code` put into the body as a block of its own, where `at` (a caret's
 * offset) is: after the line it is on, a blank line either side.
 */
export const insertBlock = (body: string, at: number, code: string): string => insertedBlock(body, at, code).body;

/** `insertBlock`, and where the code starts in what it gives — so a list can pick what was just put in (CTA-139). */
export const insertedBlock = (body: string, at: number, code: string): { body: string; start: number } => {
  const caret = Math.max(0, Math.min(at, body.length));
  const lineEnd = body.indexOf("\n", caret);
  const cut = lineEnd === -1 ? body.length : lineEnd;
  const before = body.slice(0, cut).replace(/\s+$/, "");
  const after = body.slice(cut).replace(/^\s+/, "");
  const head = before === "" ? "" : `${before}\n\n`;
  return { body: `${head}${code}${after === "" ? "\n" : `\n\n${after}`}`, start: head.length };
};
