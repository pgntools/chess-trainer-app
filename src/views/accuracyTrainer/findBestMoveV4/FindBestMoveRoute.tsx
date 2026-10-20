import { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router";

import { InlineAlert } from "../../../design-system/components/feedback";
import { answerWordsOf } from "../../../lib/findBestMove/words";
import { casePath } from "../../analysisV2/paths";
import FindBestMove from "./FindBestMove";
import { FIND_BEST_MOVE_PATH } from "./paths";
import { useSessionCase } from "./useSessionCase";

const ID = "find-best-move-v4";

/**
 * **A Find Best Move session's route** — `…/find-best-move-v4/<caseId>`: the
 * session its Case holds, read from the Case's tags (`useSessionCase`, the
 * persistence unit; a new one is started from the lobby's form). The Cases
 * are read first (a reload lands here), then the screen mounts keyed by the
 * Case. A Case not there, one that is no session and one of an older
 * session (v3's — never converted) each say so, with the way on.
 */
function FindBestMoveRoute({ stepDelayMs }: { stepDelayMs?: number }) {
  const { caseId = "" } = useParams();
  // Keyed by the address: another session is a new arrival.
  return <SessionArrival key={caseId} caseId={caseId} {...(stepDelayMs === undefined ? {} : { stepDelayMs })} />;
}

function SessionArrival({ caseId, stepDelayMs }: { caseId: string; stepDelayMs?: number }) {
  const { t } = useTranslation();
  // The answers worded in the reader's language, for every write this screen makes (`t` is new when it changes).
  const words = useMemo(() => answerWordsOf(t), [t]);
  const { state, dispatch, writeProblem } = useSessionCase(caseId, words);

  if (state.kind === "loading") {
    return (
      <Typography variant="body2" role="status" data-testid={`${ID}-loading`} sx={{ p: 2, color: "text.secondary" }}>
        {t("accuracyTrainer.sessions.loading")}
      </Typography>
    );
  }
  if (state.kind === "missing") {
    return (
      <Box sx={{ p: 2, display: "grid", gap: 1, justifyItems: "start" }}>
        <InlineAlert severity="warning" testId={`${ID}-missing`}>
          {t("accuracyTrainer.sessions.missing")}
        </InlineAlert>
        <Button component={RouterLink} to={FIND_BEST_MOVE_PATH} variant="outlined" size="small">
          {t("accuracyTrainer.sessions.back")}
        </Button>
      </Box>
    );
  }
  if (state.kind !== "session") {
    return (
      <Box sx={{ p: 2, display: "grid", gap: 1, justifyItems: "start" }}>
        <InlineAlert severity="warning" testId={`${ID}-not-resumable`}>
          {t(state.kind === "older" ? "accuracyTrainer.sessions.olderSession" : "accuracyTrainer.sessions.notResumable")}
        </InlineAlert>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button component={RouterLink} to={casePath(state.caseRecord.projectId, state.caseRecord.id)} variant="outlined" size="small" data-testid={`${ID}-open-case`}>
            {t("accuracyTrainer.sessions.openCase")}
          </Button>
          <Button component={RouterLink} to={FIND_BEST_MOVE_PATH} size="small">
            {t("accuracyTrainer.sessions.back")}
          </Button>
        </Box>
      </Box>
    );
  }
  return (
    <FindBestMove
      caseRecord={state.caseRecord}
      record={state.record}
      issues={state.issues}
      dispatch={dispatch}
      words={words}
      writeFailed={writeProblem === "storage"}
      {...(stepDelayMs === undefined ? {} : { stepDelayMs })}
    />
  );
}

export default FindBestMoveRoute;
