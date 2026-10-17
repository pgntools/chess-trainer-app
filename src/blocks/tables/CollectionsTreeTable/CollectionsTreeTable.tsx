import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import DriveFileMoveRoundedIcon from "@mui/icons-material/DriveFileMoveRounded";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import FolderSpecialRoundedIcon from "@mui/icons-material/FolderSpecialRounded";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction, SelectionBar } from "../../../design-system/components/toolbars";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "../../../design-system/patterns/tables";
import type { FolderTreeRow } from "../../../lib/folderTreeRows";
import type { CollectionSummary } from "../../../lib/libraryCollections";
import type { LibraryPickState } from "../../../lib/libraryPicks";
import type { GameFolder } from "../../../lib/savedGameFolders";
import { FolderActions } from "../../lists/FolderActions";
import type { LibraryTreeColumn } from "./libraryTreeColumns";

/** A collection as the tree files it: its folder resolved (`null` the top level). */
export type LibraryEntry = CollectionSummary & { folderId: string | null };

/**
 * What a row's actions do — a folder's, and a collection's. No new
 * sub-folder or upload into a folder (CTA-231): the header's New folder
 * picks the parent, the upload screen the folder. No New job on a
 * collection (CTA-231; no kind applies to one since CTA-232). No delete on
 * a folder's row (CTA-235): a folder is deleted, whole, through the picks.
 */
export type CollectionsTreeActions = {
  onDownloadFolder: (folder: GameFolder) => void;
  onRenameFolder: (folder: GameFolder) => void;
  onMoveFolder: (folder: GameFolder) => void;
  onDownloadCollection: (collection: LibraryEntry) => void;
  onMoveCollection: (collection: LibraryEntry) => void;
  /** An upload's row delete — absent, none (the Library deletes its picked collections from its header since CTA-232). */
  onDeleteCollection?: (collection: LibraryEntry) => void;
};

export type CollectionsTreeTableProps = {
  /** The tree as rows (`folderTreeRows`): folders first at every level, only the open folders' contents. */
  rows: readonly FolderTreeRow<LibraryEntry>[];
  sort: DataTableSort<LibraryTreeColumn>;
  onSort: (column: LibraryTreeColumn) => void;
  /** Open or close a folder. */
  onToggle: (folderId: string) => void;
  /** Where a collection opens — its table. */
  collectionLink: (collection: LibraryEntry) => LinkTarget;
  /** A click on a collection's row, beside its link. */
  onOpenCollection: (collection: LibraryEntry) => void;
  /** The fixed, read-only folder of the shipped collections: its one action is the download. */
  builtInFolderId: string;
  actions: CollectionsTreeActions;
  /** The words box left nothing. */
  filtered?: boolean;
  /**
   * Whether a collection reads as a tournament (CTA-142,
   * `readsAsTournament`): its icon is a trophy, not a table, and its name is
   * read with "Tournament". Absent, none is.
   */
  isTournament?: (collection: LibraryEntry) => boolean;
  /**
   * Whether a collection could be one, never marked either way (CTA-142,
   * `isPotentialTournament`): a warning triangle first among its row's
   * actions — its tooltip saying so, a link to its table, where the type is
   * suggested — until the type is applied or turned down. Absent, none is.
   */
  isPotentialTournament?: (collection: LibraryEntry) => boolean;
  /**
   * The root, and its sort headers `<testId>-sort-<column>`. A folder's row is
   * `library-folder-<id>` (its chevron `-toggle`, its actions
   * `library-folder-actions-<id>` → `library-folder-<action>-<id>`), a
   * collection's `library-row-<id>` (its link `library-collection-<id>`, its
   * actions `library-collection-actions-<id>` → `library-collection-<action>-<id>`).
   */
  /**
   * **The picks** (CTA-221; folders too since CTA-235) — a box on every
   * collection's row and every reader's folder's (never Built-in's), a
   * folder's standing for everything under it and partly ticked while some
   * of it is, select-all in the header, and a bar counting them with the
   * screen's optional `actions` (the Library passes none since CTA-232: its
   * Merge and Delete are its header's). Every box and select-all are the
   * screen's (`lib/libraryPicks.ts`): `pickOf` answers a row's state and
   * toggle, or `undefined` for a row with no box. Absent, no picks.
   */
  picks?: {
    pickOf: (row: FolderTreeRow<LibraryEntry>) => CollectionsTreePick | undefined;
    selectAll: { checked: boolean; indeterminate: boolean; onToggleAll: () => void };
    /** What the bar counts: the collections picked and the folders that go with the picks. */
    count: { collections: number; folders: number };
    onClear: () => void;
    actions?: ReactNode;
  };
  testId: string;
};

/** A row's box: its state, and what a click on it does. */
export type CollectionsTreePick = LibraryPickState & { onToggle: () => void };

type Row = FolderTreeRow<LibraryEntry>;

/** The table's picks are every row's own (`pickOverride`): the set DataTable reads stays empty. */
const NO_IDS: ReadonlySet<string> = new Set();

