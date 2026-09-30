import type { ReactNode } from "react";

import IconAction from "../IconAction/IconAction";

export type ToggleIconActionProps = {
  /** The tooltip and accessible name ("Save", "Save — 3 changes"). */
  label: string;
  /** The icon, `fontSize="small"`. */
  children: ReactNode;
  onClick: () => void;
  /** There is something for it to do (unsaved changes): primary — and, unless `pressed` says otherwise, `aria-pressed`. */
  active: boolean;
  /**
   * What `aria-pressed` says, when it is not `active` (CTA-113): the board
   * headers' Save lights up with a change but is pressed while its changes
   * strip is open; `null` when it opens a dialog rather than toggling
   * anything (no `aria-pressed`). Absent, `active`.
   */
  pressed?: boolean | null;
  disabled?: boolean;
  testId: string;
};

/**
 * **The board header's Save** (CTA-108), and any action that lights up while
 * it has something to do: primary while `active` (the board is dirty), quiet
 * otherwise, and `aria-pressed` for what it toggles. The Analysis Board, the
 * Library's game and the repertoire player each wrote it; this is the one.
 */
function ToggleIconAction({ label, children, onClick, active, pressed, disabled, testId }: ToggleIconActionProps) {
  return (
    <IconAction
      label={label}
      onClick={onClick}
      pressed={pressed === null ? undefined : (pressed ?? active)}
      color={active ? "primary" : undefined}
      disabled={disabled}
      testId={testId}
    >
      {children}
    </IconAction>
  );
}

export default ToggleIconAction;
