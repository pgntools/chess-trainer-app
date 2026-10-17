import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DriveFileMoveRoundedIcon from "@mui/icons-material/DriveFileMoveRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Link as RouterLink, useHref, useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { NewCaseDialog, ProjectPickerDialog, type NewCaseSpec } from "../../blocks/dialogs";
import { ProjectDetails, type ProjectDetailsTab } from "../../blocks/panels";
import { CasesTable, caseDisplayName, type CaseAction } from "../../blocks/tables";
import { visuallyHidden } from "../../design-system/components/a11y";
import { DeleteManyDialog, FormDialog } from "../../design-system/components/dialogs";
import { InlineAlert, useSnackbar } from "../../design-system/components/feedback";
import { SearchField, TextInputField } from "../../design-system/components/forms";
import { Breadcrumbs } from "../../design-system/components/navigation";
import { MissState } from "../../design-system/components/states";
import { TABLE_PAGE_SIZES, useTableUrlState } from "../../design-system/components/tables";
import { IconAction, ListScreenHeader, SelectionBar } from "../../design-system/components/toolbars";
import { CASE_COLUMNS, caseFirstDirection, caseRowOf, filteredCaseRows } from "../../lib/analysisCaseRows";
import {
  addAnalysisCases,
  duplicateAnalysisCase,
  moveAnalysisCaseInOrder,
  moveAnalysisCases,
  removeAnalysisCases,
  renameAnalysisCase,
} from "../../lib/analysisCaseStore";
import {
  casesInOrder,
  casesOf,
  gameCaseOf,
  positionCaseOfFen,
  positionCaseOfGame,
  projectFolderPath,
  type AnalysisCase,
  type AnalysisProject,
  type CaseOrderMove,
} from "../../lib/analysisProjects";
import { newRecordId } from "../../lib/recordId";
import { BoardLeftPanel } from "../main/boardLeftPanel";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { useShellCompact } from "../main/shellCompact";
import { browserPath, caseListContextOf, casePath, projectPath } from "./paths";
import { useAnalysisCases, useAnalysisProjects, useProjectFolders, useProjectPickerRows } from "./useAnalysisProjects";
import { useProjectCaseLimit } from "./useProjectCaseLimit";

/** The dialog open over the Cases, and the Case it is about — the picks' move is about the picks (CTA-226). */
type Dialog = { kind: "new" } | { kind: "movePicked" } | { kind: "rename" | "duplicate"; record: AnalysisCase };

/** Where a reorder takes the Case at `from` in a Project of `count` Cases. */
const placeAfter = (move: CaseOrderMove, from: number, count: number): number =>
  move === "up" ? from - 1 : move === "down" ? from + 1 : move === "top" ? 0 : count - 1;

/** A reorder action that is off where the Case now stands (the first never up) — the way it can still go, in turn. */
const FOCUS_FALLBACK: Record<CaseOrderMove, readonly CaseOrderMove[]> = {
  up: ["up", "top", "down", "bottom"],
  top: ["top", "up", "down", "bottom"],
  down: ["down", "bottom", "up", "top"],
  bottom: ["bottom", "down", "up", "top"],
};

/** A Case made of what the reader asked for in the new-Case dialog. */
const caseOfSpec = (spec: NewCaseSpec, projectId: string, now: Date): AnalysisCase => {
  const made = { id: newRecordId(now), projectId, name: spec.name, now };
  if (spec.type === "game") return gameCaseOf(made, spec.tree);
  return "fen" in spec ? positionCaseOfFen(made, spec.fen) : positionCaseOfGame(made, spec.tree, spec.nodeId);
};

