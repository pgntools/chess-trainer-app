import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router";

import { InlineAlert } from "../../../design-system/components/feedback";
import { analysisCasesSnapshot, loadAnalysisCases } from "../../../lib/analysisCaseStore";
import { useStoreRead } from "../../shared/useStoreRead";
import FindBestMoveV3 from "./FindBestMoveV3";
import { FIND_BEST_MOVE_V3_PATH, NEW_SESSION_ID } from "./paths";

const isRead = () => analysisCasesSnapshot() !== undefined;

/**
 * **A Find Best Move session's route** (CTA-239) — `…/find-best-move-v3/<caseId>`:
 * `new` the setup of a new session, else the session whose Case that is,
 * resumed from its PGN. The Cases are read first (a reload lands here), then
 * the screen mounts keyed by the Case — another session is a new screen, the
 * Case read once as it mounts. A Case that is not there says so, with the way
 * back to the lobby.
 */
function FindBestMoveV3Route({ stepDelayMs }: { stepDelayMs?: number }) {
  const { caseId = NEW_SESSION_ID } = useParams();
  // Keyed by the address: Start's step from `new` to its Case is a new arrival, its read waited for afresh.
  return <SessionArrival key={caseId} caseId={caseId} {...(stepDelayMs === undefined ? {} : { stepDelayMs })} />;
}

function SessionArrival({ caseId, stepDelayMs }: { caseId: string; stepDelayMs?: number }) {
  const { t } = useTranslation();
  const creating = caseId === NEW_SESSION_ID;
  const ready = useStoreRead(!creating, isRead, loadAnalysisCases);
  const delay = stepDelayMs === undefined ? {} : { stepDelayMs };

  if (creating) return <FindBestMoveV3 {...delay} />;
  if (!ready) {
    return (
      <Typography variant="body2" role="status" data-testid="find-best-move-v3-loading" sx={{ p: 2, color: "text.secondary" }}>
        {t("accuracyTrainer.sessions.loading")}
      </Typography>
    );
  }
  const record = analysisCasesSnapshot()?.find((each) => each.id === caseId);
  if (record === undefined) {
    return (
      <Box sx={{ p: 2, display: "grid", gap: 1, justifyItems: "start" }}>
        <InlineAlert severity="warning" testId="find-best-move-v3-missing">
          {t("accuracyTrainer.sessions.missing")}
        </InlineAlert>
        <Button component={RouterLink} to={FIND_BEST_MOVE_V3_PATH} variant="outlined" size="small">
          {t("accuracyTrainer.sessions.back")}
        </Button>
      </Box>
    );
  }
  return <FindBestMoveV3 resume={record} {...delay} />;
}

export default FindBestMoveV3Route;
