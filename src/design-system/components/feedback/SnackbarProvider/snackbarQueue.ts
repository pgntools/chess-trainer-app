import type { SnackbarMessage } from "./snackbarContext";

/** A queued message, keyed so each mounts a snackbar of its own. */
export type QueuedSnackbar = SnackbarMessage & { key: number };

/**
 * The queue: the message on screen (`active` — `open` while it shows,
 * `false` while it leaves; `entered` once its transition has begun to
 * come in; `cut` when a newer message is waiting to cut it short) and
 * those waiting behind it.
 */
export type SnackbarQueue = {
  active: QueuedSnackbar | undefined;
  open: boolean;
  entered: boolean;
  cut: boolean;
  pending: QueuedSnackbar[];
};

export type SnackbarQueueAction =
  | { type: "show"; message: QueuedSnackbar }
  | { type: "entered" }
  | { type: "close" }
  | { type: "exited" };

export const EMPTY_SNACKBAR_QUEUE: SnackbarQueue = { active: undefined, open: false, entered: false, cut: false, pending: [] };

const showing = (message: QueuedSnackbar | undefined, pending: QueuedSnackbar[]): SnackbarQueue => ({
  active: message,
  open: message !== undefined,
  entered: false,
  cut: false,
  pending,
});

/**
 * **The snackbar queue's rules** (CTA-108), pure:
 *
 * - With nothing on screen, a message shows at once.
 * - A message arriving while one shows **cuts it short** and waits for it to
 *   leave; arriving while one leaves, it waits its turn.
 * - When the one on screen has left (`exited`, its transition's end), the
 *   next shows.
 * - A message is cut short **only once it has entered**: one that is closed
 *   before it has ever been drawn open would never run its exit, and the
 *   queue would stall behind it. So a message arriving in the same moment as
 *   another marks it `cut`, and it closes as soon as it has come in.
 */
export const snackbarQueue = (state: SnackbarQueue, action: SnackbarQueueAction): SnackbarQueue => {
  switch (action.type) {
    case "show": {
      if (state.active === undefined) return showing(action.message, state.pending);
      const pending = [...state.pending, action.message];
      return state.entered ? { ...state, open: false, pending } : { ...state, cut: true, pending };
    }
    case "entered":
      return state.active === undefined ? state : { ...state, entered: true, open: state.open && !state.cut };
    case "close":
      return state.active === undefined || !state.open ? state : { ...state, open: false };
    case "exited": {
      const [next, ...rest] = state.pending;
      return showing(next, rest);
    }
  }
};
