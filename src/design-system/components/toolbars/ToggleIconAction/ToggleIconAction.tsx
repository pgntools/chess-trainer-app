import type { ReactNode } from "react";

import IconAction from "../IconAction/IconAction";

export type ToggleIconActionProps = {
  /** The tooltip and accessible name ("Save", "Save — 3 changes"). */
  label: string;
  /** The icon, `fontSize="small"`. */
  children: ReactNode;
  onClick: () => void;
  /** There is something for it to do (unsaved changes): primary and `aria-pressed`. */
  active: boolean;
  disabled?: boolean;
  testId: string;
};

/**
 * **The board header's Save** (CTA-108), and any action that lights up while
 * it has something to do: primary and `aria-pressed` while `active` (the
 * board is dirty), quiet otherwise. The Analysis Board, the Library's game and
 * the repertoire player each wrote it; this is the one.
 */
function ToggleIconAction({ label, children, onClick, active, disabled, testId }: ToggleIconActionProps) {
  return (
    <IconAction label={label} onClick={onClick} pressed={active} disabled={disabled} testId={testId}>
      {children}
    </IconAction>
  );
}

export default ToggleIconAction;
