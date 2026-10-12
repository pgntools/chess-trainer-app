import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { FolderMoveDialog, FolderNameDialog } from "../../blocks/dialogs";
import { ProjectsList, type ProjectAction, type ProjectFolderAction } from "../../blocks/lists";
import { ConfirmDialog } from "../../design-system/components/dialogs";
import { InlineAlert } from "../../design-system/components/feedback";
import { RadioGroupField } from "../../design-system/components/forms";
import { Breadcrumbs } from "../../design-system/components/navigation";
import { MissState } from "../../design-system/components/states";
import { ListScreenHeader } from "../../design-system/components/toolbars";
import {
  createProjectFolder,
  moveProjectFolder,
  removeProjectFolder,
  removeProjectFolderDeep,
  renameProjectFolder,
} from "../../lib/analysisProjectFolderStore";
import {
  createAnalysisProject,
  duplicateAnalysisProject,
  moveAnalysisProject,
  removeAnalysisProject,
  renameAnalysisProject,
} from "../../lib/analysisProjectStore";
import {
  caseCountsOf,
  projectFolderChildren,
  projectFolderPath,
  projectFolderSubtree,
  projectsHere,
  projectsUnder,
  type AnalysisProject,
  type ProjectFolder,
} from "../../lib/analysisProjects";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { browserPath, projectPath } from "./paths";
import { useAnalysisCases, useAnalysisProjects, useProjectFolders } from "./useAnalysisProjects";

/** The dialog open over the browser, and what it is about. */
type Dialog =
  | { kind: "newFolder" }
  | { kind: "newProject" }
  | { kind: "renameFolder" | "moveFolder" | "deleteFolder"; folder: ProjectFolder }
  | { kind: "renameProject" | "moveProject" | "duplicateProject" | "deleteProject"; project: AnalysisProject };

/**
 * **Analysis V2's Projects browser** (`/analysis`, CTA-186) — the reader's
 * nested folders of Projects, one folder at a time (`?folder=<id>`, the top
 * level without): its trail, its sub-folders and its Projects
 * (`ProjectsList`), and New folder / New project in the header. A folder is
 * renamed, moved (never into its own subtree) and deleted — keeping what it
 * holds one level up, or with everything in it, as the reader chooses; a
 * Project renamed, moved, duplicated with its Cases, and deleted with them
 * after a confirmation that says how many. A new Project opens at once.
 *
 * Reads the stores (`useAnalysisProjects.ts`) and writes through their
 * operations; a refused write is said under the header. Dev-only while the
 * module is built (`.claude/rules/analysis-v2.md`).
 */