const rowKey = (row: Row) =>
  row.kind === "folder" ? `folder-${row.folder.id}` : `item-${row.item.id}`;

/**
 * **The Library's folders and collections, as a tree table** (CTA-113; was
 * `views/shared/folders/FolderTreeTable`) — a file manager's details view on
 * the `DataTable` pattern's tree rows: Name (indented by depth, a chevron on
 * each folder, a collection's name its real link), Games (a folder's is its
 * whole subtree's), Added (`YYYY-MM-DD`, the tables' one date format), and
 * each row's actions, always visible (the tables' rule) — a reader's folder:
 * download, rename, move (CTA-231: no new sub-folder or upload into it — the
 * header's New folder and the upload pick the folder; CTA-235: no delete —
 * a ticked folder goes through the picks, whole); the
 * **Built-in** folder its download alone; an upload download, move, delete; a
 * shipped collection its download alone. Every action is named for its row.
 * A collection that reads as a tournament (CTA-142) shows a trophy where the
 * others show a table, named with the word; one that could be (never
 * marked, its games one event) a warning triangle among its actions, a link
 * to its table whose tooltip says why.
 *
 * Presentational: the walk (`folderTreeRows`), the sort, the open folders and
 * every callback are the screen's. Its words are the Library's (`library.*`).
 */
