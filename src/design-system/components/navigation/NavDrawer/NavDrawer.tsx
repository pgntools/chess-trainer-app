import type { ReactNode } from "react";
import Drawer from "@mui/material/Drawer";
import type { PaperProps } from "@mui/material/Paper";

export type NavDrawerProps = {
  /** Whether the sheet is on screen. Closed, nothing of it is in the DOM. */
  open: boolean;
  /** Asked for by Escape, by the backdrop, and by whatever the caller wires (a navigation). */
  onClose: () => void;
  /** Its accessible name — a modal dialog must have one, so it is required. */
  label: string;
  /** What the sheet holds: a navigation tree, a filter panel. */
  children: ReactNode;
  /** The sheet's width in pixels; it never takes more than most of a narrow window. */
  width?: number;
  /** The sheet's DOM id, so whatever opens it can point at it. */
  id?: string;
  /** The sheet's test id; the surface behind it is `<testId>-root`. */
  testId: string;
};

/**
 * **A navigation sheet** (CTA-118): what a rail becomes under a narrow
 * window — a temporary drawer off the start edge of the window, over a
 * backdrop.
 *
 * Accessible (CTA-111): it is a modal `dialog` with a **required** name, it
 * keeps the focus while it is open and hands it back to its opener when it
 * closes, and Escape and the backdrop both close it. It never takes the whole
 * window, so the backdrop is always there to dismiss it by.
 *
 * `anchor="left"` is the *logical* start edge: MUI reads the theme's
 * direction and opens the sheet from the right under RTL, which is why no
 * direction is written here.
 */
function NavDrawer({ open, onClose, label, children, width = 280, id, testId }: NavDrawerProps) {
  /*
    The sheet itself. Written as an object and asserted rather than inline:
    React's typed prop objects take no `data-*` key in a literal — only JSX
    does — and the sheet, not the surface behind it, is what a test reaches for.
  */
  const paper = {
    id,
    role: "dialog",
    "aria-modal": true,
    "aria-label": label,
    "data-testid": testId,
    sx: { width, maxWidth: "85vw", display: "flex", flexDirection: "column" },
  } as PaperProps;

  return (
    <Drawer open={open} onClose={onClose} anchor="left" data-testid={`${testId}-root`} slotProps={{ paper }}>
      {children}
    </Drawer>
  );
}

export default NavDrawer;
