import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { CollectionImportDialog, FolderMoveDialog, FolderNameDialog, NewProjectDialog } from "../../blocks/dialogs";
import { ProjectsTable, caseDisplayName, type ProjectAction, type ProjectFolderAction } from "../../blocks/tables";
import { DeleteManyDialog } from "../../design-system/components/dialogs";
import { InlineAlert } from "../../design-system/components/feedback";
import { SearchField } from "../../design-system/components/forms";
import { TABLE_PAGE_SIZES, useTableUrlState } from "../../design-system/components/tables";
import { Breadcrumbs } from "../../design-system/components/navigation";
import { MissState } from "../../design-system/components/states";
import { IconAction, ListScreenHeader, SelectionBar } from "../../design-system/components/toolbars";
import {
  createProjectFolder,
  moveProjectFolder,
  removeProjectFoldersDeep,
  renameProjectFolder,
} from "../../lib/analysisProjectFolderStore";
import { addAnalysisCases, removeAnalysisCases } from "../../lib/analysisCaseStore";
import {
  createAnalysisProject,
  duplicateAnalysisProject,
  moveAnalysisProject,
  removeAnalysisProject,
  removeAnalysisProjects,
  renameAnalysisProject,
} from "../../lib/analysisProjectStore";
import {
  projectPickStateOf,
  projectPickTargetOf,
  projectPicksDeletion,
  projectPicksOf,
  setProjectPicks,
  toggleProjectPick,
  type ProjectPickModel,
  type ProjectPickTarget,
} from "../../lib/analysisProjectPicks";
import {
  PROJECT_COLUMNS,
  projectCaseRowOf,
  projectFirstDirection,
  projectRowOf,
  projectTreeRows,
} from "../../lib/analysisProjectRows";
import {
  caseCountsOf,
  gameCaseOf,
  projectFolderPath,
  projectFolderSubtree,
  type AnalysisProject,
  type ProjectFolder,
} from "../../lib/analysisProjects";
import { isZipFile, readCollectionZip } from "../../lib/collectionZip";
import { collectionImportFileOf, type CollectionImportSource } from "../../lib/libraryCollections";
import { parsePgnTree } from "../../lib/pgn";
import { newRecordId } from "../../lib/recordId";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { browserPath, casePath, projectPath } from "./paths";
import { useAnalysisCases, useAnalysisProjects, useProjectFolders } from "./useAnalysisProjects";

/** Why a picked file brought no game in — an `analysisV2.newProject.problem.*` key's last part. */
const FILE_PROBLEMS: Readonly<Record<string, string>> = {
  empty: "empty",
  "too-large": "tooLarge",
  unreadable: "unreadable",
  zip: "zip",
  "zip-empty": "zipEmpty",
};

/** The dialog open over the browser, and what it is about. */
type Dialog =
  | { kind: "newFolder" }
  | { kind: "newProject" }
  | { kind: "renameFolder" | "moveFolder"; folder: ProjectFolder }
  | { kind: "renameProject" | "moveProject" | "duplicateProject"; project: AnalysisProject };

/**
 * **Analysis V2's Projects browser** (`/analysis`, CTA-186) — the reader's
 * nested folders of Projects, one folder at a time (`?folder=<id>`, the top
 * level without): its trail, its sub-folders, its Projects and their Cases
 * as one tree table (`ProjectsTable`, the legacy saved analyses' — folders
 * first, folders and Projects opened in place, each header a sort, a words
 * box over every name that opens the folders and Projects above a match,
 * paged), and New folder / New project in the header. A folder is renamed
 * and moved (never into its own subtree); a Project renamed, moved and
 * duplicated with its Cases. **Deleting is through the picks** (CTA-191, the
 * legacy saved analyses' CTA-147): every row's box — a folder's standing for
 * its whole subtree, a Project's for its Cases —, select-all over what the
 * words leave, and the selection bar's Delete, asked first, saying how many
 * folders, Projects and Cases go. A new Project opens at once.
 *
 * Reads the stores (`useAnalysisProjects.ts`) and writes through their
 * operations; a refused write is said under the header
 * (`.claude/rules/analysis-v2.md`).
 */