function CollectionsTreeTable({
  rows,
  sort,
  onSort,
  onToggle,
  collectionLink,
  onOpenCollection,
  builtInFolderId,
  actions,
  filtered = false,
  isTournament,
  isPotentialTournament,
  picks,
  testId,
}: CollectionsTreeTableProps) {
  const { t, i18n } = useTranslation();
  const folderName = (folder: GameFolder) =>
    folder.name === "" ? t("library.folder.untitled") : folder.name;
  const nameOf = (row: Row) =>
    row.kind === "folder" ? folderName(row.folder) : row.item.name;

  // The rows arrive walked and sorted (`sorted`), so the columns need no memo: nothing re-sorts on them.
  const columns: DataTableColumn<Row, LibraryTreeColumn>[] = [
    {
      id: "name",
      header: t("library.columns.name"),
      sortable: true,
      render: (row) => {
        const tournament = row.kind === "item" && isTournament?.(row.item) === true;
        return (
          <Box
            component="span"
            // `relative` holds the trophy's hidden word inside the table's scroll box, not the page's.
            sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, position: "relative" }}
          >
            <Box
              component="span"
              aria-hidden="true"
              data-testid={tournament && row.kind === "item" ? `library-tournament-icon-${row.item.id}` : undefined}
              sx={{ display: "flex", flexShrink: 0, color: "text.secondary" }}
            >
              {tournament ? (
                <EmojiEventsOutlinedIcon fontSize="small" />
              ) : row.kind === "item" ? (
                <TableChartOutlinedIcon fontSize="small" />
              ) : row.folder.id === builtInFolderId ? (
                <FolderSpecialRoundedIcon fontSize="small" color="primary" />
              ) : (
                <FolderRoundedIcon fontSize="small" />
              )}
            </Box>
            <Box
              component="span"
              dir="auto"
              sx={{
                fontWeight: 500,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {nameOf(row)}
            </Box>
            {/* The trophy's word, read with the name (the icon itself is hidden). */}
            {tournament && (
              <Box component="span" sx={visuallyHidden}>
                {`, ${t("library.tournament.mark")}`}
              </Box>
            )}
          </Box>
        );
      },
    },
    {
      id: "games",
      header: t("library.columns.games"),
      sortable: true,
      align: "end",
      firstDirection: "desc",
      render: (row) =>
        (row.kind === "folder" ? row.size : row.item.count).toLocaleString(
          i18n.language,
        ),
    },
    {
      id: "added",
      header: t("library.columns.added"),
      sortable: true,
      firstDirection: "desc",
      dir: "ltr",
      render: (row) => {
        const shown = tableDate(
          row.kind === "folder" ? row.folder.savedAt : row.item.addedAt,
        );
        return shown === undefined ? (
          "—"
        ) : (
          <time dateTime={shown.dateTime}>{shown.text}</time>
        );
      },
    },
  ];

  const rowActions = (row: Row) => {
    if (row.kind === "folder") {
      const { folder } = row;
      const name = folderName(folder);
      const own = folder.id !== builtInFolderId;
      return (
        <Box
          data-testid={`library-folder-actions-${folder.id}`}
          sx={{ display: "flex" }}
        >
          <FolderActions
            folderId={folder.id}
            on={{
              download: () => actions.onDownloadFolder(folder),
              ...(own && {
                rename: () => actions.onRenameFolder(folder),
                move: () => actions.onMoveFolder(folder),
              }),
            }}
            labels={{
              download: t("savedList.folder.downloadNamed", { name }),
              rename: t("savedList.folder.renameNamed", { name }),
              move: t("savedList.folder.moveNamed", { name }),
            }}
            testId="library-folder"
          />
        </Box>
      );
    }
    const { item } = row;
    const own = item.source === "uploaded";
    return (
      <Box
        data-testid={`library-collection-actions-${item.id}`}
        sx={{ display: "flex", gap: 0.25 }}
      >
        {/* CTA-142: could be a tournament, never marked — its table suggests the type. */}
        {isPotentialTournament?.(item) === true && (
          <IconAction
            label={t("library.tournament.potentialHint", { name: item.name, count: item.count })}
            link={collectionLink(item)}
            testId={`library-potential-tournament-${item.id}`}
          >
            <WarningAmberRoundedIcon fontSize="small" color="warning" />
          </IconAction>
        )}
        <IconAction
          label={t("savedList.folder.downloadNamed", { name: item.name })}
          onClick={() => actions.onDownloadCollection(item)}
          testId={`library-collection-download-${item.id}`}
        >
          <DownloadRoundedIcon fontSize="small" />
        </IconAction>
        {own && (
          <IconAction
            label={t("savedList.folder.moveNamed", { name: item.name })}
            onClick={() => actions.onMoveCollection(item)}
            testId={`library-collection-move-${item.id}`}
          >
            <DriveFileMoveRoundedIcon fontSize="small" />
          </IconAction>
        )}
        {own && actions.onDeleteCollection !== undefined && (
          <IconAction
            label={t("savedList.folder.deleteNamed", { name: item.name })}
            onClick={() => actions.onDeleteCollection?.(item)}
            testId={`library-collection-delete-${item.id}`}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconAction>
        )}
      </Box>
    );
  };

  const pickedCount = picks === undefined ? 0 : picks.count.collections + picks.count.folders;
  // "3 collections picked", or with folders "1 folder and 3 collections picked".
  const countLabel =
    picks === undefined || picks.count.folders === 0
      ? t("library.picks.picked", { count: picks?.count.collections ?? 0 })
      : t("library.picks.pickedWith", {
          what: new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" }).format([
            t("library.picks.folders", { count: picks.count.folders }),
            ...(picks.count.collections === 0 ? [] : [t("library.picks.collections", { count: picks.count.collections })]),
          ]),
        });

  return (
    <DataTable<Row, LibraryTreeColumn>
      columns={columns}
      rows={rows}
      rowId={rowKey}
      // The walk is already in order: folders first, pinned first, the reader's sort within.
      sorted
      sort={sort}
      onSort={(column) => onSort(column)}
      hint={t("library.treeHint")}
      tree={{
        depth: (row) => row.depth,
        open: (row) => (row.kind === "folder" ? row.open : undefined),
        onToggle: (row) => {
          if (row.kind === "folder") onToggle(row.folder.id);
        },
        toggleLabel: (row, open) =>
          t(open ? "library.folder.collapse" : "library.folder.expand", {
            name: nameOf(row),
          }),
      }}
      onRowClick={(row) =>
        row.kind === "folder"
          ? onToggle(row.folder.id)
          : onOpenCollection(row.item)
      }
      // A collection's name is its real link; a folder has none (its row opens it).
      rowLink={(row) =>
        row.kind === "item" ? collectionLink(row.item) : undefined
      }
      linkColumn="name"
      rowTestId={(row) =>
        row.kind === "folder"
          ? `library-folder-${row.folder.id}`
          : `library-row-${row.item.id}`
      }
      linkTestId={(row) =>
        row.kind === "item"
          ? `library-collection-${row.item.id}`
          : `library-folder-link-${row.folder.id}`
      }
      rowActions={rowActions}
      actionsLabel={t("library.columns.actions")}
      {...(picks === undefined
        ? {}
        : {
            picks: {
              picked: NO_IDS,
              onChange: () => {},
              selectAllLabel: t("library.picks.selectAll"),
              pickLabel: (row: Row) => t("library.picks.pick", { name: nameOf(row) }),
              // Every box is the screen's: a folder's stands for all under it; Built-in has none.
              canPick: (row: Row) => picks.pickOf(row) !== undefined,
              pickOverride: (row: Row) => picks.pickOf(row),
              selectAll: picks.selectAll,
              pickTestId: (row: Row) => (row.kind === "item" ? `library-pick-${row.item.id}` : `library-pick-folder-${row.folder.id}`),
            },
          })}
      toolbar={
        picks === undefined || pickedCount === 0 ? undefined : (
          <SelectionBar
            count={pickedCount}
            countLabel={countLabel}
            onClear={picks.onClear}
            clearLabel={t("library.picks.clear")}
            actions={picks.actions}
            testId="library-picks-bar"
            rootTestId="library-picks-bar"
          />
        )
      }
      density="dense"
      emptyLabel={<span data-testid="library-no-matches">{t("library.noMatches")}</span>}
      filtered={filtered}
      ariaLabel={t("library.title")}
      testId={testId}
    />
  );
}

export default CollectionsTreeTable;
