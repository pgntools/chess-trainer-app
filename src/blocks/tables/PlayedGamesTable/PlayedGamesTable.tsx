import { useMemo, type ReactNode } from "react";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import { sortedPlayedGames, type PlayedGameColumn, type PlayedGameRow } from "../../../lib/playedGames";
import { playedGamesFirstDirection } from "./playedGamesSort";
import { whenPlayed } from "./whenPlayed";

export type PlayedGamesTableProps = {
  /** The games the filters leave, every page of them — their names already in the reader's words. */
  rows: readonly PlayedGameRow[];
  /** The sort shown — `useTableUrlState`'s, in the Lobby. The table orders the rows by it (`sortedPlayedGames`). */
  sort: DataTableSort<PlayedGameColumn>;
  onSort: (column: PlayedGameColumn) => void;
  /** The page and its size; the pager's words are the table's own. */
  paging: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** The ticked rows' ids — the screen's, for its Delete picked. */
  picked: ReadonlySet<string>;
  onPickedChange: (picked: Set<string>) => void;
  /** Where a readable game opens on the Analysis Board. */
  analysisLink: (row: PlayedGameRow) => LinkTarget;
  /** Where a game still on is continued — asked only of a readable row whose result is `*`. */
  continueLink: (row: PlayedGameRow) => LinkTarget;
  /** The store's first read has not landed. */
  loading?: boolean;
  /** A filter is on: no rows is "no match" rather than "no games yet". */
  filtered?: boolean;
  /** Above the table — the Lobby's `PlayedGamesFilters`. */
  filters?: ReactNode;
  /**
   * The table's root, and every id under it: `-row-<id>`, `-pick-<id>`,
   * `-analysis-<id>`, `-continue-<id>`, `-masked-<id>`, `-note-<id>`,
   * `-select-all`, `-sort-<column>`, `-loading`, `-empty`, `-no-match`,
   * `-frame-table`, `-pager`.
   */
  testId: string;
};

/**
 * **The Lobby's games** (CTA-109; the table of CTA-100) — the played games of
 * Play with Engine and Masked Pieces as a `DataTable`: White, Elo, Black, Elo,
 * Result, Opening, Moves (the side lines under the count), Masked, Date, a
 * pick per row with select-all in the header, and the two row actions —
 * **Analysis** on every readable game, **Continue** only while it is on
 * (its result `*`) — always visible, each named by its row. A record whose
 * PGN will not parse keeps its row, which says so across the columns and can
 * only be picked.
 *
 * Presentational: the rows (their names localized by the screen, the opening
 * the book named), the sort, the page, the picks and the links are props; the
 * order is `lib/playedGames.ts`'s own `sortedPlayedGames` — missing values
 * last, ties by the date in the same direction. Its words are the Lobby's
 * catalog keys (`playedGames.*`), since the Lobby alone shows it.
 */
function PlayedGamesTable({
  rows,
  sort,
  onSort,
  paging,
  picked,
  onPickedChange,
  analysisLink,
  continueLink,
  loading = false,
  filtered = false,
  filters,
  testId,
}: PlayedGamesTableProps) {
  const { t } = useTranslation();

  const ordered = useMemo(() => sortedPlayedGames(rows, sort.column, sort.direction), [rows, sort.column, sort.direction]);

  /** What a row is called — its pick's and its actions' names: the pairing and when, to the minute. */
  const titleOf = (row: PlayedGameRow) => {
    const date = whenPlayed(row.savedAt);
    return row.readable
      ? t("playedGames.rowTitle", { white: row.white, black: row.black, date })
      : t("playedGames.unreadableTitle", { date });
  };

  const columns = useMemo<DataTableColumn<PlayedGameRow, PlayedGameColumn>[]>(() => {
    const elo = (value: number | undefined) =>
      value === undefined ? (
        <Typography component="span" variant="inherit" color="text.secondary">
          {t("playedGames.table.unknown")}
        </Typography>
      ) : (
        <bdi dir="ltr">{value}</bdi>
      );
    const column = (id: PlayedGameColumn) => ({
      id,
      header: t(`playedGames.table.columns.${id}`),
      sortable: true,
      firstDirection: playedGamesFirstDirection(id),
    });
    return [
      { ...column("white"), dir: "auto", render: (row) => row.white },
      { ...column("whiteElo"), align: "end", render: (row) => elo(row.whiteElo) },
      { ...column("black"), dir: "auto", render: (row) => row.black },
      { ...column("blackElo"), align: "end", render: (row) => elo(row.blackElo) },
      // PGN's own notation — 1-0, 0-1, 1/2-1/2, * while it is on.
      { ...column("result"), dir: "ltr", render: (row) => row.result },
      { ...column("opening"), dir: "auto", wrap: true, render: (row) => row.opening ?? "" },
      {
        ...column("moves"),
        align: "end",
        render: (row) => (
          <>
            <bdi dir="ltr">{row.moves}</bdi>
            {row.variations > 0 && (
              <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
                {t("playedGames.variations", { count: row.variations })}
              </Typography>
            )}
          </>
        ),
      },
      {
        ...column("masked"),
        render: (row) =>
          row.masked && (
            <Chip
              size="small"
              variant="outlined"
              icon={<VisibilityOffRoundedIcon />}
              label={t("masking.marker")}
              data-testid={`${testId}-masked-${row.id}`}
              sx={{ height: 20 }}
            />
          ),
      },
      {
        ...column("date"),
        dir: "ltr",
        render: (row) => {
          const shown = tableDate(row.savedAt);
          return shown === undefined ? "–" : <time dateTime={shown.dateTime}>{shown.text}</time>;
        },
      },
    ];
  }, [t, testId]);

  return (
    <DataTable<PlayedGameRow, PlayedGameColumn>
      columns={columns}
      rows={ordered}
      rowId={(row) => row.id}
      sorted
      sort={sort}
      onSort={onSort}
      paging={{ ...paging, labelRowsPerPage: t("playedGames.table.rowsPerPage") }}
      picks={{
        picked,
        onChange: onPickedChange,
        selectAllLabel: t("playedGames.selectAll"),
        pickLabel: (row) => t("playedGames.pick", { title: titleOf(row) }),
      }}
      rowActions={(row) =>
        row.readable && (
          <>
            <IconAction
              label={t("playedGames.analyseRow", { title: titleOf(row) })}
              link={analysisLink(row)}
              testId={`${testId}-analysis-${row.id}`}
            >
              <ScienceOutlinedIcon fontSize="small" />
            </IconAction>
            {/* Continue only while the game is on (CTA-90): any result but `*` has ended it. */}
            {row.result === "*" && (
              <IconAction
                label={t("playedGames.continueRow", { title: titleOf(row) })}
                link={continueLink(row)}
                testId={`${testId}-continue-${row.id}`}
              >
                <PlayArrowRoundedIcon fontSize="small" />
              </IconAction>
            )}
          </>
        )
      }
      actionsLabel={t("playedGames.table.actions")}
      rowNote={(row) => (row.readable ? undefined : t("playedGames.unreadable"))}
      loading={loading}
      loadingLabel={t("playedGames.loading")}
      emptyLabel={t("playedGames.empty")}
      noMatchLabel={t("playedGames.noMatch")}
      filtered={filtered}
      filters={filters}
      ariaLabel={t("playedGames.table.label")}
      hint={t("hints.table.sortAndPick")}
      testId={testId}
    />
  );
}

export default PlayedGamesTable;