function ProjectsBrowser() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  useOwnPageHeading();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get("folder");

  const folders = useProjectFolders();
  const projects = useAnalysisProjects();
  const cases = useAnalysisCases();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  /** The new-Project dialog's own state: writing, what went wrong, and a file of several games being chosen from. */
  const [creating, setCreating] = useState(false);
  const [createProblem, setCreateProblem] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<{ name: string; source: CollectionImportSource } | null>(null);

  const currentFolder = folderId === null ? null : folders?.find((folder) => folder.id === folderId);
  usePageTitle(currentFolder ? currentFolder.name || t("analysisV2.folder.untitled") : undefined);

  const caseCounts = useMemo(() => caseCountsOf(cases ?? []), [cases]);
  // Every Case as a row under its Project, named as the reader reads it.
  const caseRows = useMemo(() => (cases ?? []).map((record) => projectCaseRowOf(record, caseDisplayName(record, t))), [cases, t]);

  /*
    The tree table (the legacy saved analyses' — CTA-144): what is under the
    folder on screen (everything, at the top level), its folders opened in
    place — each as the reader left it, else as the words open it — sorted by
    the URL's column, narrowed by its words (`?q=`), and paged.
  */
  const text = searchParams.get("q") ?? "";
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const [toggledProjects, setToggledProjects] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const table = useTableUrlState({
    columns: PROJECT_COLUMNS,
    defaultSort: "name",
    firstDirection: projectFirstDirection,
  });
  /** The tree in scope, walked with each folder and Project open as `open` says. */
  const walk = useMemo(() => {
    if (folders === undefined || projects === undefined) return undefined;
    // Seen from inside a folder, its contents are the tree's top level.
    const inside = folderId === null ? undefined : projectFolderSubtree(folders, folderId);
    const scopedFolders =
      inside === undefined
        ? folders
        : folders
            .filter((folder) => inside.has(folder.id) && folder.id !== folderId)
            .map((folder) => (folder.parentId === folderId ? { ...folder, parentId: null } : folder));
    const rows = projects
      .filter((project) => inside === undefined || (project.folderId !== null && inside.has(project.folderId)))
      .map((project) => {
        const row = projectRowOf(project, caseCounts.get(project.id) ?? 0);
        return row.folderId === folderId ? { ...row, folderId: null } : row;
      });
    return (
      isOpen: (id: string, auto: boolean) => boolean,
      isProjectOpen: (id: string, auto: boolean) => boolean,
    ) =>
      projectTreeRows({
        folders: scopedFolders,
        rows,
        cases: caseRows,
        isOpen,
        isProjectOpen,
        column: table.sort,
        direction: table.direction,
        text,
      }).rows;
  }, [folders, projects, folderId, caseCounts, caseRows, table.sort, table.direction, text]);
  const walked = useMemo(
    () =>
      walk?.(
        (id, auto) => toggled.get(id) ?? auto,
        (id, auto) => toggledProjects.get(id) ?? auto,
      ) ?? [],
    [walk, toggled, toggledProjects],
  );
  const toggleFolder = (id: string) => {
    const shown = walked.find((row) => row.kind === "folder" && row.folder.id === id);
    setToggled((before) => new Map(before).set(id, !(shown?.kind === "folder" && shown.open)));
  };
  const toggleProject = (id: string) => {
    const shown = walked.find((row) => row.kind === "item" && row.item.id === id);
    setToggledProjects((before) => new Map(before).set(id, !(shown?.kind === "item" && shown.open === true)));
  };

  /*
    The picks (CTA-191, the legacy saved analyses' CTA-147): one set of ids
    over folders, Projects and Cases, a container's standing for all under
    it, read through the stores' records (`projectPicksOf`) — so one deleted,
    here or in another tab, falls out of the count. They persist across
    opening and closing rows and across folders.
  */
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const model = useMemo<ProjectPickModel>(
    () => ({ folders: folders ?? [], projects: projects ?? [], cases: cases ?? [] }),
    [folders, projects, cases],
  );
  const picks = useMemo(() => projectPicksOf(model, picked), [model, picked]);
  const deletion = useMemo(() => projectPicksDeletion(model, picks), [model, picks]);
  const pickedCount = deletion.counts.folders + deletion.counts.projects + deletion.counts.cases;
  /*
    Select-all covers the rows the words leave, closed ones' too: the tree
    walked with every folder and Project open, its leaves — each Case, each
    Project with none shown, each folder with nothing shown in it — so a
    container is ticked through what the words keep in it, never more.
  */
  const covered = useMemo(() => {
    const every = walk?.(() => true, () => true) ?? [];
    return every.flatMap((row, index): ProjectPickTarget[] => {
      const next = every[index + 1];
      const hasChild = next !== undefined && next.depth > row.depth;
      return row.kind !== "case" && hasChild ? [] : [projectPickTargetOf(row)];
    });
  }, [walk]);
  const allCovered = covered.length > 0 && covered.every((target) => projectPickStateOf(picks, target).checked);
  const someCovered = covered.some((target) => {
    const state = projectPickStateOf(picks, target);
    return state.checked || state.indeterminate;
  });
  const [deletingPicked, setDeletingPicked] = useState(false);
  const [deleteProblem, setDeleteProblem] = useState<string | null>(null);
  // What the dialog names, held past the confirm so its closing does not read "Delete 0".
  const [asked, setAsked] = useState(deletion.counts);

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

  const onFolderAction = (action: ProjectFolderAction, folder: ProjectFolder) => setDialog({ kind: `${action}Folder`, folder });
  const onProjectAction = (action: ProjectAction, project: AnalysisProject) =>
    setDialog({ kind: `${action}Project`, project });

  /** What the picks are about: a row's box, and select-all over what the words leave. */
  const pickOf = (target: ProjectPickTarget) => ({
    ...projectPickStateOf(picks, target),
    onToggle: () => setPicked((current) => toggleProjectPick(current, model, target)),
  });
  const selectAll = {
    checked: allCovered,
    indeterminate: someCovered && !allCovered,
    onToggleAll: () => setPicked((current) => setProjectPicks(current, model, covered, !allCovered)),
  };

  /**
   * **The picks deleted** — the Cases, then the Projects with theirs, then
   * the folders with everything in them (their Jobs V2 and links with them,
   * as the stores do). A refusal is said in the dialog and the picks stay;
   * standing inside a folder that goes, the reader steps to the nearest one
   * that survives.
   */
  const deletePicked = async () => {
    const failed =
      (await removeAnalysisCases(deletion.caseIds)) ??
      (await removeAnalysisProjects(deletion.projectIds)) ??
      (await removeProjectFoldersDeep(deletion.folderIds));
    if (failed !== undefined) {
      setDeleteProblem(t("analysisV2.browser.deleteProblem"));
      return;
    }
    if (here !== null && deletion.goneFolders.has(here)) {
      const byId = new Map(folders.map((folder) => [folder.id, folder]));
      let parentId = byId.get(here)?.parentId ?? null;
      while (parentId !== null && deletion.goneFolders.has(parentId)) parentId = byId.get(parentId)?.parentId ?? null;
      navigate(browserPath(parentId));
    }
    setPicked(new Set());
    setDeletingPicked(false);
  };
  const deleteWhat = new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" }).format(
    [
      asked.folders > 0 ? t("analysisV2.browser.deleteFolders", { count: asked.folders }) : undefined,
      asked.projects > 0 ? t("analysisV2.browser.deleteProjects", { count: asked.projects }) : undefined,
      asked.cases > 0 ? t("analysisV2.browser.deleteCases", { count: asked.cases }) : undefined,
    ].filter((part): part is string => part !== undefined),
  );

  const folderProblem = t("analysisV2.folder.problem");
  const projectProblem = t("analysisV2.project.problem");

  /**
   * **A new Project, with a Game Case per game** — none for a name alone.
   * All or nothing: Cases the store refuses take the Project back. A game
   * that will not parse is left out. Then the Project opens.
   */
  const makeProject = async (name: string, games: readonly string[]) => {
    setCreating(true);
    const now = new Date();
    const trees = games.flatMap((pgn) => {
      try {
        return [parsePgnTree(pgn)];
      } catch {
        return [];
      }
    });
    const made = await createAnalysisProject(name, here, now);
    let failed = made === undefined ? projectProblem : null;
    if (made !== undefined && trees.length > 0) {
      const cases = trees.map((tree) => gameCaseOf({ id: newRecordId(now), projectId: made.id, name: "", now }, tree));
      if ((await addAnalysisCases(cases)) !== undefined) {
        await removeAnalysisProject(made.id);
        failed = t("analysisV2.case.problem");
      }
    }
    setCreating(false);
    if (failed !== null || made === undefined) {
      setCreateProblem(failed);
      return;
    }
    setChoosing(null);
    setDialog(null);
    navigate(projectPath(made.id));
  };

  /** The dialog's Create: a name alone, one game, or — several — the choice of which. */
  const createProject = async (name: string, file: File | undefined) => {
    setCreateProblem(null);
    if (file === undefined) {
      await makeProject(name, []);
      return;
    }
    const said = (problem: string) =>
      setCreateProblem(t(`analysisV2.newProject.problem.${FILE_PROBLEMS[problem] ?? "unreadable"}`));
    // The texts it holds: a .pgn's one, or each .pgn in a zip (as the Library reads one).
    let texts: { text: string; size: number; name: string; stem: string }[];
    try {
      if (isZipFile(file)) {
        const zipped = readCollectionZip(new Uint8Array(await file.arrayBuffer()));
        if (!zipped.ok) {
          said(zipped.problem);
          return;
        }
        texts = zipped.entries.map((entry) => ({ text: entry.text, size: entry.size, name: entry.path, stem: entry.stem }));
      } else {
        texts = [{ text: await file.text(), size: file.size, name: file.name, stem: file.name.replace(/\.pgn$/i, "") }];
      }
    } catch {
      said("file");
      return;
    }
    const read = texts.map(({ text, size, name: fileName, stem }) => collectionImportFileOf(text, size, fileName, stem));
    const games = read.flatMap(({ file: entry }) => entry.games);
    if (games.length === 0) {
      const [first] = read;
      said(first !== undefined && !first.reading.ok ? first.reading.problem : "unreadable");
      return;
    }
    if (games.length === 1) {
      await makeProject(name, games);
      return;
    }
    setChoosing({
      name,
      source: { name: file.name, size: file.size, zip: isZipFile(file), files: read.map(({ file: entry }) => entry) },
    });
  };

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
              {/* The picks' count and what they are for — the delete; select-all is the table header's, over the rows the words leave. */}
              {(folders.length > 0 || projects.length > 0) && (
                <SelectionBar
                  count={pickedCount}
                  countLabel={t("analysisV2.browser.selected", { count: pickedCount })}
                  onClear={() => setPicked(new Set())}
                  clearLabel={t("analysisV2.browser.clearSelected")}
                  actions={
                    <IconAction
                      label={t("analysisV2.browser.deleteSelected")}
                      disabled={pickedCount === 0}
                      color="error"
                      onClick={() => {
                        setDeleteProblem(null);
                        setAsked(deletion.counts);
                        setDeletingPicked(true);
                      }}
                      testId="analysis-v2-delete-picked"
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconAction>
                  }
                  testId="analysis-v2-picks"
                  rootTestId="analysis-v2-selection"
                />
              )}
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
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <ProjectsTable
            rows={walked}
            sort={{ column: table.sort, direction: table.direction }}
            onSort={table.sortBy}
            onToggle={toggleFolder}
            onToggleProject={toggleProject}
            folderLink={(folder) => ({ component: RouterLink, to: browserPath(folder.id) })}
            projectLink={(row) => ({ component: RouterLink, to: projectPath(row.id) })}
            caseLink={(row) => ({ component: RouterLink, to: casePath(row.projectId, row.id) })}
            onOpenCase={(row) => navigate(casePath(row.projectId, row.id))}
            onFolderAction={onFolderAction}
            onProjectAction={onProjectAction}
            picks={{ pickOf, selectAll }}
            paging={
              walked.length > TABLE_PAGE_SIZES[0]
                ? { page: table.page, rowsPerPage: table.rowsPerPage, onPageChange: table.setPage, onRowsPerPageChange: table.setRowsPerPage }
                : undefined
            }
            filters={
              folders.length > 0 || projects.length > 0 ? (
                <SearchField
                  label={t("analysisV2.browser.filter")}
                  value={text}
                  onChange={(value) => table.setParams({ q: value === "" ? null : value })}
                  clearLabel={t("analysisV2.browser.filterClear")}
                  testId="analysis-v2-filter"
                />
              ) : undefined
            }
            filtered={text.trim() !== ""}
            onClearFilter={() => table.setParams({ q: null })}
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

      {/* A new Project here: its name, and optionally a .pgn whose games become its Cases. */}
      <NewProjectDialog
        open={dialog?.kind === "newProject"}
        onClose={() => {
          setCreateProblem(null);
          setDialog(null);
        }}
        onCreate={(name, file) => void createProject(name, file)}
        busy={creating}
        problem={choosing === null ? createProblem : null}
        testId="analysis-v2-new-project-dialog"
      />
      {/* A file of several games: the Library's popup — what came in, the filters, the count — picks which. */}
      {choosing !== null && (
        <CollectionImportDialog
          source={choosing.source}
          choiceOnly={{ title: t("analysisV2.newProject.chooseTitle"), confirmLabel: t("analysisV2.newProject.chooseConfirm") }}
          problem={createProblem ?? undefined}
          onCancel={() => {
            setCreateProblem(null);
            setChoosing(null);
          }}
          onImport={(kept) => {
            // Each file's kept games, file by file, in file order — a Case each.
            const games = choosing.source.files.flatMap((file, index) =>
              (kept[index] ?? []).map((row) => file.games[row.number - 1]).filter((pgn): pgn is string => pgn !== undefined),
            );
            void makeProject(choosing.name, games);
          }}
          testId="analysis-v2-choose-games"
        />
      )}

      {/* A Project renamed, or duplicated under a name. */}
      <FolderNameDialog
        open={dialog?.kind === "renameProject" || dialog?.kind === "duplicateProject"}
        title={t(dialog?.kind === "duplicateProject" ? "analysisV2.project.duplicateTitle" : "analysisV2.project.renameTitle")}
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

      {/* The picks deleted together, asked first, saying how many of each go; a failure is said in the dialog and the picks stay. */}
      <DeleteManyDialog
        open={deletingPicked}
        onClose={() => setDeletingPicked(false)}
        onConfirm={() => void deletePicked()}
        title={t("analysisV2.browser.deleteManyTitle", { count: asked.folders + asked.projects + asked.cases })}
        message={t("analysisV2.browser.deleteManyMessage", { what: deleteWhat })}
        confirmLabel={t("analysisV2.browser.deleteConfirm")}
        cancelLabel={t("analysisV2.cancel")}
        error={deleteProblem ?? undefined}
        testId="analysis-v2-delete-many"
      />
    </>
  );
}

export default ProjectsBrowser;
