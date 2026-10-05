/**
 * **The components an article embeds, as examples to drop in** (CTA-137) —
 * the MDX editor's Add PGN dialog, its Output element tab. Every name is one
 * of `views/home/frontPage/index.ts`'s `mdxComponents` (the test holds them
 * to it), and every example is markup a shipped article uses, so inserted
 * as it is it renders: a PGN's components take the article's PGN by the
 * name it is bound to, the others the shipped Library's records.
 */

export type ComponentExample = {
  /** The component's name in the document — `SwissStandingsTable`. */
  name: string;
  /** What it draws, in a line. */
  summary: string;
  /** Whether it reads a PGN of the article's — `pgn={…}`. */
  usesPgn: boolean;
  /** The markup, the PGN's name put in. */
  code: (pgn: string) => string;
};

export const COMPONENT_EXAMPLES: readonly ComponentExample[] = [
  {
    name: "InlinePgnGame",
    summary: "A window of the game's moves on a board, side lines and all",
    usesPgn: true,
    code: (pgn) => `<InlinePgnGame pgn={${pgn}} from="1" to="20" start="10" caption="…" />`,
  },
  {
    name: "SwissStandingsTable",
    summary: "A Swiss's standings: a row per player, a cell per round",
    usesPgn: true,
    code: (pgn) => `<SwissStandingsTable pgn={${pgn}} density="dense" rowsPerPage="25" />`,
  },
  { name: "RoundRobinCrossTable", summary: "A round robin's crosstable, single or double", usesPgn: true, code: (pgn) => `<RoundRobinCrossTable pgn={${pgn}} />` },
  {
    name: "KnockoutBracket",
    summary: "A knockout's bracket — a double elimination's with losersFromRound",
    usesPgn: true,
    code: (pgn) => `<KnockoutBracket pgn={${pgn}} />`,
  },
  { name: "MatchTable", summary: "A match between two players: a column per game, the score", usesPgn: true, code: (pgn) => `<MatchTable pgn={${pgn}} />` },
  {
    name: "TeamStandingsTable",
    summary: "A team event's standings: board points per round, match points",
    usesPgn: true,
    code: (pgn) => `<TeamStandingsTable pgn={${pgn}} density="dense" rowsPerPage="25" />`,
  },
  {
    name: "CollectionGameBoard",
    summary: "A Library game on a board",
    usesPgn: false,
    code: () => `<CollectionGameBoard game="/library/fischer/891" startMove="1. c4 c5 2. Nc3" />`,
  },
  {
    name: "BoardRow",
    summary: "Boards side by side",
    usesPgn: false,
    code: () =>
      `<BoardRow>\n  <CollectionGameBoard game="/library/capablanca/2" startMove="4" />\n  <CollectionGameBoard game="/library/capablanca/3" startMove="4..." />\n</BoardRow>`,
  },
  {
    name: "CollectionCard",
    summary: "A Library collection: a board on one game, a short table of its games",
    usesPgn: false,
    code: () => `<CollectionCard _id="/library/fischer" showGame="52" />`,
  },
  {
    name: "RepertoireBoard",
    summary: "A repertoire on a board — a shipped sample where the reader has none",
    usesPgn: false,
    code: () => `<RepertoireBoard _id="/repertoires/REPLACE-WITH-A-REPERTOIRE-ID" fallback="e4-white" startMove="1" />`,
  },
  {
    name: "StoredGameEmbed",
    summary: "Any stored game, by its ?game= reference",
    usesPgn: false,
    code: () => `<StoredGameEmbed reference="library/capablanca/1" startMove="2..." />`,
  },
  {
    name: "CollectionTournamentTable",
    summary: "A Library collection's tournament table, names and results linked",
    usesPgn: false,
    code: () => `<CollectionTournamentTable _id="/library/candidates2026" format="roundRobin" />`,
  },
  {
    name: "CollectionKnockoutBracket",
    summary: "A Library collection's knockout bracket",
    usesPgn: false,
    code: () => `<CollectionKnockoutBracket _id="/library/worldblitzteam2026" density="dense" />`,
  },
  {
    name: "CollectionDoubleEliminationBracket",
    summary: "A Library collection's double elimination: winners' over losers' bracket",
    usesPgn: false,
    code: () => `<CollectionDoubleEliminationBracket _id="/library/esportsplayin2026" />`,
  },
  {
    name: "CollectionTeamStandingsTable",
    summary: "A Library collection's team standings",
    usesPgn: false,
    code: () => `<CollectionTeamStandingsTable _id="/library/worldrapidteam2026" density="dense" rowsPerPage="25" />`,
  },
  { name: "NavCards", summary: "Every screen as a card, by section", usesPgn: false, code: () => `<NavCards headingLevel={3} />` },
];

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
