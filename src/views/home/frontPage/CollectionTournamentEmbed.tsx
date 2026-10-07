import { gameTag, type GameHeaders } from "../../../lib/gameModel";
import { isTournamentCollection, type CollectionSummary } from "../../../lib/libraryCollections";
import { EmbedSource } from "./embedSource";
import { StandingsView, type StandingsFormat } from "./tournamentEmbedViews";

/**
 * **A tournament from the Library — the older name** (CTA-128; an alias
 * since CTA-140) — `<CollectionTournamentTable _id="/library/<collection>" />`:
 * today `<SwissStandingsTable>`, `<RoundRobinCrossTable>` or `<MatchTable>`
 * with `src="/library/<collection>"` draw the same, the format named by the
 * component. Kept for the articles written with it; the MDX editor writes
 * the new form.
 *
 * - **The format** — `format` (`"swiss"`, `"roundRobin"`, `"match"`), else
 *   the collection's own tournament mark (its settings, CTA-121) where the
 *   games still share one event, else a Swiss.
 * - `playerLink`, `gameLink`, `density` and `rowsPerPage` as the tables'.
 *
 * Its ids are `tournament-collection-<collection>-<format>` (`-loading`
 * while its games are read).
 */

const TABLE_FORMATS: readonly string[] = ["swiss", "roundRobin", "match"];

type CollectionTournamentEmbedProps = {
  /** The collection's address: `/library/<collection>`. */
  _id: string;
  /** Which table. Absent, the collection's own mark, else a Swiss. */
  format?: StandingsFormat;
  playerLink?: boolean;
  gameLink?: boolean;
  density?: "normal" | "dense";
  rowsPerPage?: number | string;
};

/** The table a collection is drawn as: the one asked for, else its own live mark, else a Swiss. */
const formatOf = (asked: string | undefined, summary: CollectionSummary | undefined, headers: readonly GameHeaders[] | undefined): StandingsFormat => {
  if (asked !== undefined && TABLE_FORMATS.includes(asked)) return asked as StandingsFormat;
  if (summary === undefined || headers === undefined) return "swiss";
  const marked = summary.tournament?.type;
  const live = isTournamentCollection(summary, headers.map((game) => ({ event: gameTag(game, "Event") })));
  return live && marked !== undefined && TABLE_FORMATS.includes(marked) ? (marked as StandingsFormat) : "swiss";
};

export function CollectionTournamentEmbed({ _id, format, ...table }: CollectionTournamentEmbedProps) {
  return (
    <EmbedSource src={_id}>
      {(read) => (
        <StandingsView
          read={read}
          format={formatOf(format, read.status === "ready" ? read.library?.summary : undefined, read.status === "ready" ? read.headers : undefined)}
          {...table}
        />
      )}
    </EmbedSource>
  );
}
