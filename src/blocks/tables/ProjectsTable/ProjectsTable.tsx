import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DriveFileMoveRoundedIcon from "@mui/icons-material/DriveFileMoveRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import {
  PROJECT_COLUMNS,
  projectFirstDirection,
  type ProjectColumn,
  type ProjectRow,
  type ProjectTreeRow,
} from "../../../lib/analysisProjectRows";
import type { AnalysisProject, ProjectFolder } from "../../../lib/analysisProjects";
import { FolderActions } from "../../lists/FolderActions";

/** What a Project's row can do. */
export type ProjectAction = "rename" | "move" | "duplicate" | "delete";

/** What a folder's row can do. */
export type ProjectFolderAction = "rename" | "move" | "delete";

export type ProjectsTableProps = {
  /** The tree's rows as the screen walked them (`projectTreeRows`) — in order, folders opened in place. */
  rows: readonly ProjectTreeRow[];
  /** The sort the rows are in — the header that shows its arrow. */
  sort: DataTableSort<ProjectColumn>;
  onSort: (column: ProjectColumn, direction: "asc" | "desc") => void;
  /** Open or close a folder in place — its chevron, or a click on its row. */
  onToggle: (folderId: string) => void;
  /** Where a folder's name goes: into it. */
  folderLink: (folder: ProjectFolder) => LinkTarget;
  /** Where a Project's name goes: its Cases. */
  projectLink: (row: ProjectRow) => LinkTarget;
  onFolderAction: (action: ProjectFolderAction, folder: ProjectFolder) => void;
  onProjectAction: (action: ProjectAction, project: AnalysisProject) => void;
  /** The page and its size; absent, every row shows and there is no pager. */
  paging?: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** Above the table: the words box. */
  filters?: ReactNode;
  /** The words box is on: no rows is "no project matches", with a way to clear it. */
  filtered?: boolean;
  onClearFilter?: () => void;
  /**
   * The prefix of its ids: the table `<testId>` (DataTable's parts — a row
   * `<testId>-row-<key>`, a name link `<testId>-link-<key>`, a sort header
   * `-sort-<column>`, the pager `-pager`, `-empty`, `-no-match` and its
   * `-no-match-clear`), a folder's actions `<testId>-folder-<action>-<id>`,
   * a Project's `<testId>-project-<action>-<id>`. A row's key is a Project's
   * id, or `folder-<id>`.
   */
  testId: string;
};

const PROJECT_ACTIONS: readonly { action: ProjectAction; icon: typeof DeleteOutlineRoundedIcon }[] = [
  { action: "rename", icon: DriveFileRenameOutlineRoundedIcon },
  { action: "move", icon: DriveFileMoveRoundedIcon },
  { action: "duplicate", icon: ContentCopyRoundedIcon },
  { action: "delete", icon: DeleteOutlineRoundedIcon },
];

/** A row's key: a Project's id, or a folder's — which a record id (`[0-9a-z]`) can never be. */
const keyOf = (row: ProjectTreeRow) => (row.kind === "folder" ? `folder-${row.folder.id}` : row.item.id);

/**
 * **Analysis V2's folders and Projects as one tree table** (CTA-186) — the
 * legacy saved analyses' (`SavedAnalysesTable`): folders first at every
 * level, each opened in place by its chevron or a click on its row, its name
 * a link into it, with how many Projects are under it and its actions
 * (rename, move, delete — `FolderActions`); a Project's name its link to its
 * Cases, how many it holds and when it changed, and its actions (rename,
 * move, duplicate, delete). Every header sorts; the words box sits in its
 * filters slot, a no-match row with its Clear. Presentational: the rows are
 * walked by the screen (`projectTreeRows`); its words are the app's.
 */
