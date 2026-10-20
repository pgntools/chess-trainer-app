import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import { FindBestMoveSessionsTable } from "../../../blocks/tables";
import { caseDisplayName } from "../../../blocks/tables";
import { DeleteManyDialog } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { LabelChip, useTableUrlState } from "../../../design-system/components/tables";
import { ListScreenHeader } from "../../../design-system/components/toolbars";
import { removeAnalysisCases } from "../../../lib/analysisCaseStore";
import {
  FIND_BEST_MOVE_SESSION_COLUMNS,
  findBestMoveSessionFirstDirection,
  findBestMoveSessionRowOf,
  type FindBestMoveSessionRow,
} from "../../../lib/findBestMove/rows";
import { sessionRecordOf } from "../../../lib/findBestMove/pgn";
import { sessionPgnOf, sessionProjectOf } from "../../../lib/findBestMove/store";
import { answerWordsOf } from "../../../lib/findBestMove/words";
import { readPgnTags } from "../../../lib/pgn";
import { downloadPgn } from "../../../lib/pgnExport";
import { casePath } from "../../analysisV2/paths";
import { useAnalysisCases, useAnalysisProjects } from "../../analysisV2/useAnalysisProjects";
import { useOwnPageHeading } from "../../main/pageTitle";
import { RightPanel } from "../../main/rightPanel";
import NewSessionForm from "./NewSessionForm";
import { sessionPath } from "./paths";

/**
 * **Find Best Move's sessions** (CTA-239; v4's since CTA-244) — `/accuracy-trainer/find-best-move-v4`,
 * dev-only with the rest of the trainer: every Case of the *Find Best Move*
 * project — each a session whose PGN holds it whole — as a table
 * (`FindBestMoveSessionsTable`: name, side, moves to find, progress, found,
 * status, updated; sortable, newest first, the sort and page the URL's,
 * `useTableUrlState`), each row resuming its session, opening its Case in
 * Analysis or downloading its PGN; the picks deleted together after one
 * confirmation (`DeleteManyDialog` → `removeAnalysisCases`, their unfinished
 * jobs with them). The right-hand panel is the **New session** form
 * (`NewSessionForm`), as the Lobby's is Play with Engine's new-game form. A
 * Case that is no session keeps its row, not resumable, and opens in
 * Analysis. The rows are read from the Cases'
 * tags (`lib/findBestMove/rows.ts`) on each change of the store; a download
 * projects a session from its record (`sessionPgnOf`), so it is current.
 */
function SessionsLobby() {
  useOwnPageHeading();
  const { t } = useTranslation();
  const projects = useAnalysisProjects();
  const cases = useAnalysisCases();
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const [downloadFailed, setDownloadFailed] = useState(false);

  const project = projects === undefined ? undefined : sessionProjectOf(projects, t("accuracyTrainer.session.projectName"));
  const records = useMemo(
    () => (project === undefined || cases === undefined ? [] : cases.filter((record) => record.projectId === project.id)),
    [project, cases],
  );
  const rows = useMemo<FindBestMoveSessionRow[]>(() => records.map((record) => findBestMoveSessionRowOf(record, caseDisplayName(record, t))), [records, t]);
  // A pick of a session deleted (here or in another tab) falls out.
  const shownPicks = useMemo(() => new Set([...picked].filter((id) => rows.some((row) => row.id === id))), [picked, rows]);

  const table = useTableUrlState({
    columns: FIND_BEST_MOVE_SESSION_COLUMNS,
    defaultSort: "updated",
    firstDirection: findBestMoveSessionFirstDirection,
    count: rows.length,
  });

  const download = (row: FindBestMoveSessionRow) => {
    const record = records.find((each) => each.id === row.id);
    if (record === undefined) return;
    const tags = readPgnTags(record.pgn);
    const session = sessionRecordOf(tags);
    // A session's file is projected from its record now; any other Case's is its PGN as kept.
    const pgn = session === undefined ? record.pgn : sessionPgnOf(session.record, tags, answerWordsOf(t));
    setDownloadFailed(!downloadPgn("find-best-move", [pgn]));
  };

  const remove = async () => {
    const answer = await removeAnalysisCases([...shownPicks]);
    if (answer !== undefined) {
      setProblem(t("accuracyTrainer.sessions.deleteProblem"));
      return;
    }
    setProblem(undefined);
    setPicked(new Set());
    setDeleting(false);
  };

  return (
    <Box data-testid="find-best-move-sessions" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <ListScreenHeader
        title={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            {t("accuracyTrainer.sessions.title")}
            <Box component="span" title={t("accuracyTrainer.experimentalHint")} sx={{ display: "inline-flex" }}>
              <LabelChip label={t("accuracyTrainer.experimental")} tone="info" testId="find-best-move-sessions-experimental" />
            </Box>
          </Box>
        }
        count={cases === undefined ? "" : t("accuracyTrainer.sessions.count", { count: rows.length })}
        actions={
          shownPicks.size > 0 ? (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
              onClick={() => setDeleting(true)}
              data-testid="find-best-move-sessions-delete-picked"
            >
              {t("accuracyTrainer.sessions.deletePicked", { count: shownPicks.size })}
            </Button>
          ) : undefined
        }
        testId="find-best-move-sessions-header"
      />
      {downloadFailed && (
        <InlineAlert severity="error" onClose={() => setDownloadFailed(false)} testId="find-best-move-sessions-download-problem">
          {t("accuracyTrainer.sessions.downloadProblem")}
        </InlineAlert>
      )}
      <FindBestMoveSessionsTable
        rows={rows}
        sort={{ column: table.sort, direction: table.direction }}
        onSort={table.sortBy}
        paging={{ page: table.page, rowsPerPage: table.rowsPerPage, onPageChange: table.setPage, onRowsPerPageChange: table.setRowsPerPage }}
        picked={shownPicks}
        onPickedChange={setPicked}
        sessionLink={(row) => ({ component: RouterLink, to: sessionPath(row.id) })}
        caseLink={(row) => ({ component: RouterLink, to: casePath(project?.id ?? "", row.id) })}
        onDownload={download}
        loading={projects === undefined || cases === undefined}
        testId="find-best-move-sessions-table"
      />
      <DeleteManyDialog
        open={deleting}
        onClose={() => {
          setDeleting(false);
          setProblem(undefined);
        }}
        onConfirm={() => void remove()}
        title={t("accuracyTrainer.sessions.confirmDelete.title", { count: shownPicks.size })}
        message={t("accuracyTrainer.sessions.confirmDelete.body", { count: shownPicks.size })}
        {...(problem === undefined ? {} : { error: problem })}
        confirmLabel={t("accuracyTrainer.sessions.confirmDelete.confirm")}
        cancelLabel={t("accuracyTrainer.sessions.confirmDelete.cancel")}
        testId="find-best-move-sessions-delete-dialog"
        confirmTestId="find-best-move-sessions-delete-confirm"
      />
      <RightPanel>
        <NewSessionForm />
      </RightPanel>
    </Box>
  );
}

export default SessionsLobby;
