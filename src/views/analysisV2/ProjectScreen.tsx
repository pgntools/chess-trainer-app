import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { NewCaseDialog, ProjectPickerDialog, type NewCaseSpec } from "../../blocks/dialogs";
import { CasesTable, caseDisplayName, type CaseAction } from "../../blocks/tables";
import { ConfirmDialog, DeleteManyDialog, FormDialog } from "../../design-system/components/dialogs";
import { InlineAlert } from "../../design-system/components/feedback";
import { SearchField, TextInputField } from "../../design-system/components/forms";
import { BackButton } from "../../design-system/components/navigation";
import { MissState } from "../../design-system/components/states";
import { TABLE_PAGE_SIZES, useTableUrlState } from "../../design-system/components/tables";
import { IconAction, ListScreenHeader, SelectionBar } from "../../design-system/components/toolbars";
import { CASE_COLUMNS, caseFirstDirection, caseRowOf, filteredCaseRows } from "../../lib/analysisCaseRows";
import {
  addAnalysisCases,
  duplicateAnalysisCase,
  moveAnalysisCase,
  removeAnalysisCases,
  renameAnalysisCase,
} from "../../lib/analysisCaseStore";
import {
  casesOf,
  gameCaseOf,
  positionCaseOfFen,
  positionCaseOfGame,
  type AnalysisCase,
  type AnalysisProject,
} from "../../lib/analysisProjects";
import { newRecordId } from "../../lib/recordId";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { browserPath, casePath } from "./paths";
import { useAnalysisCases, useAnalysisProjects } from "./useAnalysisProjects";

/** The dialog open over the Cases, and the Case it is about. */
type Dialog = { kind: "new" } | { kind: "rename" | "move" | "duplicate" | "delete"; record: AnalysisCase };

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
 * Case is renamed (empty gives it back its derived name), moved to another
 * Project, duplicated into this one or another (`ProjectPickerDialog`), and
 * deleted after a confirmation. A single new Case opens on its board; one
 * per game stays here, the list grown.
 *
 * The route waits for the stores' first read, then says a Project that is
 * not there. Dev-only while the module is built.
 */
function ProjectScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useOwnPageHeading();
  const { projectId = "" } = useParams();
  const projects = useAnalysisProjects();
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
    defaultSort: "updated",
    firstDirection: caseFirstDirection,
    count: shown.length,
  });
  // The picks still on this Project's Cases — a pick of a Case deleted or moved away is no pick.
  const pickedHere = useMemo(() => rows.filter((row) => picked.has(row.id)), [rows, picked]);

  if (projects === undefined || cases === undefined) {
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

  const onCaseAction = (action: CaseAction, record: AnalysisCase) => {
    if (action === "rename") setRename(record.name);
    setDialog({ kind: action, record });
  };

  const create = async (specs: NewCaseSpec[]) => {
    setBusy(true);
    const now = new Date();
    const made = specs.map((spec) => caseOfSpec(spec, project.id, now));
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

  const named = (record: AnalysisCase) => caseDisplayName(record, t);

  return (
    <>
      <Box data-testid="analysis-v2-project" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={projectName}
          titleDir="auto"
          count={t("analysisV2.browser.caseCount", { count: rows.length })}
          wrap
          back={
            <BackButton
              label={t("analysisV2.project.back")}
              link={{ component: RouterLink, to: browserPath(project.folderId) }}
              testId="analysis-v2-project-back"
            />
          }
          actions={
            <>
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
              {/* The picks' count and what they are for — the delete; select-all is the table header's, over the rows the words leave. */}
              {rows.length > 0 && (
                <SelectionBar
                  count={pickedHere.length}
                  countLabel={t("analysisV2.case.selected", { count: pickedHere.length })}
                  onClear={() => setPicked(new Set())}
                  clearLabel={t("analysisV2.case.clearSelected")}
                  actions={
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
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <CasesTable
            rows={shown}
            sort={{ column: table.sort, direction: table.direction }}
            onSort={table.sortBy}
            paging={
              rows.length > TABLE_PAGE_SIZES[0]
                ? { page: table.page, rowsPerPage: table.rowsPerPage, onPageChange: table.setPage, onRowsPerPageChange: table.setRowsPerPage }
                : undefined
            }
            caseLink={(row) => ({ component: RouterLink, to: casePath(project.id, row.id) })}
            onCaseAction={onCaseAction}
            canMove={projects.length > 1}
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

      <NewCaseDialog
        open={dialog?.kind === "new"}
        onClose={() => setDialog(null)}
        onCreate={(specs) => void create(specs)}
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

      {/* Moved to another Project, or duplicated into one — this one by default. */}
      <ProjectPickerDialog
        open={dialog?.kind === "move" || dialog?.kind === "duplicate"}
        title={t(dialog?.kind === "move" ? "analysisV2.case.moveTitle" : "analysisV2.case.duplicateTitle")}
        submitLabel={t(dialog?.kind === "move" ? "analysisV2.case.move" : "analysisV2.case.duplicate")}
        projects={projects}
        current={project.id}
        excludeCurrent={dialog?.kind === "move"}
        initialName={
          dialog?.kind === "duplicate" ? t("analysisV2.case.copyName", { name: named(dialog.record) }) : undefined
        }
        onSubmit={(target, name) => {
          if (dialog?.kind === "move") {
            void moveAnalysisCase(dialog.record.id, target).then((failed) => done(failed !== undefined));
          } else if (dialog?.kind === "duplicate") {
            void duplicateAnalysisCase(dialog.record.id, target, name).then((copy) => done(copy === undefined));
          }
        }}
        onClose={() => setDialog(null)}
        testId="analysis-v2-case-target"
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

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== "delete") return;
          void removeAnalysisCases([dialog.record.id]).then((failed) => done(failed !== undefined));
        }}
        title={dialog?.kind === "delete" ? t("analysisV2.case.deleteTitle", { name: named(dialog.record) }) : ""}
        message={t("analysisV2.case.deleteMessage")}
        confirmLabel={t("analysisV2.case.deleteConfirm")}
        cancelLabel={t("analysisV2.cancel")}
        tone="destructive"
        testId="analysis-v2-case-delete"
      />
    </>
  );
}

export default ProjectScreen;
