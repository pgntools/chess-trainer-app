import type { MDXComponents } from "mdx/types";

import { ArticleImage } from "./ArticleImage";
import { BoardRow } from "./BoardRow";
import { CollectionCard } from "./CollectionCard";
import { CollectionGameBoard } from "./CollectionGameBoard";
import { CollectionDoubleEliminationEmbed, CollectionKnockoutEmbed } from "./CollectionKnockoutEmbed";
import { CollectionTeamStandingsEmbed } from "./CollectionTeamStandingsEmbed";
import { CollectionTournamentEmbed } from "./CollectionTournamentEmbed";
import { InlinePgnGame } from "./InlinePgnGame";
import { KnockoutBracketEmbed } from "./KnockoutBracketEmbed";
import { MatchTableEmbed } from "./MatchTableEmbed";
import { NavCards } from "./NavCards";
import { Anchor, CodeBlock, H1, H2, H3, InlineCode, List, ListItem, OrderedList, Paragraph, Rule } from "./Prose";
import { RepertoireBoardEmbed } from "./RepertoireBoardEmbed";
import { RoundRobinCrossTableEmbed } from "./RoundRobinCrossTableEmbed";
import { StoredGameEmbed } from "./StoredGameEmbed";
import { SwissStandingsEmbed } from "./SwissStandingsEmbed";
import { TeamStandingsEmbed } from "./TeamStandingsEmbed";

/**
 * **What every MDX article — the Blog's, and the one the front page shows —
 * is rendered with** (CTA-126): its
 * Markdown in the theme's typography (`Prose.tsx`), and the app's components
 * it may embed, by name, with no `import` (`README.md` beside this file has
 * every prop):
 *
 * | In the document | What it is |
 * | --- | --- |
 * | `<BoardRow>…</BoardRow>` | a row of the embeds below, side by side from `sm` up |
 * | `<CollectionGameBoard game="/library/<c>/<n>" startMove="17" />` | a Library game on a board |
 * | `<RepertoireBoard _id="/repertoires/<id>" startMove="1" fallback="e4-white" />` | a repertoire on a board, or a shipped sample where the reader has none |
 * | `<CollectionCard _id="/library/<c>" showGame="52" />` | a collection: a board on one game, a short table of its games |
 * | `<InlinePgnGame pgn={game} from="5" to="15..." start="11" />` | an excerpt of a PGN: a window of its moves, side lines nested, on a board — one game as often as an article likes |
 * | `<StoredGameEmbed reference="…" />` | any stored game by its `?game=` reference (`analysis/saved/<id>`, `play/games/<id>`, …) |
 * | `<SwissStandingsTable pgn={games} />` | a Swiss's standings from its games' PGN — a row per player, a cell per round (CTA-128) |
 * | `<RoundRobinCrossTable pgn={games} />` | a round robin's crosstable from its games' PGN — single or double (CTA-128) |
 * | `<KnockoutBracket pgn={games} losersFromRound="51" />` | a knockout's bracket — a double elimination's two with `losersFromRound`, a team knockout's in legs (CTA-128) |
 * | `<MatchTable pgn={games} />` | a match between two players: a column per game, the score (CTA-128) |
 * | `<CollectionTournamentTable _id="/library/<c>" playerLink gameLink />` | a Library collection's tournament table — names linked to the player's games, results to each game (CTA-128) |
 * | `<CollectionKnockoutBracket _id="/library/<c>" playerLink gameLink />` | a Library collection's knockout bracket — a team knockout too; names linked, each match's games (a team match's legs) under it (CTA-128) |
 * | `<CollectionDoubleEliminationBracket _id="/library/<c>" losersFromRound="51" />` | the same, a double elimination: the winners' bracket over the losers' (from round 51 by default) |
 * | `<CollectionTeamStandingsTable _id="/library/<c>" teamLink gameLink />` | a Library collection's team standings — a team linked to its players' games, each round's match to its first board (CTA-128) |
 * | `<TeamStandingsTable pgn={games} />` | a team tournament's standings: board points per round, match points, board points (CTA-128) |
 * | `<NavCards />` | every screen as a card, by section — the landing page before CTA-126 |
 * | `<ArticleImage src={photo} alt="…" width="60%" caption="…" />` | an image beside the article (`import photo from "./photo.png"`) — its width, height, place, fit, corners, border, shadow and a full-size link (CTA-137) |
 *
 * **One component, any source** (CTA-140): every table and `<InlinePgnGame>`
 * read their games through `embedSource.tsx` — `pgn={games}` for a PGN of
 * the article's own, or `src="<app path>"` for anything the app keeps: a
 * Library collection or one game of it, a saved analysis, a played game, a
 * repertoire (`lib/embedSource.ts`). `<SwissStandingsTable src="/library/<c>" />`
 * is what `<CollectionTournamentTable _id="/library/<c>" />` drew; the
 * `Collection…` names stay, as aliases ({@link MDX_ALIASES}), for the
 * articles written with them.
 *
 * A component the document names that is not here fails the page at render
 * (MDX's own check), so a new one is a line in this map — and a row in the
 * table above and in `README.md`.
 */
export const mdxComponents: MDXComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  p: Paragraph,
  ul: List,
  ol: OrderedList,
  li: ListItem,
  a: Anchor,
  hr: Rule,
  pre: CodeBlock,
  code: InlineCode,
  BoardRow,
  CollectionGameBoard,
  RepertoireBoard: RepertoireBoardEmbed,
  CollectionCard,
  StoredGameEmbed,
  InlinePgnGame,
  SwissStandingsTable: SwissStandingsEmbed,
  RoundRobinCrossTable: RoundRobinCrossTableEmbed,
  KnockoutBracket: KnockoutBracketEmbed,
  MatchTable: MatchTableEmbed,
  TeamStandingsTable: TeamStandingsEmbed,
  CollectionTournamentTable: CollectionTournamentEmbed,
  CollectionKnockoutBracket: CollectionKnockoutEmbed,
  CollectionDoubleEliminationBracket: CollectionDoubleEliminationEmbed,
  CollectionTeamStandingsTable: CollectionTeamStandingsEmbed,
  NavCards,
  ArticleImage,
};

/**
 * The older names that are another component with a source (CTA-140):
 * `<CollectionTournamentTable _id>` is `<SwissStandingsTable>`,
 * `<RoundRobinCrossTable>` or `<MatchTable>` with `src`; the knockout and
 * team ones `<KnockoutBracket src>` and `<TeamStandingsTable src>`;
 * `<CollectionGameBoard game>` `<StoredGameEmbed src>`. Still rendered —
 * articles name them — but the MDX editor writes the new form.
 */
export const MDX_ALIASES: ReadonlySet<string> = new Set([
  "CollectionGameBoard",
  "CollectionTournamentTable",
  "CollectionKnockoutBracket",
  "CollectionDoubleEliminationBracket",
  "CollectionTeamStandingsTable",
]);
