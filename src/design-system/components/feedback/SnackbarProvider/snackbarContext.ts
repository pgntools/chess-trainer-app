import { createContext, type ReactNode } from "react";
import type { AlertColor } from "@mui/material/Alert";

/** One snackbar: its words, and how it looks and behaves. */
export type SnackbarMessage = {
  message: ReactNode;
  /** A coloured, filled alert (success, error, …); absent, a plain dark bar. */
  severity?: AlertColor;
  /** One button in it — "Open", "Undo". Pressing it also closes the snackbar. */
  action?: { label: ReactNode; onClick: () => void };
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