function ProjectsTable({
  rows,
  sort,
  onSort,
  onToggle,
  folderLink,
  projectLink,
  onFolderAction,
  onProjectAction,
  paging,
  filters,
  filtered = false,
  onClearFilter,
  testId,
}: ProjectsTableProps) {
  const { t } = useTranslation();
  const folderName = (folder: ProjectFolder) => folder.name || t("analysisV2.folder.untitled");
  const projectName = (row: ProjectRow) => row.name || t("analysisV2.project.untitled");
  const nameOf = (row: ProjectTreeRow) => (row.kind === "folder" ? folderName(row.folder) : projectName(row.item));

  const columns = useMemo<DataTableColumn<ProjectTreeRow, ProjectColumn>[]>(() => {
    const folderNamed = (folder: ProjectFolder) => folder.name || t("analysisV2.folder.untitled");
    const render: Record<ProjectColumn, (row: ProjectTreeRow) => ReactNode> = {
      name: (row) => (
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Box component="span" aria-hidden="true" sx={{ display: "flex", flexShrink: 0, color: "text.secondary" }}>
            {row.kind === "folder" ? <FolderRoundedIcon fontSize="small" /> : <FolderSpecialOutlinedIcon fontSize="small" />}
          </Box>
          <Box component="span" dir="auto" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", ...(row.kind === "folder" && { fontWeight: 500 }) }}>
            {row.kind === "folder" ? folderNamed(row.folder) : row.item.name || t("analysisV2.project.untitled")}
          </Box>
          {row.kind === "folder" && (
            <Box component="span" sx={{ typography: "caption", color: "text.secondary", flexShrink: 0 }}>
              {t("analysisV2.browser.projectCount", { count: row.size })}
            </Box>
          )}
        </Box>
      ),
      cases: (row) => (row.kind === "folder" ? "" : row.item.cases),
      updated: (row) => {
        const shown = tableDate(row.kind === "folder" ? row.folder.updatedAt : row.item.updated);
        return shown === undefined ? "" : <time dateTime={shown.dateTime}>{shown.text}</time>;
      },
    };
    return PROJECT_COLUMNS.map((id) => ({
      id,
      header: t(`analysisV2.browser.columns.${id}`),
      sortable: true,
      firstDirection: projectFirstDirection(id),
      ...(id === "cases" && { align: "end" as const }),
      ...(id === "updated" && { dir: "ltr" as const }),
      ...(id === "name" && { width: "60%" }),
      render: render[id],
    }));
  }, [t]);

  return (
    <DataTable<ProjectTreeRow, ProjectColumn>
      columns={columns}
      rows={rows}
      rowId={keyOf}
      sort={sort}
      onSort={onSort}
      // The screen walked the tree in the sort's order: the table keeps it.
      sorted
      paging={paging === undefined ? undefined : { ...paging, labelRowsPerPage: t("analysisV2.browser.rowsPerPage") }}
      tree={{
        depth: (row) => row.depth,
        open: (row) => (row.kind === "folder" ? row.open : undefined),
        onToggle: (row) => {
          if (row.kind === "folder") onToggle(row.folder.id);
        },
        toggleLabel: (row, open) => t(open ? "analysisV2.browser.collapse" : "analysisV2.browser.expand", { name: nameOf(row) }),
      }}
      onRowClick={(row) => {
        if (row.kind === "folder") onToggle(row.folder.id);
      }}
      rowLink={(row) => (row.kind === "folder" ? folderLink(row.folder) : projectLink(row.item))}
      linkColumn="name"
      rowLinkLabel={(row) =>
        row.kind === "folder"
          ? t("analysisV2.browser.openFolder", { name: folderName(row.folder) })
          : t("analysisV2.project.openNamed", { name: projectName(row.item) })
      }
      rowActions={(row) => {
        if (row.kind === "folder") {
          const { folder } = row;
          const name = folderName(folder);
          return (
            <FolderActions
              folderId={folder.id}
              on={{
                rename: () => onFolderAction("rename", folder),
                move: () => onFolderAction("move", folder),
                delete: () => onFolderAction("delete", folder),
              }}
              labels={{
                rename: t("analysisV2.folder.renameNamed", { name }),
                move: t("analysisV2.folder.moveNamed", { name }),
                delete: t("analysisV2.folder.deleteNamed", { name }),
              }}
              testId={`${testId}-folder`}
            />
          );
        }
        const { project } = row.item;
        const name = projectName(row.item);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            {PROJECT_ACTIONS.map(({ action, icon: Icon }) => (
              <IconAction
                key={action}
                label={t(`analysisV2.project.${action}Named`, { name })}
                onClick={() => onProjectAction(action, project)}
                color={action === "delete" ? "error" : "default"}
                testId={`${testId}-project-${action}-${project.id}`}
              >
                <Icon fontSize="small" />
              </IconAction>
            ))}
          </Box>
        );
      }}
      actionsLabel={t("analysisV2.case.actions")}
      filters={filters}
      filtered={filtered}
      noMatchLabel={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          {t("analysisV2.browser.noMatch")}
          {onClearFilter !== undefined && (
            <Button size="small" variant="outlined" onClick={onClearFilter} data-testid={`${testId}-no-match-clear`}>
              {t("analysisV2.case.clearFilter")}
            </Button>
          )}
        </Box>
      }
      emptyLabel={t("analysisV2.browser.empty")}
      density="dense"
      ariaLabel={t("analysisV2.browser.listLabel")}
      hint={t("analysisV2.browser.tableHint")}
      testId={testId}
    />
  );
}

export default ProjectsTable;