/**
 * **A Project's Cases** (`/analysis/projects/<id>`, CTA-186) — a sortable,
 * paged table (`CasesTable`: the name, the type, a Game's columns off its
 * tags — blank for a Position — and when it changed; the sort and the page
 * in the URL), each row's name a link to its board, and **New
 * case** (`NewCaseDialog`: a Game or a Position, from a PGN or a FEN). A
 * Case is renamed (empty gives it back its derived name), duplicated into
 * this one or another (`ProjectPickerDialog`) and **moved in the Project's
 * order** (CTA-203) — the table opens sorted by it (`#`), and only so, with
 * no words, do the row's arrows reorder: the page follows the Case, the
 * focus stays on its action, and its new place is announced. Cases are
 * **moved to another Project** (CTA-226) and **deleted** by their boxes,
 * together — the move into a Project picked in the picker's table, said in a
 * snackbar; the delete asked first. A single new Case opens on its board; one
 * per game stays here, the list grown.
 *
 * The route waits for the stores' first read, then says a Project that is
 * not there. **Its header's title is the browser's whole trail** (CTA-207,
 * CTA-224): the top level, every folder down to the Project's, each a link
 * to the browser there, and the Project itself — the page's `h1`; no Back.
 *
 * **Its own panel, in the main menu's place** (CTA-213, `ProjectDetails` in
 * the shell's left panel, `keepShell`: the header and footer stay, as on the
 * Case view) — its Close the way back to the browser, at the folder holding
 * the Project (CTA-224); a frame for now: the Project's name, a General tab's
 * placeholder and an Options tab's example switch, held here and kept
 * nowhere. Under the shell's breakpoint it is a drawer, opened from the
 * header.
 */
function ProjectScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  /** A batch that would take the Project past its limit of Cases asks first (CTA-225). */
  const caseLimit = useProjectCaseLimit("analysis-v2-new-case-limit");
  useOwnPageHeading();
  const { projectId = "" } = useParams();
  const projects = useAnalysisProjects();
  const folders = useProjectFolders();
  const cases = useAnalysisCases();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [rename, setRename] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [createProblem, setCreateProblem] = useState<string | null>(null);
  /** The picked Cases' ids, and the bulk delete's confirmation (its failure said in it). */
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [deletingPicked, setDeletingPicked] = useState(false);
  const [deleteProblem, setDeleteProblem] = useState<string | null>(null);
  /** The picks' move (CTA-226): its write under way, and a refusal said in its dialog. */
  const [moving, setMoving] = useState(false);
  const [moveProblem, setMoveProblem] = useState<string | null>(null);
  // The picks the move was opened on — kept as it closes, so its title does not change under it.
  const [movingIds, setMovingIds] = useState<readonly string[]>([]);
  const { show } = useSnackbar();
  // The router's base, so the snackbar's link — outside the router — is a real href.
  const base = useHref("/");
  // Every Project with its folder path and its count of Cases, for the picker.
  const pickerRows = useProjectPickerRows(true);
  /** A reordered Case's action, focused once its row is on screen again (CTA-203), and its new place, announced. */
  const pendingFocus = useRef<{ id: string; move: CaseOrderMove } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");
  // The left panel (CTA-213): under the breakpoint a drawer; its open tab and its example switch, the screen's alone.
  const compact = useShellCompact();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<ProjectDetailsTab>("general");
  const [exampleOption, setExampleOption] = useState(false);
  // The words box, in the URL (`?q=`), as the saved analyses' table keeps it.
  const [searchParams] = useSearchParams();
  const text = searchParams.get("q") ?? "";

  const project: AnalysisProject | undefined = projects?.find((candidate) => candidate.id === projectId);
  const projectName = project === undefined ? undefined : project.name || t("analysisV2.project.untitled");
  usePageTitle(projectName);

  // The table's rows — each Case named as the reader reads it — and its sort and page, in the URL.
  const rows = useMemo(
    () => (cases === undefined ? [] : casesOf(cases, projectId).map((record) => caseRowOf(record, caseDisplayName(record, t)))),
    [cases, projectId, t],
  );
  const shown = useMemo(
    () => filteredCaseRows(rows, text, (type) => t(type === "game" ? "analysisV2.case.typeGame" : "analysisV2.case.typePosition")),
    [rows, text, t],
  );
  const table = useTableUrlState({
    columns: CASE_COLUMNS,
    defaultSort: "order",
    firstDirection: caseFirstDirection,
    count: shown.length,
  });
  // The picks still on this Project's Cases — a pick of a Case deleted or moved away is no pick.
  const pickedHere = useMemo(() => rows.filter((row) => picked.has(row.id)), [rows, picked]);

  // A reordered Case keeps the focus on its action — after the store's write and the page that follows it have rendered.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (pending === null || tableRef.current === null) return;
    const buttons = [...tableRef.current.querySelectorAll<HTMLButtonElement>("button[data-testid]")];
    for (const move of FOCUS_FALLBACK[pending.move]) {
      const button = buttons.find((candidate) => candidate.dataset.testid === `analysis-v2-cases-${move}-${pending.id}`);
      if (button === undefined) return;
      if (button.disabled) continue;
      button.focus();
      pendingFocus.current = null;
      return;
    }
  });

  if (projects === undefined || folders === undefined || cases === undefined) {
    return (
      <Typography data-testid="analysis-v2-loading" sx={{ color: "text.secondary", p: 2 }}>
        {t("analysisV2.loading")}
      </Typography>
    );
  }
  if (project === undefined || projectName === undefined) {
    return (
      <MissState
        backLabel={t("analysisV2.project.back")}
        backLink={{ component: RouterLink, to: browserPath(null) }}
        testId="analysis-v2-project-missing"
      >
        {t("analysisV2.project.missing")}
      </MissState>
    );
  }

  const caseProblem = t("analysisV2.case.problem");
  const done = (failed: boolean) => {
    setProblem(failed ? caseProblem : null);
    setDialog(null);
  };

  const reorder = async (move: CaseOrderMove, record: AnalysisCase) => {
    // The order is the Project's, not the page's: the page follows the Case.
    const line = casesInOrder(cases, project.id);
    const to = placeAfter(move, line.indexOf(record), line.length);
    pendingFocus.current = { id: record.id, move };
    const failed = await moveAnalysisCaseInOrder(record.id, move);
    setProblem(failed === undefined ? null : caseProblem);
    if (failed !== undefined) return;
    const page = Math.floor(to / table.rowsPerPage);
    if (page !== table.page) table.setPage(page);
    setAnnouncement(t("analysisV2.case.moved", { name: named(record), place: to + 1, count: line.length }));
  };

  const onCaseAction = (action: CaseAction, record: AnalysisCase) => {
    if (action === "up" || action === "down" || action === "top" || action === "bottom") {
      void reorder(action, record);
      return;
    }
    if (action === "rename") setRename(record.name);
    setDialog({ kind: action, record });
  };

  const write = async (made: AnalysisCase[]) => {
    setBusy(true);
    const failed = await addAnalysisCases(made);
    setBusy(false);
    if (failed !== undefined) {
      setCreateProblem(caseProblem);
      return;
    }
    setCreateProblem(null);
    setDialog(null);
    if (made.length === 1) navigate(casePath(project.id, made[0].id));
  };

  /**
   * New case's Create: the Cases made, then — past the Project's limit of
   * Cases (CTA-225) — asked first: a Library collection of the same games
   * instead (each Case's tree as PGN), the Cases anyway, or nothing.
   */
  const create = (specs: NewCaseSpec[]) => {
    const now = new Date();
    const made = specs.map((spec) => caseOfSpec(spec, project.id, now));
    caseLimit.check({
      existing: casesOf(cases, project.id).length,
      count: made.length,
      collectionName: projectName,
      games: () => made.map((record) => record.pgn),
      proceed: () => void write(made),
      onCollection: () => setDialog(null),
    });
  };

  const named = (record: AnalysisCase) => caseDisplayName(record, t);

  /** The picks into another Project, in one write — then the picks cleared and the move said; a refusal kept in the dialog. */
  const movePicked = async (ids: readonly string[], targetId: string) => {
    const target = projects.find((candidate) => candidate.id === targetId);
    if (target === undefined || ids.length === 0) return;
    setMoving(true);
    const failed = await moveAnalysisCases(ids, target.id);
    setMoving(false);
    if (failed !== undefined) {
      setMoveProblem(caseProblem);
      return;
    }
    setPicked(new Set());
    setDialog(null);
    const path = projectPath(target.id);
    show({
      severity: "success",
      duration: 10_000,
      testId: "analysis-v2-cases-moved-notice",
      action: {
        label: t("analysisV2.case.openProject"),
        onClick: () => navigate(path),
        href: base === "/" ? path : `${base}${path}`,
        testId: "analysis-v2-cases-moved-open",
      },
      message: t("analysisV2.case.movedPicked", { count: ids.length, project: target.name || t("analysisV2.project.untitled") }),
    });
  };
  // The folders above the Project, the top first — none for a Project at the top level or in a folder gone.
  const chain = project.folderId === null ? [] : projectFolderPath(folders, project.folderId);

  return (
    <>
      <Box data-testid="analysis-v2-project" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          // The whole trail in the title's place (CTA-224), the Project's name its current crumb and the page's h1.
          heading={
            // A little room between the trail and the shell's header above it.
            <Box sx={{ pt: 1 }}>
              <Breadcrumbs
                ariaLabel={t("analysisV2.browser.trail")}
                crumbs={[
                  { id: "root", label: t("analysisV2.browser.root"), link: { component: RouterLink, to: browserPath(null) } },
                  ...chain.map((folder) => ({
                    id: folder.id,
                    label: folder.name || t("analysisV2.folder.untitled"),
                    link: { component: RouterLink, to: browserPath(folder.id) },
                  })),
                ]}
                current={projectName}
                currentComponent="h1"
                testId="analysis-v2-project-trail"
              />
            </Box>
          }
          count={t("analysisV2.browser.caseCount", { count: rows.length })}
          wrap
          actions={
            <>
              {compact && (
                // Under the breakpoint the Project's panel is a drawer; wide, the column in the main menu's place.
                <IconAction
                  label={t("analysisV2.projectDetails.toggle")}
                  onClick={() => setDetailsOpen(true)}
                  popupOpen={detailsOpen}
                  popupKind="dialog"
                  testId="analysis-v2-project-details-toggle"
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconAction>
              )}
              <Button
                size="small"
                variant="contained"
                startIcon={<AddRoundedIcon fontSize="small" />}
                onClick={() => {
                  setCreateProblem(null);
                  setDialog({ kind: "new" });
                }}
                data-testid="analysis-v2-new-case"
              >
                {t("analysisV2.case.new")}
              </Button>
              {/* The picks' count and what they are for — the move and the delete; select-all is the table header's, over the rows the words leave. */}
              {rows.length > 0 && (
                <SelectionBar
                  count={pickedHere.length}
                  countLabel={t("analysisV2.case.selected", { count: pickedHere.length })}
                  onClear={() => setPicked(new Set())}
                  clearLabel={t("analysisV2.case.clearSelected")}
                  actions={
                    <>
                      {/* Into another Project — none to go to, off (CTA-226). */}
                      <IconAction
                        label={t("analysisV2.case.moveSelected")}
                        disabled={pickedHere.length === 0 || projects.length < 2}
                        onClick={() => {
                          setMoveProblem(null);
                          setMovingIds(pickedHere.map((row) => row.id));
                          setDialog({ kind: "movePicked" });
                        }}
                        popupOpen={dialog?.kind === "movePicked"}
                        popupKind="dialog"
                        testId="analysis-v2-cases-move-picked"
                      >
                        <DriveFileMoveRoundedIcon fontSize="small" />
                      </IconAction>
                      <IconAction
                        label={t("analysisV2.case.deleteSelected")}
                        disabled={pickedHere.length === 0}
                        color="error"
                        onClick={() => {
                          setDeleteProblem(null);
                          setDeletingPicked(true);
                        }}
                        testId="analysis-v2-cases-delete-picked"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconAction>
                    </>
                  }
                  testId="analysis-v2-cases"
                  rootTestId="analysis-v2-cases-selection"
                />
              )}
            </>
          }
          testId="analysis-v2-project-header"
        />
        {problem !== null && (
          <InlineAlert severity="error" testId="analysis-v2-problem">
            {problem}
          </InlineAlert>
        )}
        {/* A reorder's new place, heard (CTA-203). */}
        <Box role="status" sx={visuallyHidden} data-testid="analysis-v2-cases-moved">
          {announcement}
        </Box>
        <Box ref={tableRef} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <CasesTable
            rows={shown}
            sort={{ column: table.sort, direction: table.direction }}
            onSort={table.sortBy}
            paging={
              rows.length > TABLE_PAGE_SIZES[0]
                ? { page: table.page, rowsPerPage: table.rowsPerPage, onPageChange: table.setPage, onRowsPerPageChange: table.setRowsPerPage }
                : undefined
            }
            // The board lists the Project's Cases in this table's order, under its words.
            caseLink={(row) => ({ component: RouterLink, to: casePath(project.id, row.id, caseListContextOf(searchParams)) })}
            onCaseAction={onCaseAction}
            picked={picked}
            onPickedChange={setPicked}
            filters={
              rows.length > 0 ? (
                <SearchField
                  label={t("analysisV2.case.filter")}
                  value={text}
                  onChange={(value) => table.setParams({ q: value === "" ? null : value })}
                  clearLabel={t("analysisV2.case.filterClear")}
                  testId="analysis-v2-cases-filter"
                />
              ) : undefined
            }
            filtered={text.trim() !== ""}
            onClearFilter={() => table.setParams({ q: null })}
            testId="analysis-v2-cases"
          />
        </Box>
      </Box>

      <BoardLeftPanel
        collapsed={false}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        drawerLabel={t("analysisV2.projectDetails.label", { name: projectName })}
        keepShell
      >
        <ProjectDetails
          name={projectName}
          closeLink={{ component: RouterLink, to: browserPath(project.folderId) }}
          tab={detailsTab}
          onTabChange={setDetailsTab}
          exampleOption={exampleOption}
          onExampleOptionChange={setExampleOption}
          testId="analysis-v2-project-details"
        />
      </BoardLeftPanel>

      {/* Past the Project's limit of Cases (CTA-225), over New case. */}
      {caseLimit.dialog}

      <NewCaseDialog
        open={dialog?.kind === "new"}
        onClose={() => setDialog(null)}
        onCreate={create}
        busy={busy}
        problem={createProblem}
        testId="analysis-v2-new-case-dialog"
      />

      {/* A Case renamed — an empty name gives it back its derived one. */}
      <FormDialog
        open={dialog?.kind === "rename"}
        onClose={() => setDialog(null)}
        onSubmit={() => {
          if (dialog?.kind !== "rename") return;
          void renameAnalysisCase(dialog.record.id, rename).then((failed) => done(failed !== undefined));
        }}
        title={t("analysisV2.case.renameTitle")}
        submitLabel={t("analysisV2.save")}
        cancelLabel={t("analysisV2.cancel")}
        width="xs"
        testId="analysis-v2-case-rename"
      >
        <TextInputField
          label={t("analysisV2.case.name")}
          value={rename}
          onChange={setRename}
          dir="auto"
          helperText={t("analysisV2.case.nameHelp")}
          testId="analysis-v2-case-rename-name"
        />
      </FormDialog>

      {/* A Case duplicated into a Project — this one by default. */}
      <ProjectPickerDialog
        open={dialog?.kind === "duplicate"}
        title={t("analysisV2.case.duplicateTitle")}
        submitLabel={t("analysisV2.case.duplicate")}
        projects={pickerRows}
        current={project.id}
        initialName={
          dialog?.kind === "duplicate" ? t("analysisV2.case.copyName", { name: named(dialog.record) }) : undefined
        }
        onSubmit={(target, name) => {
          if (dialog?.kind === "duplicate") {
            void duplicateAnalysisCase(dialog.record.id, target, name).then((copy) => done(copy === undefined));
          }
        }}
        onClose={() => setDialog(null)}
        testId="analysis-v2-case-target"
      />

      {/* The picked Cases moved together into another Project (CTA-226) — no limit asked: a move is no new work. */}
      <ProjectPickerDialog
        open={dialog?.kind === "movePicked"}
        title={t("analysisV2.case.movePickedTitle", { count: movingIds.length })}
        submitLabel={t("analysisV2.case.move")}
        projects={pickerRows}
        current={project.id}
        excludeCurrent
        onSubmit={(target) => void movePicked(movingIds, target)}
        onClose={() => setDialog(null)}
        busy={moving}
        problem={moveProblem}
        testId="analysis-v2-cases-move-dialog"
      />

      {/* The picked Cases deleted together, asked first; a failure is said in the dialog and the picks stay. */}
      <DeleteManyDialog
        open={deletingPicked}
        onClose={() => setDeletingPicked(false)}
        onConfirm={() => {
          void removeAnalysisCases(pickedHere.map((row) => row.id)).then((failed) => {
            if (failed !== undefined) {
              setDeleteProblem(caseProblem);
              return;
            }
            setPicked(new Set());
            setDeletingPicked(false);
          });
        }}
        title={t("analysisV2.case.deleteManyTitle", { count: pickedHere.length })}
        message={t("analysisV2.case.deleteManyMessage")}
        confirmLabel={t("analysisV2.case.deleteConfirm")}
        cancelLabel={t("analysisV2.cancel")}
        error={deleteProblem ?? undefined}
        testId="analysis-v2-cases-delete-many"
      />
    </>
  );
}

export default ProjectScreen;
