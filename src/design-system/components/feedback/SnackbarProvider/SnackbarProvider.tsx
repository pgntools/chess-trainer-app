import { useCallback, useMemo, useReducer, useRef, type ReactNode, type SyntheticEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar, { type SnackbarCloseReason } from "@mui/material/Snackbar";

import { SnackbarContext, type SnackbarMessage } from "./snackbarContext";
import { EMPTY_SNACKBAR_QUEUE, snackbarQueue } from "./snackbarQueue";

/** How long a snackbar stays when it does not say. */
const DEFAULT_DURATION_MS = 6000;

export type SnackbarProviderProps = {
  children: ReactNode;
  /** The snackbar's test id when a message names none; its parts are `-message` and `-action`. */
  testId?: string;
};

/**
 * **The one snackbar** (CTA-108), mounted once at the composition root, and
 * its queue, which `useSnackbar().show` feeds. The app had two looks — a
 * filled `Alert` with a button for 10 s, a plain message for 3 s — which are
 * now one component's `severity`, `action` and `duration`.
 *
 * - **One at a time, in order** (`snackbarQueue`): a message queued while
 *   one shows cuts it short; the next opens once the last has left.
 * - A click elsewhere on the page does not dismiss it (MUI's `clickaway`);
 *   Escape, its close button, its action and its timer do.
 * - **Announced by its weight** (CTA-111): an error or a warning as an
 *   `alert`, read at once; anything else — a plain message, a success, an
 *   info — as a `status`, read when the reader is idle, rather than MUI's
 *   `alert` for every one.
 */
function SnackbarProvider({ children, testId = "app-snackbar" }: SnackbarProviderProps) {
  const [{ active, open }, dispatch] = useReducer(snackbarQueue, EMPTY_SNACKBAR_QUEUE);
  const nextKey = useRef(0);

  const show = useCallback((message: SnackbarMessage) => {
    dispatch({ type: "show", message: { ...message, key: nextKey.current++ } });
  }, []);
  const close = useCallback((_event?: SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason !== "clickaway") dispatch({ type: "close" });
  }, []);
  const entered = useCallback(() => dispatch({ type: "entered" }), []);
  const exited = useCallback(() => dispatch({ type: "exited" }), []);

  const api = useMemo(() => ({ show }), [show]);
  const id = active?.testId ?? testId;
  const action = active?.action;
  const role = active?.severity === "error" || active?.severity === "warning" ? "alert" : "status";
  const actionButton =
    action === undefined ? undefined : (
      <Button
        color="inherit"
        size="small"
        data-testid={`${id}-action`}
        onClick={() => {
          action.onClick();
          close();
        }}
      >
        {action.label}
      </Button>
    );

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      {active !== undefined && (
        <Snackbar
          key={active.key}
          open={open}
          onClose={close}
          autoHideDuration={active.duration === undefined ? DEFAULT_DURATION_MS : active.duration}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          slotProps={{ transition: { onEnter: entered, onExited: exited }, content: { role } }}
          data-testid={id}
          {...(active.severity === undefined
            ? { message: <span data-testid={`${id}-message`}>{active.message}</span>, action: actionButton }
            : {
                children: (
                  <Alert
                    role={role}
                    severity={active.severity}
                    variant="filled"
                    onClose={action === undefined ? () => close() : undefined}
                    action={actionButton}
                    sx={{ width: "100%", alignItems: "center" }}
                  >
                    <span data-testid={`${id}-message`}>{active.message}</span>
                  </Alert>
                ),
              })}
        />
      )}
    </SnackbarContext.Provider>
  );
}

export default SnackbarProvider;
