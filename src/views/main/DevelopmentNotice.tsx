import { useSyncExternalStore } from "react";

import { DevelopmentNoticeDialog } from "../../blocks/dialogs";
import { dismissDevelopmentNotice, isDevelopmentNoticeDismissed, subscribeToDevelopmentNotice } from "../../lib/developmentNotice";

/** The server has no session and draws no dialog: the pre-render counts it dismissed. */
const dismissedOnTheServer = () => true;

/**
 * **The in-development notice, wired into the shell** (CTA-155): open from the
 * first render of a session until the reader dismisses it, then closed for the
 * session — a reload, another screen and a change of language included
 * (`lib/developmentNotice.ts`, `sessionStorage`). It reads the dismissal as an
 * external store whose server snapshot is "dismissed", so the pre-render
 * (`entry-server.tsx`) carries no dialog and the page's static markup is the
 * same for everyone.
 */
export function DevelopmentNotice() {
  const dismissed = useSyncExternalStore(subscribeToDevelopmentNotice, isDevelopmentNoticeDismissed, dismissedOnTheServer);
  return <DevelopmentNoticeDialog open={!dismissed} onDismiss={dismissDevelopmentNotice} testId="development-notice" />;
}
