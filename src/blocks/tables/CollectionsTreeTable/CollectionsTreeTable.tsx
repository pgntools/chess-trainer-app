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
import { IconAction } from "../../../design-system/components/toolbars";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "../../../design-system/patterns/tables";
import type { FolderTreeRow } from "../../../lib/folderTreeRows";
import type { CollectionSummary } from "../../../lib/libraryCollections";
import type { GameFolder } from "../../../lib/savedGameFolders";
import { FolderActions } from "../../lists/FolderActions";
import type { LibraryTreeColumn } from "./libraryTreeColumns";

/** A collection as the tree files it: its folder resolved (`null` the top level). */
export type LibraryEntry = CollectionSummary & { folderId: string | null };

/** What a row's actions do — a folder's, and a collection's. */
export type CollectionsTreeActions = {
  /** Where "Add a collection here" goes — the upload, filed in the folder. */
  uploadLink: (folder: GameFolder) => LinkTarget;
  onNewFolder: (folder: GameFolder) => void;
  onDownloadFolder: (folder: GameFolder) => void;
  onRenameFolder: (folder: GameFolder) => void;
  onMoveFolder: (folder: GameFolder) => void;
  onDeleteFolder: (
    row: FolderTreeRow<LibraryEntry> & { kind: "folder" },
  ) => void;
  onDownloadCollection: (collection: LibraryEntry) => void;
  onMoveCollection: (collection: LibraryEntry) => void;
  onDeleteCollection: (collection: LibraryEntry) => void;
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
  testId: string;
};

type Row = FolderTreeRow<LibraryEntry>;

const rowKey = (row: Row) =>
  row.kind === "folder" ? `folder-${row.folder.id}` : `item-${row.item.id}`;

/**
 * **The Library's folders and collections, as a tree table** (CTA-113; was
 * `views/shared/folders/FolderTreeTable`) — a file manager's details view on
 * the `DataTable` pattern's tree rows: Name (indented by depth, a chevron on
 * each folder, a collection's name its real link), Games (a folder's is its
 * whole subtree's), Added (`YYYY-MM-DD`, the tables' one date format), and
 * each row's actions, always visible (the tables' rule) — a reader's folder:
 * add a collection here, new sub-folder, download, rename, move, delete; the
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
            sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
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
                new: () => actions.onNewFolder(folder),
                rename: () => actions.onRenameFolder(folder),
                move: () => actions.onMoveFolder(folder),
                delete: () => actions.onDeleteFolder(row),
              }),
            }}
            links={own ? { upload: actions.uploadLink(folder) } : undefined}
            labels={{
              upload: t("savedList.folder.uploadNamed", { name }),
              new: t("savedList.folder.newNamed", { name }),
              download: t("savedList.folder.downloadNamed", { name }),
              rename: t("savedList.folder.renameNamed", { name }),
              move: t("savedList.folder.moveNamed", { name }),
              delete: t("savedList.folder.deleteNamed", { name }),
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
        {own && (
          <IconAction
            label={t("savedList.folder.deleteNamed", { name: item.name })}
            onClick={() => actions.onDeleteCollection(item)}
            testId={`library-collection-delete-${item.id}`}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconAction>
        )}
      </Box>
    );
  };

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
      density="dense"
      emptyLabel={<span data-testid="library-no-matches">{t("library.noMatches")}</span>}
      filtered={filtered}
      ariaLabel={t("library.title")}
      testId={testId}
    />
  );
}

export default CollectionsTreeTable;