function ProjectsBrowser() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useOwnPageHeading();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get("folder");

  const folders = useProjectFolders();
  const projects = useAnalysisProjects();
  const cases = useAnalysisCases();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [deepDelete, setDeepDelete] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const currentFolder = folderId === null ? null : folders?.find((folder) => folder.id === folderId);
  usePageTitle(currentFolder ? currentFolder.name || t("analysisV2.folder.untitled") : undefined);

  const caseCounts = useMemo(() => caseCountsOf(cases ?? []), [cases]);

  if (folders === undefined || projects === undefined || cases === undefined) {
    return (
      <Typography data-testid="analysis-v2-loading" sx={{ color: "text.secondary", p: 2 }}>
        {t("analysisV2.loading")}
      </Typography>
    );
  }
  if (currentFolder === undefined) {
    return (
      <MissState
        backLabel={t("analysisV2.project.back")}
        backLink={{ component: RouterLink, to: browserPath(null) }}
        testId="analysis-v2-folder-missing"
      >
        {t("analysisV2.browser.missingFolder")}
      </MissState>
    );
  }

  const here = currentFolder?.id ?? null;
  const folderName = (folder: ProjectFolder) => folder.name || t("analysisV2.folder.untitled");
  const projectName = (project: AnalysisProject) => project.name || t("analysisV2.project.untitled");
  const chain = currentFolder === null ? [] : projectFolderPath(folders, currentFolder.id);

  const done = (failed: boolean, words: string) => {
    setProblem(failed ? words : null);
    setDialog(null);
  };

  const onFolderAction = (action: ProjectFolderAction, folder: ProjectFolder) => {
    if (action === "delete") setDeepDelete(false);
    setDialog({ kind: `${action}Folder`, folder });
  };
  const onProjectAction = (action: ProjectAction, project: AnalysisProject) =>
    setDialog({ kind: `${action}Project`, project });

  const folderProblem = t("analysisV2.folder.problem");
  const projectProblem = t("analysisV2.project.problem");

  return (
    <>
      <Box data-testid="analysis-v2-browser" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={t("analysisV2.browser.title")}
          count={t("analysisV2.browser.projectCount", { count: projects.length })}
          wrap
          actions={
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CreateNewFolderRoundedIcon fontSize="small" />}
                onClick={() => setDialog({ kind: "newFolder" })}
                data-testid="analysis-v2-new-folder"
              >
                {t("analysisV2.browser.newFolder")}
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddRoundedIcon fontSize="small" />}
                onClick={() => setDialog({ kind: "newProject" })}
                data-testid="analysis-v2-new-project"
              >
                {t("analysisV2.browser.newProject")}
              </Button>
            </>
          }
          testId="analysis-v2-header"
        />
        {currentFolder !== null && (
          <Box sx={{ flexShrink: 0, py: 0.5 }}>
            <Breadcrumbs
              ariaLabel={t("analysisV2.browser.trail")}
              crumbs={[
                { id: "root", label: t("analysisV2.browser.root"), link: { component: RouterLink, to: browserPath(null) } },
                ...chain.slice(0, -1).map((step) => ({
                  id: step.id,
                  label: folderName(step),
                  link: { component: RouterLink, to: browserPath(step.id) },
                })),
              ]}
              current={folderName(currentFolder)}
              testId="analysis-v2-trail"
            />
          </Box>
        )}
        {problem !== null && (
          <InlineAlert severity="error" testId="analysis-v2-problem">
            {problem}
          </InlineAlert>
        )}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <ProjectsList
            folders={projectFolderChildren(folders, here).map((folder) => ({
              folder,
              projects: projectsUnder(projects, folders, folder.id).length,
            }))}
            projects={projectsHere(projects, folders, here).map((project) => ({
              project,
              cases: caseCounts.get(project.id) ?? 0,
            }))}
            folderLink={(id) => ({ component: RouterLink, to: browserPath(id) })}
            projectLink={(id) => ({ component: RouterLink, to: projectPath(id) })}
            onFolderAction={onFolderAction}
            onProjectAction={onProjectAction}
            testId="analysis-v2-list"
          />
        </Box>
      </Box>

      {/* A new folder here, or a folder renamed. */}
      <FolderNameDialog
        open={dialog?.kind === "newFolder" || dialog?.kind === "renameFolder"}
        title={t(dialog?.kind === "renameFolder" ? "analysisV2.folder.renameTitle" : "analysisV2.folder.newTitle")}
        initial={dialog?.kind === "renameFolder" ? dialog.folder.name : ""}
        onSave={(name) => {
          if (dialog?.kind === "renameFolder") {
            void renameProjectFolder(dialog.folder.id, name).then((failed) => done(failed !== undefined, folderProblem));
          } else {
            void createProjectFolder(name, here).then((made) => done(made === undefined, folderProblem));
          }
        }}
        onClose={() => setDialog(null)}
        labels={{ name: t("analysisV2.folder.name"), cancel: t("analysisV2.cancel"), save: t("analysisV2.save") }}
        testId="analysis-v2-folder"
      />

      {/* A new Project here, a Project renamed, or duplicated under a name. */}
      <FolderNameDialog
        open={dialog?.kind === "newProject" || dialog?.kind === "renameProject" || dialog?.kind === "duplicateProject"}
        title={t(
          dialog?.kind === "renameProject"
            ? "analysisV2.project.renameTitle"
            : dialog?.kind === "duplicateProject"
              ? "analysisV2.project.duplicateTitle"
              : "analysisV2.project.newTitle",
        )}
        initial={
          dialog?.kind === "renameProject"
            ? dialog.project.name
            : dialog?.kind === "duplicateProject"
              ? t("analysisV2.project.copyName", { name: projectName(dialog.project) })
              : ""
        }
        onSave={(name) => {
          if (dialog?.kind === "renameProject") {
            void renameAnalysisProject(dialog.project.id, name).then((failed) => done(failed !== undefined, projectProblem));
          } else if (dialog?.kind === "duplicateProject") {
            void duplicateAnalysisProject(dialog.project.id, name).then((copy) => done(copy === undefined, projectProblem));
          } else {
            void createAnalysisProject(name, here).then((made) => {
              done(made === undefined, projectProblem);
              if (made !== undefined) navigate(projectPath(made.id));
            });
          }
        }}
        onClose={() => setDialog(null)}
        labels={{ name: t("analysisV2.project.name"), cancel: t("analysisV2.cancel"), save: t("analysisV2.save") }}
        testId="analysis-v2-project"
      />

      {/* A folder or a Project moved — a folder never into its own subtree. */}
      <FolderMoveDialog
        open={dialog?.kind === "moveFolder" || dialog?.kind === "moveProject"}
        folders={folders}
        current={
          dialog?.kind === "moveFolder" ? dialog.folder.parentId : dialog?.kind === "moveProject" ? dialog.project.folderId : undefined
        }
        exclude={dialog?.kind === "moveFolder" ? [...projectFolderSubtree(folders, dialog.folder.id)] : undefined}
        onMove={(target) => {
          if (dialog?.kind === "moveFolder") {
            void moveProjectFolder(dialog.folder.id, target).then((failed) => done(failed !== undefined, folderProblem));
          } else if (dialog?.kind === "moveProject") {
            void moveAnalysisProject(dialog.project.id, target).then((failed) => done(failed !== undefined, projectProblem));
          }
        }}
        onClose={() => setDialog(null)}
        labels={{
          title: t(dialog?.kind === "moveProject" ? "analysisV2.project.moveTitle" : "analysisV2.folder.moveTitle"),
          cancel: t("analysisV2.cancel"),
          none: t("analysisV2.folder.top"),
          untitled: t("analysisV2.folder.untitled"),
          picker: t("analysisV2.folder.picker"),
        }}
        testId="analysis-v2-move"
      />

      {/* A folder deleted: what it holds moves up a level, or goes with it — the reader's choice. */}
      <ConfirmDialog
        open={dialog?.kind === "deleteFolder"}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== "deleteFolder") return;
          const { folder } = dialog;
          const remove = deepDelete ? removeProjectFolderDeep(folder.id) : removeProjectFolder(folder.id);
          void remove.then((failed) => {
            done(failed !== undefined, folderProblem);
            // Standing inside what went, step out to where it was.
            if (failed === undefined && here !== null && projectFolderSubtree(folders, folder.id).has(here)) {
              navigate(browserPath(folder.parentId));
            }
          });
        }}
        title={dialog?.kind === "deleteFolder" ? t("analysisV2.folder.deleteTitle", { name: folderName(dialog.folder) }) : ""}
        confirmLabel={t("analysisV2.folder.deleteConfirm")}
        cancelLabel={t("analysisV2.cancel")}
        tone="destructive"
        testId="analysis-v2-folder-delete"
      >
        {dialog?.kind === "deleteFolder" && (
          <RadioGroupField<"keep" | "deep">
            label={t("analysisV2.folder.deleteChoice")}
            options={[
              { value: "keep", label: t("analysisV2.folder.deleteKeep") },
              {
                value: "deep",
                label: t("analysisV2.folder.deleteDeep", {
                  count: projectsUnder(projects, folders, dialog.folder.id).length,
                }),
              },
            ]}
            value={deepDelete ? "deep" : "keep"}
            onChange={(value) => setDeepDelete(value === "deep")}
            testId="analysis-v2-folder-delete-choice"
          />
        )}
      </ConfirmDialog>

      {/* A Project deleted with its Cases — saying how many. */}
      <ConfirmDialog
        open={dialog?.kind === "deleteProject"}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== "deleteProject") return;
          void removeAnalysisProject(dialog.project.id).then((failed) => done(failed !== undefined, projectProblem));
        }}
        title={dialog?.kind === "deleteProject" ? t("analysisV2.project.deleteTitle", { name: projectName(dialog.project) }) : ""}
        message={
          dialog?.kind === "deleteProject"
            ? t("analysisV2.project.deleteMessage", { count: caseCounts.get(dialog.project.id) ?? 0 })
            : undefined
        }
        confirmLabel={t("analysisV2.project.deleteConfirm")}
        cancelLabel={t("analysisV2.cancel")}
        tone="destructive"
        testId="analysis-v2-project-delete"
      />
    </>
  );
}

export default ProjectsBrowser;
