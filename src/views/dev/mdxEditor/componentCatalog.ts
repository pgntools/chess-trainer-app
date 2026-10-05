/**
 * **The components an article embeds, as examples to drop in** (CTA-137) —
 * the MDX editor's Add PGN dialog, its Output element step. Every name is
 * one of `views/home/frontPage/index.ts`'s `mdxComponents` (the test holds
 * them to it), and each example is written for the game step 1 chose:
 *
 * - **a PGN** of the article's own (uploaded or pasted) — the components
 *   that read one, `pgn={<its name>}`;
 * - **a game in the Library** (`/library/<collection>/<n>`) — the
 *   components that show that game, and those that show its collection.
 */

/** A Library game, by its address's parts. */
export type LibraryGame = { collection: string; number: number };

export type PgnExample = {
  takes: "pgn";
  /** The component's name in the document — `SwissStandingsTable`. */
  name: string;
  /** What it draws, in a line. */
  summary: string;
  /** The markup, reading the PGN by its name. */
  code: (pgn: string) => string;
};

export type LibraryExample = {
  takes: "library";
  name: string;
  summary: string;
  /** Whether it shows the game itself, or the collection it is in. */
  shows: "game" | "collection";
  /** The markup, naming the game (or its collection). */
  code: (game: LibraryGame) => string;
};

export type ComponentExample = PgnExample | LibraryExample;

export const PGN_EXAMPLES: readonly PgnExample[] = [
  {
    takes: "pgn",
    name: "InlinePgnGame",
    summary: "A window of the game's moves on a board, side lines and all",
    code: (pgn) => `<InlinePgnGame pgn={${pgn}} from="1" to="20" start="10" caption="…" />`,
  },
  {
    takes: "pgn",
    name: "SwissStandingsTable",
    summary: "A Swiss's standings: a row per player, a cell per round",
    code: (pgn) => `<SwissStandingsTable pgn={${pgn}} density="dense" rowsPerPage="25" />`,
  },
  { takes: "pgn", name: "RoundRobinCrossTable", summary: "A round robin's crosstable, single or double", code: (pgn) => `<RoundRobinCrossTable pgn={${pgn}} />` },
  {
    takes: "pgn",
    name: "KnockoutBracket",
    summary: "A knockout's bracket — a double elimination's with losersFromRound",
    code: (pgn) => `<KnockoutBracket pgn={${pgn}} />`,
  },
  { takes: "pgn", name: "MatchTable", summary: "A match between two players: a column per game, the score", code: (pgn) => `<MatchTable pgn={${pgn}} />` },
  {
    takes: "pgn",
    name: "TeamStandingsTable",
    summary: "A team event's standings: board points per round, match points",
    code: (pgn) => `<TeamStandingsTable pgn={${pgn}} density="dense" rowsPerPage="25" />`,
  },
];

export const LIBRARY_EXAMPLES: readonly LibraryExample[] = [
  {
    takes: "library",
    name: "CollectionGameBoard",
    summary: "The game on a board, with a link to open it",
    shows: "game",
    code: ({ collection, number }) => `<CollectionGameBoard game="/library/${collection}/${number}" startMove="1" />`,
  },
  {
    takes: "library",
    name: "StoredGameEmbed",
    summary: "The game on a board, by its stored-game reference",
    shows: "game",
    code: ({ collection, number }) => `<StoredGameEmbed reference="library/${collection}/${number}" startMove="1" />`,
  },
  {
    takes: "library",
    name: "CollectionCard",
    summary: "The collection: a board on this game, a short table of its games",
    shows: "collection",
    code: ({ collection, number }) => `<CollectionCard _id="/library/${collection}" showGame="${number}" />`,
  },
  {
    takes: "library",
    name: "CollectionTournamentTable",
    summary: "The collection's tournament table, names and results linked",
    shows: "collection",
    code: ({ collection }) => `<CollectionTournamentTable _id="/library/${collection}" />`,
  },
  {
    takes: "library",
    name: "CollectionKnockoutBracket",
    summary: "The collection's knockout bracket",
    shows: "collection",
    code: ({ collection }) => `<CollectionKnockoutBracket _id="/library/${collection}" />`,
  },
  {
    takes: "library",
    name: "CollectionDoubleEliminationBracket",
    summary: "The collection's double elimination: winners' over losers' bracket",
    shows: "collection",
    code: ({ collection }) => `<CollectionDoubleEliminationBracket _id="/library/${collection}" />`,
  },
  {
    takes: "library",
    name: "CollectionTeamStandingsTable",
    summary: "The collection's team standings",
    shows: "collection",
    code: ({ collection }) => `<CollectionTeamStandingsTable _id="/library/${collection}" />`,
  },
];

export const COMPONENT_EXAMPLES: readonly ComponentExample[] = [...PGN_EXAMPLES, ...LIBRARY_EXAMPLES];

/**
 * `code` put into the body as a block of its own, where `at` (a caret's
 * offset) is: after the line it is on, a blank line either side.
 */
export const insertBlock = (body: string, at: number, code: string): string => {
  const caret = Math.max(0, Math.min(at, body.length));
  const lineEnd = body.indexOf("\n", caret);
  const cut = lineEnd === -1 ? body.length : lineEnd;
  const before = body.slice(0, cut).replace(/\s+$/, "");
  const after = body.slice(cut).replace(/^\s+/, "");
  return `${before === "" ? "" : `${before}\n\n`}${code}${after === "" ? "\n" : `\n\n${after}`}`;
};
