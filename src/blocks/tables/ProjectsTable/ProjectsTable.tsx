import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DriveFileMoveRoundedIcon from "@mui/icons-material/DriveFileMoveRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTableSort } from "../../../design-system/patterns/tables";
import { projectPickTargetOf, type ProjectPickTarget } from "../../../lib/analysisProjectPicks";
import {
  PROJECT_COLUMNS,
  projectFirstDirection,
  type ProjectCaseRow,
  type ProjectColumn,
  type ProjectRow,
  type ProjectTreeRow,
} from "../../../lib/analysisProjectRows";
import type { AnalysisProject, ProjectFolder } from "../../../lib/analysisProjects";
import { FolderActions } from "../../lists/FolderActions";

/** What a Project's row can do — a delete is the picks' (CTA-191). */
export type ProjectAction = "rename" | "move" | "duplicate";

/** What a folder's row can do — a delete is the picks' (CTA-191). */
export type ProjectFolderAction = "rename" | "move";

/** A row's box (CTA-191) — the screen's, derived over all the row stands for. */
export type ProjectsTablePick = { checked: boolean; indeterminate: boolean; onToggle: () => void };

export type ProjectsTableProps = {
  /** The tree's rows as the screen walked them (`projectTreeRows`) — in order, folders and Projects opened in place. */
  rows: readonly ProjectTreeRow[];
  /** The sort the rows are in — the header that shows its arrow. */
  sort: DataTableSort<ProjectColumn>;
  onSort: (column: ProjectColumn, direction: "asc" | "desc") => void;
  /** Open or close a folder in place — its chevron, or a click on its row. */
  onToggle: (folderId: string) => void;
  /** Open or close a Project in place, its Cases under it — its chevron, or a click on its row (CTA-191). */
  onToggleProject: (projectId: string) => void;
  /** Where a folder's name goes: into it. */
  folderLink: (folder: ProjectFolder) => LinkTarget;
  /** Where a Project's name goes: its Cases. */
  projectLink: (row: ProjectRow) => LinkTarget;
  /** Where a Case's name goes: its board (CTA-191). */
  caseLink: (row: ProjectCaseRow) => LinkTarget;
  /** A click on a Case's row, beside its link — the screen goes to its board. */
  onOpenCase: (row: ProjectCaseRow) => void;
  onFolderAction: (action: ProjectFolderAction, folder: ProjectFolder) => void;
  onProjectAction: (action: ProjectAction, project: AnalysisProject) => void;
  /**
   * **The picks** (CTA-191): every row's box — a folder's and a Project's
   * standing for all under it, checked or partly ticked from that — and the
   * header's select-all, both the screen's (`lib/analysisProjectPicks.ts`).
   */
  picks: {
    pickOf: (target: ProjectPickTarget) => ProjectsTablePick;
    selectAll: { checked: boolean; indeterminate: boolean; onToggleAll: () => void };
  };
  /** The page and its size; absent, every row shows and there is no pager. */
  paging?: Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;
  /** Above the table: the words box. */
  filters?: ReactNode;
  /** The words box is on: no rows is "no project matches", with a way to clear it. */
  filtered?: boolean;
  onClearFilter?: () => void;
  /**
   * The prefix of its ids: the table `<testId>` (DataTable's parts — a row
   * `<testId>-row-<key>`, its box `<testId>-pick-<key>`, a name link
   * `<testId>-link-<key>`, a sort header `-sort-<column>`, `-select-all`,
   * the pager `-pager`, `-empty`, `-no-match` and its `-no-match-clear`), a
   * folder's actions `<testId>-folder-<action>-<id>`, a Project's
   * `<testId>-project-<action>-<id>`. A row's key is a Project's id,
   * `folder-<id>` or `case-<id>`.
   */
  testId: string;
};

/** A Project row's actions, in their order — Duplicate first (CTA-241); a folder's row keeps Rename, Move to…. */
const PROJECT_ACTIONS: readonly { action: ProjectAction; icon: typeof ContentCopyRoundedIcon }[] = [
  { action: "duplicate", icon: ContentCopyRoundedIcon },
  { action: "rename", icon: DriveFileRenameOutlineRoundedIcon },
  { action: "move", icon: DriveFileMoveRoundedIcon },
];

/** A row's key: a Project's id, or a folder's or a Case's — prefixed, which a record id (`[0-9a-z]`) never is. */
const keyOf = (row: ProjectTreeRow) =>
  row.kind === "folder" ? `folder-${row.folder.id}` : row.kind === "case" ? `case-${row.item.id}` : row.item.id;

/** The table's picks are every row's own (`pickOverride`): the set DataTable reads stays empty. */
const NO_IDS: ReadonlySet<string> = new Set();

/**
 * **Analysis V2's folders, Projects and Cases as one tree table** (CTA-186,
 * CTA-191) — the legacy saved analyses' (CTA-144, removed in CTA-192): folders
 * first at every level, each opened in place by its chevron or a click on
 * its row, its name a link into it, with how many Projects are under it and
 * its actions (rename, move — `FolderActions`); a Project opened in place
 * the same way, its Cases indented under it, its name its link to its Cases
 * screen, how many it holds and when it changed, and its actions (rename,
 * move, duplicate); a Case's name its link to its board, with its kind and
 * when it changed. **Every row has a box** — a folder's and a Project's
 * covering all under it — and select-all sits in the header; no row deletes
 * itself (the screen's selection bar does, CTA-147's way). Every header
 * sorts; the words box sits in its filters slot, a no-match row with its
 * Clear. Presentational: the rows are walked and the picks worked by the
 * screen; its words are the app's.
 */
