import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import {
  COLLECTION_COLUMNS,
  gameTitleOf,
  sortedRows,
  type CollectionColumn,
  type CollectionRow,
} from "../../../lib/libraryCollections";
import { collectionFirstDirection, isNumericColumn } from "./collectionGamesSort";

export type CollectionGamesTableProps = {
  /** The games the filters leave, every page of them. The table orders them by `sort` (`sortedRows`). */
  rows: readonly CollectionRow[];
  sort: DataTableSort<CollectionColumn>;
  /** A header was clicked: the column, and the direction it asks for (a new column opens its own way). */
  onSort: (column: CollectionColumn, direction: "asc" | "desc") => void;
  /** The page and its size; the pager's words are the table's own. */
  paging: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** The picked games, by number — may hold games the filters hide. */
  picked: ReadonlySet<number>;
  onPickedChange: (picked: Set<number>) => void;
  /** Where a game opens — the White cell's link, and a click anywhere on the row. */
  gameLink: (row: CollectionRow) => LinkTarget;
  /** The collection holds no game at all — rather than the filters leaving none. */
  collectionEmpty?: boolean;
  /** Above the table: the words box. */
  filters?: ReactNode;
  /**
   * The table's root, and every id under it: `-row-<n>`, `-link-<n>`,
   * `-unreadable-<n>`, `-sort-<column>`, `-empty`, `-frame-table`, `-pager`.
   */
  testId: string;
  /** The picks' prefix: `-select-all`, `-row-<n>` (the collection's tests' `library-picks`). */
  picksTestId: string;
};

/**
 * An opening on **one line** (CTA-138), truncated with an ellipsis at the
 * column's width — the whole string on hover, a native `title` as the
 * tournament tables' `HeadingCell` does. The flex wrapper with a `minWidth: 0`
 * child is the `CollectionsTreeTable` trick: it is what keeps a long opening
 * from growing the table sideways rather than truncating.
 */
function OpeningCell({ value }: { value: string }) {
  return (
    <Box component="span" sx={{ display: "flex", minWidth: 0 }}>
      <Box component="span" dir="auto" title={value} sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </Box>
    </Box>
  );
}

/**
 * **A collection's games** (CTA-113; the table of CTA-75) — one row per game
 * as a `DataTable`: `#`, White, Elo, Black, Elo, Result, Date, Round, Event,
 * ECO, Opening, Moves, every one a sort header; a pick per row with
 * select-all in the header over every game the filters leave, on every page;
 * the White cell the row's link, named by the whole game. A game the index
 * could not read is marked in its `#` cell. The Opening column keeps to one
 * line, the whole string on hover (CTA-138).
 *
 * Presentational: the filtered rows, the sort, the page, the picks and the
 * link are props; the order is `lib/libraryCollections.ts`'s own
 * `sortedRows` — missing values last, ties by `#`. Its words are the
 * Library's catalog keys (`library.table.*`), since the Library alone shows it.
 */
function CollectionGamesTable({
  rows,
  sort,
  onSort,
  paging,
  picked,
  onPickedChange,
  gameLink,
  collectionEmpty = false,
  filters,
  testId,
  picksTestId,
}: CollectionGamesTableProps) {
  const { t } = useTranslation();

  const ordered = useMemo(() => sortedRows(rows, sort.column, sort.direction), [rows, sort.column, sort.direction]);
  const pickedIds = useMemo(() => new Set([...picked].map(String)), [picked]);

  const columns = useMemo<DataTableColumn<CollectionRow, CollectionColumn>[]>(() => {
    const text = (value: string | number | undefined) => value ?? "";
    const direction: Partial<Record<CollectionColumn, "auto" | "ltr">> = {
      white: "auto",
      black: "auto",
      event: "auto",
      opening: "auto",
      result: "ltr",
      date: "ltr",
      round: "ltr",
    };
    return COLLECTION_COLUMNS.map((id) => ({
      id,
      header: t(`library.table.columns.${id}`),
      sortable: true,
      firstDirection: collectionFirstDirection(id),
      ...(isNumericColumn(id) && { align: "end" as const }),
      ...(direction[id] !== undefined && { dir: direction[id] }),
      ...(id === "opening" && { width: 200 }),
      render:
        id === "number"
          ? (row: CollectionRow) => (
              <>
                {row.number}
                {row.unreadable === true && (
                  <WarningAmberRoundedIcon
                    color="warning"
                    titleAccess={t("library.table.unreadable")}
                    data-testid={`${testId}-unreadable-${row.number}`}
                    sx={{ fontSize: 16, verticalAlign: "text-bottom", marginInlineStart: 0.5 }}
                  />
                )}
              </>
            )
          : id === "opening"
            ? (row: CollectionRow) => <OpeningCell value={text(row.opening) as string} />
            : (row: CollectionRow) => text(row[id] as string | number | undefined),
    }));
  }, [t, testId]);

  return (
    <DataTable<CollectionRow, CollectionColumn>
      columns={columns}
      rows={ordered}
      rowId={(row) => String(row.number)}
      sorted
      sort={sort}
      onSort={onSort}
      paging={{ ...paging, labelRowsPerPage: t("library.table.rowsPerPage") }}
      picks={{
        picked: pickedIds,
        onChange: (next) => onPickedChange(new Set([...next].map(Number))),
        selectAllLabel: t("library.table.picks.selectAll"),
        pickLabel: (row) => t("library.table.picks.pick", { title: gameTitleOf(row) }),
        selectAllTestId: `${picksTestId}-select-all`,
        pickTestId: (row) => `${picksTestId}-row-${row.number}`,
      }}
      rowLink={gameLink}
      linkColumn="white"
      rowLinkLabel={gameTitleOf}
      // The empty row keeps one id, whether the collection is empty or the filters leave nothing.
      emptyLabel={t(collectionEmpty ? "library.table.noGames" : "library.table.noMatches")}
      filters={filters}
      density="dense"
      ariaLabel={t("library.table.label")}
      hint={t("hints.table.sortAndPick")}
      testId={testId}
    />
  );
}

export default CollectionGamesTable;
