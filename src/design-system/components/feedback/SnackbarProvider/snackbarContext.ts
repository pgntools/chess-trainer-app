import { createContext, type ReactNode } from "react";
import type { AlertColor } from "@mui/material/Alert";

/** One snackbar: its words, and how it looks and behaves. */
export type SnackbarMessage = {
  message: ReactNode;
  /** A coloured, filled alert (success, error, …); absent, a plain dark bar. */
  severity?: AlertColor;
  /**
   * One button in it — "Open", "Undo". Pressing it also closes the snackbar.
   * With an `href` (CTA-113) it is a real link — a middle click or a new tab
   * follows it — and a plain click runs `onClick` instead (a router's
   * `navigate`: the snackbar sits outside the router, so it takes no
   * router link). `testId` keeps the id a screen's tests know it by.
   */
  action?: { label: ReactNode; onClick: () => void; href?: string; testId?: string };
  /** How long it stays, in ms; `null` stays until dismissed. Default: 6000. */
  duration?: number | null;
  /** Its own test id, so a screen keeps the one its tests know; default the provider's. */
  testId?: string;
};

export type SnackbarApi = {
  /** Queue a snackbar. A newer one cuts the one on screen short; each shows in turn. */
  show: (message: SnackbarMessage) => void;
};

/** The provider's queue — `null` outside one, which `useSnackbar` refuses. */
export const SnackbarContext = createContext<SnackbarApi | null>(null);