function ProjectsTable({
  rows,
  sort,
  onSort,
  onToggle,
  onToggleProject,
  folderLink,
  projectLink,
  caseLink,
  onOpenCase,
  onFolderAction,
  onProjectAction,
  picks,
  paging,
  filters,
  filtered = false,
  onClearFilter,
  testId,
}: ProjectsTableProps) {
  const { t } = useTranslation();
  const folderName = (folder: ProjectFolder) => folder.name || t("analysisV2.folder.untitled");
  const projectName = (row: ProjectRow) => row.name || t("analysisV2.project.untitled");
  const nameOf = (row: ProjectTreeRow) =>
    row.kind === "folder" ? folderName(row.folder) : row.kind === "case" ? row.item.name : projectName(row.item);

  const columns = useMemo<DataTableColumn<ProjectTreeRow, ProjectColumn>[]>(() => {
    const folderNamed = (folder: ProjectFolder) => folder.name || t("analysisV2.folder.untitled");
    const icon = (row: ProjectTreeRow) =>
      row.kind === "folder" ? (
        <FolderRoundedIcon fontSize="small" />
      ) : row.kind === "item" ? (
        <FolderSpecialOutlinedIcon fontSize="small" />
      ) : row.item.type === "game" ? (
        <SportsEsportsOutlinedIcon fontSize="small" />
      ) : (
        <ExtensionOutlinedIcon fontSize="small" />
      );
    const render: Record<ProjectColumn, (row: ProjectTreeRow) => ReactNode> = {
      name: (row) => (
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Box component="span" aria-hidden="true" sx={{ display: "flex", flexShrink: 0, color: "text.secondary" }}>
            {icon(row)}
          </Box>
          <Box component="span" dir="auto" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", ...(row.kind === "folder" && { fontWeight: 500 }) }}>
            {row.kind === "folder" ? folderNamed(row.folder) : row.kind === "case" ? row.item.name : row.item.name || t("analysisV2.project.untitled")}
          </Box>
          {row.kind !== "item" && (
            <Box component="span" sx={{ typography: "caption", color: "text.secondary", flexShrink: 0 }}>
              {row.kind === "folder"
                ? t("analysisV2.browser.projectCount", { count: row.size })
                : t(row.item.type === "game" ? "analysisV2.case.typeGame" : "analysisV2.case.typePosition")}
            </Box>
          )}
        </Box>
      ),
      cases: (row) => (row.kind === "item" ? row.item.cases : ""),
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
      picks={{
        picked: NO_IDS,
        onChange: () => {},
        selectAllLabel: t("analysisV2.browser.selectAll"),
        pickLabel: (row) => t("analysisV2.browser.pick", { name: nameOf(row) }),
        // Every box is the screen's: a folder's and a Project's stand for all under them.
        pickOverride: (row) => picks.pickOf(projectPickTargetOf(row)),
        selectAll: picks.selectAll,
      }}
      tree={{
        depth: (row) => row.depth,
        open: (row) => (row.kind === "case" ? undefined : row.open),
        onToggle: (row) => {
          if (row.kind === "folder") onToggle(row.folder.id);
          else if (row.kind === "item") onToggleProject(row.item.id);
        },
        toggleLabel: (row, open) =>
          row.kind === "item"
            ? t(open ? "analysisV2.browser.hideCases" : "analysisV2.browser.showCases", { name: nameOf(row) })
            : t(open ? "analysisV2.browser.collapse" : "analysisV2.browser.expand", { name: nameOf(row) }),
      }}
      onRowClick={(row) => {
        if (row.kind === "folder") onToggle(row.folder.id);
        else if (row.kind === "case") onOpenCase(row.item);
        else if (row.open !== undefined) onToggleProject(row.item.id);
      }}
      rowLink={(row) => (row.kind === "folder" ? folderLink(row.folder) : row.kind === "case" ? caseLink(row.item) : projectLink(row.item))}
      linkColumn="name"
      rowLinkLabel={(row) =>
        row.kind === "folder"
          ? t("analysisV2.browser.openFolder", { name: folderName(row.folder) })
          : row.kind === "case"
            ? t("analysisV2.case.openNamed", { name: row.item.name })
            : t("analysisV2.project.openNamed", { name: projectName(row.item) })
      }
      rowActions={(row) => {
        if (row.kind === "case") return null;
        if (row.kind === "folder") {
          const { folder } = row;
          const name = folderName(folder);
          return (
            <FolderActions
              folderId={folder.id}
              on={{
                rename: () => onFolderAction("rename", folder),
                move: () => onFolderAction("move", folder),
              }}
              labels={{
                rename: t("analysisV2.folder.renameNamed", { name }),
                move: t("analysisV2.folder.moveNamed", { name }),
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
