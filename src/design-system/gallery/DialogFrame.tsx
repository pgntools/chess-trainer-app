import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import type { DialogProps } from "@mui/material/Dialog";

/** The modal props a dialog in a frame is opened with — see {@link DialogFrame}. */
export type FramedDialogProps = Pick<
  DialogProps,
  "container" | "disableEnforceFocus" | "disableAutoFocus" | "disableRestoreFocus" | "disableScrollLock"
>;

type DialogFrameProps = {
  /** Renders the dialog, open, with the frame's modal props spread into its `dialogProps`. */
  children: (dialogProps: FramedDialogProps) => ReactNode;
  /** The frame's height in pixels. */
  height?: number;
};

/**
 * **A dialog shown open inside the gallery's page** (CTA-108), rather than
 * over the whole window: the dialog is portalled into this box, whose
 * `transform` makes it the containing block of the modal's `position:
 * fixed` layers — so every variation of a section can be open at once, each
 * in its own frame, under the preview's theme, scheme and `dir`. None of
 * them traps focus, locks the page's scroll or takes focus on mount, so
 * several open frames never fight.
 *
 * Gallery-only: a screen opens its dialogs over the window as usual.
 */
function DialogFrame({ children, height = 320 }: DialogFrameProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <Box
      ref={setContainer}
      sx={{
        position: "relative",
        height,
        overflow: "hidden",
        transform: "translateZ(0)",
        borderRadius: 1,
        border: "1px dashed",
        borderColor: "divider",
      }}
    >
      {container !== null &&
        children({
          container,
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
          disableScrollLock: true,
        })}
    </Box>
  );
}

export default DialogFrame;
