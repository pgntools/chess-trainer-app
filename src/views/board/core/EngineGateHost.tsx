import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { EngineJobRunningDialog } from "../../../blocks/dialogs";
import { useSnackbar } from "../../../design-system/components/feedback";
import { jobTitleOf } from "../../jobs/jobViews";
import { subscribeEngineSwitchedOff, useEngineGateRequest } from "./useEngineGate";

/**
 * **The engine gate, drawn once for the page** (CTA-237) — what the shell
 * (`views/main/Layout.tsx`) mounts beside the jobs runtime's starter: the
 * question a board asks before its engine goes on while an engine job runs
 * (`EngineJobRunningDialog`), and the snackbar when a job starting switched
 * a board's engine off. The gate itself is `useEngineGate`, in every board's
 * session; nothing here decides anything.
 */
function EngineGateHost() {
  const { t } = useTranslation();
  const { show } = useSnackbar();
  const request = useEngineGateRequest();

  useEffect(
    () =>
      subscribeEngineSwitchedOff((job) =>
        show({
          message: t("engineGate.switchedOff", { title: jobTitleOf(t, job) }),
          testId: "engine-gate-switched-off",
        }),
      ),
    [show, t],
  );

  if (request === null) return null;
  return (
    <EngineJobRunningDialog
      open
      jobTitle={jobTitleOf(t, request.job)}
      onPause={request.pause}
      onWait={request.wait}
      testId="engine-gate"
    />
  );
}

export default EngineGateHost;
