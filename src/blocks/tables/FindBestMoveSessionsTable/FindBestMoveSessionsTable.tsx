import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { LabelChip, tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import {
  findBestMoveSessionFirstDirection,
  sortedFindBestMoveSessions,
  type FindBestMoveSessionColumn,
  type FindBestMoveSessionRow,
} from "../../../lib/findBestMoveSessionRows";

export type FindBestMoveSessionsTableProps = {
  /** Every session of the project, every page of them. The table orders them by the sort (`sortedFindBestMoveSessions`). */
  rows: readonly FindBestMoveSessionRow[];
  /** The sort shown — `useTableUrlState`'s, in the lobby. */
  sort: DataTableSort<FindBestMoveSessionColumn>;
  onSort: (column: FindBestMoveSessionColumn) => void;
  /** The page and its size; the pager's words are the table's own. */
  paging: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** The ticked rows' ids — the screen's, for its Delete picked. */
  picked: ReadonlySet<string>;
  onPickedChange: (picked: Set<string>) => void;
  /** Where a session goes on — its address. */
  sessionLink: (row: FindBestMoveSessionRow) => LinkTarget;
  /** Its Case in Analysis — every row, a session or not. */
  caseLink: (row: FindBestMoveSessionRow) => LinkTarget;
  /** Its PGN downloaded — every row. */
  onDownload: (row: FindBestMoveSessionRow) => void;
  /** The store's first read has not landed. */
  loading?: boolean;
  /**
   * The table's root, and every id under it: `-row-<id>`, `-pick-<id>`,
   * `-link-<id>`, `-status-<id>`, `-case-<id>`, `-download-<id>`,
   * `-note-<id>` (a Case that is not a session), `-select-all`,
   * `-sort-<column>`, `-loading`, `-empty`, `-pager`.
   */
  testId: string;
};

/** A row's done positions — answered or passed. */
const doneOf = (row: FindBestMoveSessionRow): number =>
  row.session === undefined ? 0 : row.session.progress.answered + row.session.progress.passed;

/** A number with a quieter line under it. */
function TwoLines({ main, detail }: { main: string; detail: string }) {
  return (
    <>
      <bdi dir="ltr">{main}</bdi>
      <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
        {detail}
      </Typography>
    </>
  );
}

/**
 * **Find Best Move's sessions** (CTA-239) — the lobby's table, a `DataTable`
 * over the session Cases of the *Find Best Move* project: Name (the link that
 * resumes it), Side, Moves to find, Progress (the positions answered or
 * passed of all, how many each), Found (the best moves found of those there
 * were to find, how many in place), Status (*Ongoing* / *Done*) and Updated —
 * every header sorts (a Case that is not a session last either way, ties
 * newest first), newest first to start; a pick per row and select-all for the
 * screen's Delete picked; each row's **Open in Analysis** (its Case) and
 * **Download PGN**. A Case that holds no session this version reads keeps its
 * row, which says so across the columns — picked, opened in Analysis and
 * downloaded like any other.
 *
 * Presentational: the rows (`lib/findBestMoveSessionRows.ts`), the sort, the
 * page, the picks, the links and the download are props; its words are the
 * trainer's (`accuracyTrainer.sessions.*`).
 */
function FindBestMoveSessionsTable({
  rows,
  sort,
  onSort,
  paging,
  picked,
  onPickedChange,
  sessionLink,
  caseLink,
  onDownload,
  loading = false,
  testId,
}: FindBestMoveSessionsTableProps) {
  const { t } = useTranslation();

  const ordered = useMemo(() => sortedFindBestMoveSessions(rows, sort.column, sort.direction), [rows, sort.column, sort.direction]);

  const columns = useMemo<DataTableColumn<FindBestMoveSessionRow, FindBestMoveSessionColumn>[]>(() => {
    const column = (id: FindBestMoveSessionColumn) => ({
      id,
      header: t(`accuracyTrainer.sessions.table.columns.${id}`),
      sortable: true,
      firstDirection: findBestMoveSessionFirstDirection(id),
    });
    return [
      {
        ...column("name"),
        dir: "auto",
        render: (row) => (
          <Box component="span" title={row.name} sx={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.name}
          </Box>
        ),
      },
      { ...column("side"), render: (row) => (row.session === undefined ? "" : t(`accuracyTrainer.sessions.sides.${row.session.side}`)) },
      { ...column("moves"), align: "end", render: (row) => (row.session === undefined ? "" : <bdi dir="ltr">{row.session.wanted}</bdi>) },
      {
        ...column("progress"),
        align: "end",
        render: (row) =>
          row.session !== undefined && (
            <TwoLines
              main={t("accuracyTrainer.sessions.progress", { done: doneOf(row), total: row.session.progress.total })}
              detail={t("accuracyTrainer.sessions.progressDetail", { answered: row.session.progress.answered, passed: row.session.progress.passed })}
            />
          ),
      },
      {
        ...column("found"),
        align: "end",
        render: (row) =>
          row.session === undefined ? "" : row.session.progress.target === 0 ? (
            "–"
          ) : (
            <TwoLines
              main={t("accuracyTrainer.sessions.found", { found: row.session.progress.found, target: row.session.progress.target })}
              detail={t("accuracyTrainer.sessions.foundDetail", { inPlace: row.session.progress.inPlace })}
            />
          ),
      },
      {
        ...column("status"),
        render: (row) =>
          row.session !== undefined && (
            <LabelChip
              label={t(`accuracyTrainer.sessions.status.${row.session.progress.done ? "done" : "ongoing"}`)}
              tone={row.session.progress.done ? "success" : "info"}
              testId={`${testId}-status-${row.id}`}
            />
          ),
      },
      {
        ...column("updated"),
        dir: "ltr",
        render: (row) => {
          const shown = tableDate(row.updatedAt);
          return shown === undefined ? "–" : <time dateTime={shown.dateTime}>{shown.text}</time>;
        },
      },
    ];
  }, [t, testId]);

  return (
    <DataTable<FindBestMoveSessionRow, FindBestMoveSessionColumn>
      columns={columns}
      rows={ordered}
      rowId={(row) => row.id}
      sorted
      sort={sort}
      onSort={onSort}
      paging={{ ...paging, labelRowsPerPage: t("accuracyTrainer.sessions.table.rowsPerPage") }}
      picks={{
        picked,
        onChange: onPickedChange,
        selectAllLabel: t("accuracyTrainer.sessions.selectAll"),
        pickLabel: (row) => t("accuracyTrainer.sessions.pick", { name: row.name }),
      }}
      rowLink={(row) => (row.session === undefined ? undefined : sessionLink(row))}
      linkColumn="name"
      rowLinkLabel={(row) => t("accuracyTrainer.sessions.open", { name: row.name })}
      rowNote={(row) => (row.session === undefined ? t("accuracyTrainer.sessions.unreadable", { name: row.name }) : undefined)}
      rowActions={(row) => (
        <>
          <IconAction label={t("accuracyTrainer.sessions.openCaseRow", { name: row.name })} link={caseLink(row)} testId={`${testId}-case-${row.id}`}>
            <ScienceOutlinedIcon fontSize="small" />
          </IconAction>
          <IconAction label={t("accuracyTrainer.sessions.downloadRow", { name: row.name })} onClick={() => onDownload(row)} testId={`${testId}-download-${row.id}`}>
            <DownloadRoundedIcon fontSize="small" />
          </IconAction>
        </>
      )}
      actionsLabel={t("accuracyTrainer.sessions.table.actions")}
      loading={loading}
      loadingLabel={t("accuracyTrainer.sessions.loading")}
      emptyLabel={t("accuracyTrainer.sessions.empty")}
      ariaLabel={t("accuracyTrainer.sessions.table.label")}
      hint={t("hints.table.sortAndPick")}
      testId={testId}
    />
  );
}

export default FindBestMoveSessionsTable;
