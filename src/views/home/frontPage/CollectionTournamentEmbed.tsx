import { useCallback, useMemo } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

import { MatchTable, RoundRobinCrossTable, SwissStandingsTable } from "../../../blocks/tables";
import type { LinkTarget } from "../../../design-system/components/link";
import { InlineAlert } from "../../../design-system/components/feedback";
import { gameTag, type GameHeaders } from "../../../lib/gameModel";
import { isTournamentCollection, type CollectionSummary } from "../../../lib/libraryCollections";
import { matchOf } from "../../../lib/match";
import { readPgnTags } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import { ROUND_ROBIN_TIE_BREAKS, SWISS_TIE_BREAKS, tournamentOf, type TournamentPlayer } from "../../../lib/tournament";
import { useCollectionGames } from "../../library/useLibraryCollections";
import { useEmbedPaging } from "./pgnTournament";
import { collectionPathOf } from "./paths";

/**
 * **A tournament from the Library** (CTA-128) —
 * `<CollectionTournamentTable _id="/library/<collection>" />`: a collection
 * the reader added (or a shipped one) drawn as its tournament's table, read
 * from its games' own tags as every tournament embed reads a PGN.
 *
 * - **The format** — `format` (`"swiss"`, `"roundRobin"`, `"match"`), else
 *   the collection's own tournament mark (its settings, CTA-121) where the
 *   games still share one event, else a Swiss. A Swiss is its standings, a
 *   round robin its crosstable, a match its table.
 * - **`playerLink`** (default on) makes each player's name a link to the
 *   collection's table filtered by that name (`?player=`); **`gameLink`**
 *   (default on) makes each result a link to its game on the Library's board
 *   (`/library/<collection>/<n>`), whose back button returns to the article.
 *   `playerLink={false}`, `gameLink={false}` leave them text.
 * - `density` and `rowsPerPage` as the other tables'.
 *
 * **Whose data it is**: an uploaded collection is on its own device only, so
 * an article naming one says "not here" everywhere else — the demo reads the
 * shipped Candidates 2026 (`/library/candidates2026`). Its ids are
 * `tournament-collection-<collection>-<format>` (`-loading` while its games
 * are read), so one collection can show once per format on a page.
 */

type TableFormat = "swiss" | "roundRobin" | "match";
const TABLE_FORMATS: readonly string[] = ["swiss", "roundRobin", "match"];

type CollectionTournamentEmbedProps = {
  /** The collection's address: `/library/<collection>`. */
  _id: string;
  /** Which table. Absent, the collection's own mark, else a Swiss. */
  format?: TableFormat;
  /** Each name a link to the collection's games of that player. Default on. */
  playerLink?: boolean;
  /** Each result a link to its game on the Library's board. Default on. */
  gameLink?: boolean;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Page the rows — 25, 50, 100 or 250. Absent, every row shows. */
  rowsPerPage?: number | string;
};

/** The table a collection is drawn as: the one asked for, else its own live mark, else a Swiss. */
const formatOf = (asked: string | undefined, summary: CollectionSummary, headers: readonly GameHeaders[]): TableFormat => {
  if (asked !== undefined && TABLE_FORMATS.includes(asked)) return asked as TableFormat;
  const marked = summary.tournament?.type;
  const live = isTournamentCollection(summary, headers.map((game) => ({ event: gameTag(game, "Event") })));
  return live && marked !== undefined && TABLE_FORMATS.includes(marked) ? (marked as TableFormat) : "swiss";
};

export function CollectionTournamentEmbed({ _id, format, playerLink = true, gameLink = true, density, rowsPerPage }: CollectionTournamentEmbedProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const paging = useEmbedPaging(rowsPerPage);
  const collectionId = collectionPathOf(_id);
  const state = useCollectionGames(collectionId);
  const testId = `tournament-collection-${slugify(collectionId ?? "") || "collection"}`;

  const games = state.status === "ready" ? state.value : undefined;
  const headers = useMemo(() => games?.map(readPgnTags), [games]);

  // The links: to the collection's table filtered by a player, to a game on its board (back to here).
  const from = `${location.pathname}${location.search}`;
  const toPlayer = useCallback(
    (player: TournamentPlayer): LinkTarget => ({ component: RouterLink, to: `/library/${collectionId}?player=${encodeURIComponent(player.name)}` }),
    [collectionId],
  );
  const toGame = useCallback(
    (game: number): LinkTarget => ({ component: RouterLink, to: `/library/${collectionId}/${game + 1}`, state: { from } }),
    [collectionId, from],
  );
  const links = { playerLink: playerLink ? toPlayer : undefined, gameLink: gameLink ? toGame : undefined };

  const drawn = useMemo(() => {
    if (state.status !== "ready" || headers === undefined) return undefined;
    const kind = formatOf(format, state.summary, headers);
    const event = headers.map((game) => gameTag(game, "Event")).find((name) => name !== undefined) ?? state.summary.name;
    if (kind === "match") return { kind, event, match: matchOf(headers) };
    return { kind, event, tournament: tournamentOf(headers, kind === "roundRobin" ? ROUND_ROBIN_TIE_BREAKS : SWISS_TIE_BREAKS) };
  }, [state, headers, format]);

  if (collectionId === undefined || state.status === "missing") {
    return (
      <InlineAlert severity="info" testId={`${testId}-missing`} detail={_id}>
        {t("tournament.embed.collectionMissing")}
      </InlineAlert>
    );
  }
  const name = (key: "standings" | "crosstable" | "match") =>
    t(`tournament.embed.${key}`, { event: drawn?.event ?? t("tournament.embed.untitled") });
  const common = { density, paging, testId: `${testId}-${drawn?.kind ?? "loading"}`, ...links };

  if (drawn === undefined) return <SwissStandingsTable tournament={undefined} ariaLabel={name("standings")} {...common} />;
  if (drawn.kind === "match") {
    if (drawn.match === undefined) {
      return (
        <InlineAlert severity="warning" testId={`${testId}-unreadable`} detail={_id}>
          {t("tournament.embed.notAMatch")}
        </InlineAlert>
      );
    }
    return <MatchTable match={drawn.match} ariaLabel={name("match")} {...common} />;
  }
  return drawn.kind === "roundRobin" ? (
    <RoundRobinCrossTable tournament={drawn.tournament} ariaLabel={name("crosstable")} {...common} />
  ) : (
    <SwissStandingsTable tournament={drawn.tournament} ariaLabel={name("standings")} {...common} />
  );
}
