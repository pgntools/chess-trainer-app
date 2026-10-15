import { useSyncExternalStore } from "react";

import { DevelopmentNoticeDialog } from "../../blocks/dialogs";
import { dismissDevelopmentNotice, isDevelopmentNoticeDismissed, subscribeToDevelopmentNotice } from "../../lib/developmentNotice";

/** The server has no browser storage and draws no dialog: the pre-render counts it dismissed. */
const dismissedOnTheServer = () => true;

/**
 * **The in-development notice, wired into the shell** (CTA-155): open from the
 * first render until the reader dismisses it, then closed for 30 days (CTA-210)
 * — a reload, another screen, a change of language, another tab and a restart
 * included, a dismissal in one open tab closing it in the others
 * (`lib/developmentNotice.ts`, `localStorage`). It reads the dismissal as an
 * external store whose server snapshot is "dismissed", so the pre-render
 * (`entry-server.tsx`) carries no dialog and the page's static markup is the
 * same for everyone.
 */
export function DevelopmentNotice() {
  const dismissed = useSyncExternalStore(subscribeToDevelopmentNotice, isDevelopmentNoticeDismissed, dismissedOnTheServer);
  return <DevelopmentNoticeDialog open={!dismissed} onDismiss={dismissDevelopmentNotice} testId="development-notice" />;
}
