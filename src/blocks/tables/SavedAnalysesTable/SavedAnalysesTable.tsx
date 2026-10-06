import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import {
  SAVED_ANALYSIS_COLUMNS,
  savedAnalysisFirstDirection,
  type AnalysisTreeRow,
  type SavedAnalysisColumn,
  type SavedAnalysisRow,
} from "../../../lib/savedAnalysisRows";
import type { GameFolder } from "../../../lib/savedGameFolders";
import { FolderActions } from "../../lists/FolderActions";

/** What a folder row's actions do. */
export type SavedAnalysesTableFolderActions = {
  onDownload: (folder: GameFolder) => void;
  onRename: (folder: GameFolder) => void;
  onMove: (folder: GameFolder) => void;
  onDelete: (folder: GameFolder) => void;
};

export type SavedAnalysesTableProps = {
  /**
   * The folders and analyses as tree rows, every page of them, **in the order
   * to show** — `analysisTreeRows`' walk: folders first at every level, an
   * open folder's contents under it, the filter applied. The screen walks
   * them, since it parses the page on screen and so must know which rows
   * that is.
   */
  rows: readonly AnalysisTreeRow[];
  /** The sort the rows are in — the header that shows its arrow. */
  sort: DataTableSort<SavedAnalysisColumn>;
  /** A header was clicked: the column, and the direction it asks for (a new column opens its own way). */
  onSort: (column: SavedAnalysisColumn, direction: "asc" | "desc") => void;
  /** Open or close a folder in place — its chevron, or a click on its row. */
  onToggle: (folderId: string) => void;
  /** Where a folder's name goes: into it (the screen's `?folder=`). */
  folderLink: (folder: GameFolder) => LinkTarget;
  folderActions: SavedAnalysesTableFolderActions;
  /** The page and its size; absent, every row shows and there is no pager. */
  paging?: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** The picked analyses' ids — over every folder; a folder has no pick. */
  picked: ReadonlySet<string>;
  onPickedChange: (picked: Set<string>) => void;
  /** Where an analysis opens — the Analysis Board: the Name cell's link. */
  openLink: (row: SavedAnalysisRow) => LinkTarget;
  /** A click on an analysis' row, beside its link — the screen goes to the board. */
  onOpenAnalysis: (row: SavedAnalysisRow) => void;
  /** Its settings screen — the row's gear. */
  settingsLink: (row: SavedAnalysisRow) => LinkTarget;
  /** The words box is on: no rows is "no analysis matches", with a way to clear it. */
  filtered?: boolean;
  /** Clears the filter — the no-match row's button. */
  onClearFilter: () => void;
  /** Above the table: the words box. */
  filters?: ReactNode;
  /**
   * The table's root, and every id under it: `-sort-<column>`, `-frame-table`,
   * `-pager`, `-empty`, `-no-match`, `-no-match-clear`, `-note-<id>`,
   * `-settings-<id>`, `-description-<id>`; a row, its link and its pick take
   * the ids the screen's list had — `rowTestId`, `openTestId`, `pickTestId`,
   * `selectAllTestId`; a folder's row `<folderTestId>-<id>`, its name's link
   * `<folderTestId>-open-<id>`, its chevron `<folderTestId>-<id>-toggle`, its
   * actions `<folderTestId>-<action>-<id>`.
   */
  testId: string;
  /** An analysis' row id (`<prefix>-<id>`), its Name link's, its pick's, and the header's select-all. */
  rowTestId: string;
  openTestId: string;
  pickTestId: string;
  selectAllTestId: string;
  folderTestId: string;
};

/**
 * A text on **one line**, truncated with an ellipsis at the column's width —
 * the whole string on hover (a native `title`), as `CollectionGamesTable`'s
 * Opening cell: the flex wrapper with a `minWidth: 0` child is what keeps a
 * long value from growing the table sideways.
 */
