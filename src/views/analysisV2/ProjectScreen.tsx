import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { NewCaseDialog, ProjectPickerDialog, type NewCaseSpec } from "../../blocks/dialogs";
import { CasesList, caseDisplayName, type CaseAction } from "../../blocks/lists";
import { ConfirmDialog, FormDialog } from "../../design-system/components/dialogs";
import { InlineAlert } from "../../design-system/components/feedback";
import { TextInputField } from "../../design-system/components/forms";
import { BackButton } from "../../design-system/components/navigation";
import { MissState } from "../../design-system/components/states";
import { ListScreenHeader } from "../../design-system/components/toolbars";
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
 * **A Project's Cases** (`/analysis/projects/<id>`, CTA-186) — each named,
 * its type and when it changed, a row to its board (`CasesList`), and **New
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

  const project: AnalysisProject | undefined = projects?.find((candidate) => candidate.id === projectId);
  const projectName = project === undefined ? undefined : project.name || t("analysisV2.project.untitled");
  usePageTitle(projectName);

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

  const here = casesOf(cases, project.id);
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
          count={t("analysisV2.browser.caseCount", { count: here.length })}
          wrap
          back={
            <BackButton
              label={t("analysisV2.project.back")}
              link={{ component: RouterLink, to: browserPath(project.folderId) }}
              testId="analysis-v2-project-back"
            />
          }
          actions={
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
          }
          testId="analysis-v2-project-header"
        />
        {problem !== null && (
          <InlineAlert severity="error" testId="analysis-v2-problem">
            {problem}
          </InlineAlert>
        )}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <CasesList
            cases={here}
            caseLink={(id) => ({ component: RouterLink, to: casePath(project.id, id) })}
            onCaseAction={onCaseAction}
            canMove={projects.length > 1}
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
