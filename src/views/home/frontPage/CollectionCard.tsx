import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";

import { InlineAlert } from "../../../design-system/components/feedback";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import { libraryGameReference } from "../../../lib/gameReference";
import type { CollectionRow } from "../../../lib/libraryCollections";
import { useCollectionRows } from "../../library/useLibraryCollections";
import { collectionPathOf } from "./paths";
import { StoredGameEmbed } from "./StoredGameEmbed";

/**
 * **A Library collection on the front page** (CTA-126) —
 * `<CollectionCard _id="/library/<collection>" showGame="52" />`, a card
 * across its row: the collection's name and size and a link to it; a board
 * on game `showGame` (the game embed, stepping through it from `startMove`);
 * and beside the board a **short table** of the collection's games — `rows`
 * of them, the page that holds the shown game, with earlier / later — each
 * row a click (or Enter) that puts that game on the board.
 *
 * The rows are the collection's index and the board's game its PGN, read
 * exactly as the Library reads them (`useCollectionRows`, the game
 * reference): a shipped collection is there for every reader, an upload only
 * on its device. An address that names no collection says so.
 */

type CollectionCardProps = {
  /** The collection's address: `/library/<collection>`. */
  _id: string;
  /** The game on the board, 1-based — the first when absent. */
  showGame?: number | string;
  /** Where its board opens — a move number (`"17"`, `"17..."`) or a line of SAN. */
  startMove?: string;
  /** How many games the table shows at a time. Default 8. */
  rows?: number | string;
  /** Draw the arrows to the next moves on its board. Default on. */
  showNextMoveArrow?: boolean;
};

const DEFAULT_ROWS = 8;

const wholeAtLeastOne = (value: number | string | undefined, fallback: number): number => {
  const number = typeof value === "string" ? Number(value) : value;
  return number !== undefined && Number.isInteger(number) && number >= 1 ? number : fallback;
};

export function CollectionCard({ _id, showGame, startMove, rows: rowsPerPage, showNextMoveArrow }: CollectionCardProps) {
  const { t, i18n } = useTranslation();
  const collectionId = collectionPathOf(_id);
  const state = useCollectionRows(collectionId);
  const perPage = wholeAtLeastOne(rowsPerPage, DEFAULT_ROWS);
  const [shown, setShown] = useState(() => wholeAtLeastOne(showGame, 1));
  const [page, setPage] = useState(() => Math.floor((wholeAtLeastOne(showGame, 1) - 1) / perPage));
  // `startMove` is where the *first* game opens; a game the reader picks opens at its start.
  const [picked, setPicked] = useState(false);

  const testId = `home-collection-${collectionId ?? "collection"}`;

  if (collectionId === undefined || state.status === "missing") {
    return (
      <InlineAlert severity="info" testId={`${testId}-missing`} detail={_id}>
        {t("home.collection.missing")}
      </InlineAlert>
    );
  }
  if (state.status === "loading") {
    return (
      <Typography role="status" data-testid={`${testId}-loading`} sx={{ color: "text.secondary" }}>
        {t("home.collection.loading")}
      </Typography>
    );
  }

  const { summary, value: rows } = state;
  const game = Math.min(shown, Math.max(1, rows.length));
  const lastPage = Math.max(0, Math.ceil(rows.length / perPage) - 1);
  const onPage = Math.min(page, lastPage);
  const pageRows = rows.slice(onPage * perPage, (onPage + 1) * perPage);
  const first = onPage * perPage + 1;
  const last = onPage * perPage + pageRows.length;
  const format = (n: number) => n.toLocaleString(i18n.language);

  const columns: DataTableColumn<CollectionRow>[] = [
    {
      id: "number",
      header: t("home.collection.columns.number"),
      align: "end",
      dir: "ltr",
      render: (row) =>
        row.number === game ? (
          <Box component="span" aria-current="true" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 700 }}>
            <ChevronRightRoundedIcon fontSize="inherit" aria-hidden />
            {row.number}
          </Box>
        ) : (
          row.number
        ),
    },
    { id: "white", header: t("home.collection.columns.white"), dir: "auto", render: (row) => row.white ?? "" },
    { id: "black", header: t("home.collection.columns.black"), dir: "auto", render: (row) => row.black ?? "" },
    { id: "result", header: t("home.collection.columns.result"), dir: "ltr", render: (row) => row.result },
    { id: "year", header: t("home.collection.columns.year"), dir: "ltr", render: (row) => row.date?.slice(0, 4) ?? "" },
  ];

  return (
    <Box
      component="section"
      aria-label={summary.name}
      data-testid={testId}
      sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2, display: "grid", gap: 2, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 1 }}>
        <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }} data-testid={`${testId}-name`}>
          {summary.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {t("home.collection.games", { count: summary.count, formatted: format(summary.count) })}
        </Typography>
        <Button
          component={RouterLink}
          to={`/library/${encodeURIComponent(summary.id)}`}
          variant="outlined"
          size="small"
          data-testid={`${testId}-open`}
        >
          {t("home.collection.open")}
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 360px) minmax(0, 1fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <StoredGameEmbed
          key={game}
          reference={libraryGameReference(summary.id, game)}
          startMove={picked ? undefined : startMove}
          showNextMoveArrow={showNextMoveArrow}
        />
        <Box sx={{ display: "grid", gap: 1, minWidth: 0 }}>
          <DataTable
            ariaLabel={t("home.collection.table", { name: summary.name })}
            columns={columns}
            rows={pageRows}
            sorted
            rowId={(row) => String(row.number)}
            onRowClick={(row) => {
              setPicked(true);
              setShown(row.number);
            }}
            emptyLabel={t("home.collection.empty")}
            density="dense"
            stickyHeader={false}
            testId={`${testId}-table`}
          />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" dir="ltr" sx={{ unicodeBidi: "isolate" }}>
              {rows.length === 0 ? "" : `${format(first)}–${format(last)} / ${format(rows.length)}`}
            </Typography>
            <IconAction
              label={t("home.collection.earlier")}
              disabled={onPage === 0}
              onClick={() => setPage(onPage - 1)}
              testId={`${testId}-earlier`}
            >
              <NavigateBeforeRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction
              label={t("home.collection.later")}
              disabled={onPage >= lastPage}
              onClick={() => setPage(onPage + 1)}
              testId={`${testId}-later`}
            >
              <NavigateNextRoundedIcon fontSize="small" />
            </IconAction>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
