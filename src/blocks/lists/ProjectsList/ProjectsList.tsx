import List from "@mui/material/List";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DriveFileMoveRoundedIcon from "@mui/icons-material/DriveFileMoveRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { FolderRow, RecordRow } from "../../../design-system/components/lists";
import { EmptyState } from "../../../design-system/components/states";
import { IconAction } from "../../../design-system/components/toolbars";
import type { AnalysisProject, ProjectFolder } from "../../../lib/analysisProjects";
import { savedListDate, savedListLine } from "../../../lib/savedListCaption";
import { FolderActions } from "../FolderActions";

/** What a Project's row can do. */
export type ProjectAction = "rename" | "move" | "duplicate" | "delete";

/** What a folder's row can do. */
export type ProjectFolderAction = "rename" | "move" | "delete";

export type ProjectsListProps = {
  /** The sub-folders of the folder on screen, each with how many Projects are under it. */
  folders: readonly { folder: ProjectFolder; projects: number }[];
  /** The Projects filed in it, each with how many Cases it holds. */
  projects: readonly { project: AnalysisProject; cases: number }[];
  /** Where a folder's row goes — into the folder. */
  folderLink: (folderId: string) => LinkTarget;
  /** Where a Project's row goes — its Cases. */
  projectLink: (projectId: string) => LinkTarget;
  onFolderAction: (action: ProjectFolderAction, folder: ProjectFolder) => void;
  onProjectAction: (action: ProjectAction, project: AnalysisProject) => void;
  /**
   * The prefix of its ids: the list `<testId>`, a folder's row
   * `<testId>-folder-<id>` (its actions `<testId>-folder-<action>-<id>`), a
   * Project's `<testId>-project-<id>` (its actions
   * `<testId>-project-<action>-<id>`), the empty line `<testId>-empty`.
   */
  testId: string;
};

const PROJECT_ACTIONS: readonly { action: ProjectAction; icon: typeof DeleteOutlineRoundedIcon }[] = [
  { action: "rename", icon: DriveFileRenameOutlineRoundedIcon },
  { action: "move", icon: DriveFileMoveRoundedIcon },
  { action: "duplicate", icon: ContentCopyRoundedIcon },
  { action: "delete", icon: DeleteOutlineRoundedIcon },
];

/**
 * **One folder of Analysis V2's Projects** (CTA-186) — its sub-folders first,
 * each a row into it with how many Projects are under it and its actions
 * (rename, move, delete — `FolderActions`), then its Projects, each a row to
 * its Cases with how many it holds and when it last changed, and its actions
 * (rename, move, duplicate, delete). Presentational: the rows, the links and
 * the callbacks are props; its words are the app's (`analysisV2.*`).
 */
function ProjectsList({ folders, projects, folderLink, projectLink, onFolderAction, onProjectAction, testId }: ProjectsListProps) {
  const { t, i18n } = useTranslation();
  if (folders.length === 0 && projects.length === 0) {
    return <EmptyState testId={`${testId}-empty`}>{t("analysisV2.browser.empty")}</EmptyState>;
  }
  return (
    <List disablePadding aria-label={t("analysisV2.browser.listLabel")} data-testid={testId}>
      {folders.map(({ folder, projects: count }) => {
        const name = folder.name || t("analysisV2.folder.untitled");
        return (
          <FolderRow
            key={folder.id}
            name={name}
            count={t("analysisV2.browser.projectCount", { count })}
            link={folderLink(folder.id)}
            testId={`${testId}-folder-${folder.id}`}
            actions={
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
            }
          />
        );
      })}
      {projects.map(({ project, cases }) => {
        const name = project.name || t("analysisV2.project.untitled");
        return (
          <RecordRow
            key={project.id}
            name={name}
            caption={savedListLine([
              t("analysisV2.browser.caseCount", { count: cases }),
              t("analysisV2.browser.updated", { date: savedListDate(project.updatedAt, i18n.language) }),
            ])}
            primaryAction={{
              label: t("analysisV2.project.open"),
              ariaLabel: t("analysisV2.project.openNamed", { name }),
              link: projectLink(project.id),
            }}
            actions={PROJECT_ACTIONS.map(({ action, icon: Icon }) => (
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
            testId={`${testId}-project-${project.id}`}
          />
        );
      })}
    </List>
  );
}

export default ProjectsList;