function OneLine({ value, testId, secondary = false }: { value: string; testId?: string; secondary?: boolean }) {
  return (
    <Box component="span" sx={{ display: "flex", minWidth: 0 }}>
      <Box
        component="span"
        dir="auto"
        title={value}
        data-testid={testId}
        sx={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          ...(secondary && { typography: "caption", color: "text.secondary" }),
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

/** A row's key: an analysis' id — its pick — or a folder's, which a record id (`[0-9a-z]`) can never be. */
const rowKey = (row: AnalysisTreeRow) => (row.kind === "folder" ? `folder:${row.folder.id}` : row.item.id);

/** The columns kept to one line and cut at a width: a name, an event, an opening. */
const WIDTHS: Partial<Record<SavedAnalysisColumn, number>> = { name: 220, event: 160, opening: 200 };

/**
 * **The saved analyses and their folders, as one tree table** (CTA-144) —
 * the Saved analyses screen's list view: the `DataTable` pattern's tree rows,
 * as the Library's list is, over `analysisTreeRows`. Every analysis is a row
 * whose columns are the game's own fields read off its PGN tags — Name,
 * White, Elo, Black, Elo, Result, Date, Event, Round, ECO, Opening, Moves,
 * Updated — every one a sort header; the folders come first at every level.
 *
 * - **A folder row** has a chevron that opens it in place (a click on the row
 *   does too), its analyses indented under it; its name — with how many
 *   analyses its whole subtree holds — is a link into it; its Updated is when
 *   it last changed; its actions download, rename, move and delete it. It has
 *   no pick.
 * - **An analysis' Name cell is its link** to the Analysis Board — the
 *   reader's name, else the players, else "Analysis board" — with the
 *   description under it on one line, the whole of it on hover; a pick, and
 *   the settings gear at the row's end. Select-all takes the analyses shown.
 * - **A missing field is an empty cell**; the placeholders a board's own
 *   analysis is written with already read as missing (`lib/savedAnalysisRows.ts`).
 * - **A record that will not read** keeps its row, which says so across the
 *   columns, and can only be picked or reached by its gear.
 * - **No row left by the filter** says so, distinct from an empty folder, with
 *   a button that clears it.
 * - Players, events, names and openings are the reader's words (`dir="auto"`);
 *   a result, a date, a round and an ECO code stay LTR; the indent is
 *   `paddingInlineStart`, so it mirrors.
 *
 * Presentational: the walked rows, the sort, the open folders, the page, the
 * picks, the links and every callback are the screen's; its words are the
 * analyses' catalog (`savedAnalyses.*`, `savedList.*`).
 */
function SavedAnalysesTable({
  rows,
  sort,
  onSort,
  onToggle,
  folderLink,
  folderActions,
  paging,
  picked,
  onPickedChange,
  openLink,
  onOpenAnalysis,
  settingsLink,
  filtered = false,
  onClearFilter,
  filters,
  testId,
  rowTestId,
  openTestId,
  pickTestId,
  selectAllTestId,
  folderTestId,
}: SavedAnalysesTableProps) {
  const { t } = useTranslation();
  const analysisName = (row: SavedAnalysisRow) => row.name || t("savedAnalyses.untitled");
  const folderName = (folder: GameFolder) => folder.name || t("savedAnalyses.folder.untitled");
  const nameOf = (row: AnalysisTreeRow) => (row.kind === "folder" ? folderName(row.folder) : analysisName(row.item));

  const columns = useMemo<DataTableColumn<AnalysisTreeRow, SavedAnalysisColumn>[]>(() => {
    const analysisName = (row: SavedAnalysisRow) => row.name || t("savedAnalyses.untitled");
    const folderName = (folder: GameFolder) => folder.name || t("savedAnalyses.folder.untitled");
    const direction: Partial<Record<SavedAnalysisColumn, "auto" | "ltr">> = {
      name: "auto",
      white: "auto",
      black: "auto",
      event: "auto",
      opening: "auto",
      result: "ltr",
      date: "ltr",
      round: "ltr",
      eco: "ltr",
      updated: "ltr",
    };
    const numeric = (id: SavedAnalysisColumn) => id === "whiteElo" || id === "blackElo" || id === "moves";
    const date = (value: string) => {
      const shown = tableDate(value);
      return shown === undefined ? "" : <time dateTime={shown.dateTime}>{shown.text}</time>;
    };
    /** The Name cell: an icon, then the name — a folder's with its count, an analysis' with its notes under it. */
    const name = (row: AnalysisTreeRow) => (
      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Box component="span" aria-hidden="true" sx={{ display: "flex", flexShrink: 0, color: "text.secondary" }}>
          {row.kind === "folder" ? <FolderRoundedIcon fontSize="small" /> : <AccountTreeOutlinedIcon fontSize="small" />}
        </Box>
        {row.kind === "folder" ? (
          <Box component="span" sx={{ display: "flex", alignItems: "baseline", gap: 1, minWidth: 0 }}>
            <Box component="span" dir="auto" sx={{ fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              {folderName(row.folder)}
            </Box>
            <Box component="span" sx={{ typography: "caption", color: "text.secondary", flexShrink: 0 }}>
              {t("savedAnalyses.folder.count", { count: row.size })}
            </Box>
          </Box>
        ) : (
          <Box component="span" sx={{ display: "block", minWidth: 0 }}>
            <OneLine value={analysisName(row.item)} />
            {row.item.description !== "" && (
              <OneLine value={row.item.description} secondary testId={`${testId}-description-${row.item.id}`} />
            )}
          </Box>
        )}
      </Box>
    );
    const render = (id: SavedAnalysisColumn): ((row: AnalysisTreeRow) => ReactNode) => {
      switch (id) {
        case "name":
          return name;
        case "updated":
          return (row) => date(row.kind === "folder" ? row.folder.updatedAt : row.item.updated);
        case "event":
        case "opening":
          return (row) => (row.kind === "folder" || row.item[id] === undefined ? "" : <OneLine value={row.item[id]} />);
        default:
          return (row) => (row.kind === "folder" ? "" : (row.item[id] ?? ""));
      }
    };
    return SAVED_ANALYSIS_COLUMNS.map((id) => ({
      id,
      header: t(`savedAnalyses.table.columns.${id}`),
      sortable: true,
      firstDirection: savedAnalysisFirstDirection(id),
      ...(numeric(id) && { align: "end" as const }),
      ...(direction[id] !== undefined && { dir: direction[id] }),
      ...(WIDTHS[id] !== undefined && { width: WIDTHS[id] }),
      render: render(id),
    }));
  }, [t, testId]);

  const rowActions = (row: AnalysisTreeRow) => {
    if (row.kind === "folder") {
      const { folder } = row;
      const named = folderName(folder);
      return (
        <FolderActions
          folderId={folder.id}
          on={{
            download: () => folderActions.onDownload(folder),
            rename: () => folderActions.onRename(folder),
            move: () => folderActions.onMove(folder),
            delete: () => folderActions.onDelete(folder),
          }}
          labels={{
            download: t("savedList.folder.downloadNamed", { name: named }),
            rename: t("savedList.folder.renameNamed", { name: named }),
            move: t("savedList.folder.moveNamed", { name: named }),
            delete: t("savedList.folder.deleteNamed", { name: named }),
          }}
          // A folder with no analysis under it has nothing to take out.
          disabled={{ download: row.size === 0 }}
          testId={folderTestId}
        />
      );
    }
    return (
      <IconAction
        label={t("savedList.settingsNamed", { name: analysisName(row.item) })}
        link={settingsLink(row.item)}
        testId={`${testId}-settings-${row.item.id}`}
      >
        <SettingsRoundedIcon fontSize="small" />
      </IconAction>
    );
  };

  return (
    <DataTable<AnalysisTreeRow, SavedAnalysisColumn>
      columns={columns}
      rows={rows}
      rowId={rowKey}
      // The walk is already in order: folders first, the reader's sort within each level.
      sorted
      sort={sort}
      onSort={onSort}
      paging={paging === undefined ? undefined : { ...paging, labelRowsPerPage: t("savedAnalyses.rowsPerPage") }}
      picks={{
        picked,
        onChange: onPickedChange,
        canPick: (row) => row.kind === "item",
        selectAllLabel: t("savedAnalyses.selectAll"),
        pickLabel: (row) => t("savedList.selectNamed", { name: nameOf(row) }),
        selectAllTestId,
        pickTestId: (row) => `${pickTestId}-${rowKey(row)}`,
      }}
      tree={{
        depth: (row) => row.depth,
        open: (row) => (row.kind === "folder" ? row.open : undefined),
        onToggle: (row) => {
          if (row.kind === "folder") onToggle(row.folder.id);
        },
        toggleLabel: (row, open) =>
          t(open ? "savedAnalyses.table.collapse" : "savedAnalyses.table.expand", { name: nameOf(row) }),
      }}
      onRowClick={(row) => {
        if (row.kind === "folder") onToggle(row.folder.id);
        else if (row.item.unreadable !== true) onOpenAnalysis(row.item);
      }}
      rowActions={rowActions}
      actionsLabel={t("savedAnalyses.table.actions")}
      // A folder's name goes into it; an analysis' to its board — none for one that will not read.
      rowLink={(row) =>
        row.kind === "folder" ? folderLink(row.folder) : row.item.unreadable === true ? undefined : openLink(row.item)
      }
      linkColumn="name"
      rowLinkLabel={(row) =>
        row.kind === "folder"
          ? t("savedList.folder.openNamed", { name: folderName(row.folder) })
          : row.item.description === ""
            ? analysisName(row.item)
            : `${analysisName(row.item)}, ${row.item.description}`
      }
      rowNote={(row) =>
        row.kind === "item" && row.item.unreadable === true ? (
          <>
            <bdi>{analysisName(row.item)}</bdi> — {t("savedAnalyses.unreadable")}
          </>
        ) : undefined
      }
      rowTestId={(row) => (row.kind === "folder" ? `${folderTestId}-${row.folder.id}` : `${rowTestId}-${row.item.id}`)}
      linkTestId={(row) => (row.kind === "folder" ? `${folderTestId}-open-${row.folder.id}` : `${openTestId}-${row.item.id}`)}
      emptyLabel={t("savedAnalyses.folder.empty")}
      noMatchLabel={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          {t("savedAnalyses.table.noMatch")}
          <Button size="small" variant="outlined" onClick={onClearFilter} data-testid={`${testId}-no-match-clear`}>
            {t("savedAnalyses.table.clearFilter")}
          </Button>
        </Box>
      }
      filtered={filtered}
      filters={filters}
      density="dense"
      ariaLabel={t("savedAnalyses.table.label")}
      hint={t("savedAnalyses.table.hint")}
      testId={testId}
    />
  );
}

export default SavedAnalysesTable;
