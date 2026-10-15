import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { SearchField } from "../../../design-system/components/forms";
import { DEFAULT_TABLE_PAGE_SIZE } from "../../../design-system/components/tables";
import { filteredRows, type CollectionColumn, type CollectionRow } from "../../../lib/libraryCollections";
import { CollectionGamesTable } from "../../tables/CollectionGamesTable";

export type GamesPickerDialogProps = {
  open: boolean;
  /** Every game to pick from — one row each, `number` its place in the file. */
  rows: readonly CollectionRow[];
  /**
   * `many`: ticks, select-all over what the words leave, and **Select**;
   * `one`: no ticks — a click on a game (or Enter on its row) chooses it.
   */
  mode: "many" | "one";
  /** The games picked as it opens, by number. */
  initialPicked?: readonly number[];
  /** `many`: at most this many may be selected — past it, Select is off and the dialog says why. */
  max?: number;
  /** The games chosen, by number, in the file's order. The dialog does not close itself. */
  onSubmit: (numbers: number[]) => void;
  onClose: () => void;
  /**
   * The root, and the prefix of every id: the words `<testId>-filter`, the
   * table `<testId>-table` (`CollectionGamesTable`'s parts; its picks
   * `<testId>-picks-…`), the count `<testId>-count`, the cap's warning
   * `<testId>-too-many`, the buttons `<testId>-submit` and `<testId>-cancel`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **Games to pick from a file of many** (CTA-208) — Analysis's New case on a
 * PGN of thousands of games: a wide popup over the Library's games table
 * (`CollectionGamesTable`, no links) — `#`, the players, Elos, result, date,
 * round, event, ECO, opening and moves, every one a sort header — paged,
 * under a words box (every word in some column, `filteredRows`). In `many`
 * mode the games are ticked (select-all takes every game the words leave,
 * on every page; a row's click ticks it too), the count is said, and
 * **Select** hands them back — off with the reason past `max`. In `one` mode
 * a click on a game chooses it.
 *
 * Presentational: the rows are the caller's (`collectionRowOf` over each
 * game's text), the words, sort, page and picks its own state, reset each
 * time it opens. Its words are `analysisV2.newCase.picker.*` and the
 * table's `library.table.*`.
 */
function GamesPickerDialog({ open, rows, mode, initialPicked = [], max, onSubmit, onClose, testId, dialogProps }: GamesPickerDialogProps) {
  const { t, i18n } = useTranslation();
  const [words, setWords] = useState("");
  const [sort, setSort] = useState<{ column: CollectionColumn; direction: "asc" | "desc" }>({ column: "number", direction: "asc" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [picked, setPicked] = useState<Set<number>>(() => new Set(initialPicked));

  // Opened afresh: no words, the first page, the caller's picks — adjusted during render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setWords("");
      setSort({ column: "number", direction: "asc" });
      setPage(0);
      setPicked(new Set(initialPicked));
    }
  }

  const shown = useMemo(() => filteredRows(rows, { text: words, result: "" }), [rows, words]);
  const number = (value: number) => value.toLocaleString(i18n.language);
  const tooMany = mode === "many" && max !== undefined && picked.size > max;

  const toggle = (row: CollectionRow) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(row.number)) next.delete(row.number);
      else next.add(row.number);
      return next;
    });

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={t(mode === "many" ? "analysisV2.newCase.picker.titleMany" : "analysisV2.newCase.picker.titleOne")}
      width="full"
      dividers
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {mode === "many" ? (
              <Typography variant="body2" role="status" data-testid={`${testId}-count`}>
                {t("analysisV2.newCase.picker.count", { picked: number(picked.size), total: number(rows.length) })}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("analysisV2.newCase.picker.oneHint")}
              </Typography>
            )}
          </Box>
          <Button onClick={onClose} data-testid={`${testId}-cancel`}>
            {t("analysisV2.newCase.cancel")}
          </Button>
          {mode === "many" && (
            <Button
              variant="contained"
              disabled={picked.size === 0 || tooMany}
              onClick={() => onSubmit([...picked].sort((a, b) => a - b))}
              data-testid={`${testId}-submit`}
            >
              {t("analysisV2.newCase.picker.submit")}
            </Button>
          )}
        </>
      }
    >
      <Box sx={{ display: "grid", gap: 2, height: "100%", gridTemplateRows: tooMany ? "auto minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
        {tooMany && (
          <InlineAlert severity="warning" testId={`${testId}-too-many`}>
            {t("analysisV2.newCase.picker.tooMany", { max: number(max ?? 0) })}
          </InlineAlert>
        )}
        <CollectionGamesTable
          rows={shown}
          sort={sort}
          onSort={(column, direction) => {
            setSort({ column, direction });
            setPage(0);
          }}
          paging={{
            page,
            rowsPerPage,
            onPageChange: setPage,
            onRowsPerPageChange: (next) => {
              setRowsPerPage(next);
              setPage(0);
            },
          }}
          {...(mode === "many" ? { picked, onPickedChange: setPicked } : {})}
          onRowClick={mode === "many" ? toggle : (row) => onSubmit([row.number])}
          filters={
            <SearchField
              label={t("analysisV2.newCase.picker.filter")}
              value={words}
              onChange={(value) => {
                setWords(value);
                setPage(0);
              }}
              clearLabel={t("analysisV2.newCase.picker.filterClear")}
              testId={`${testId}-filter`}
            />
          }
          testId={`${testId}-table`}
        />
      </Box>
    </BaseDialog>
  );
}

export default GamesPickerDialog;
