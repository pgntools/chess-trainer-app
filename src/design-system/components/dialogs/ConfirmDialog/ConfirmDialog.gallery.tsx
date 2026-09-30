import Typography from "@mui/material/Typography";

import DialogFrame from "../../../gallery/DialogFrame";
import type { GalleryModule } from "../../../gallery/types";
import ConfirmDialog, { type ConfirmDialogProps } from "./ConfirmDialog";

const noop = () => {};

/** One framed, open confirm with the demo's own props. */
const framed = (props: Partial<ConfirmDialogProps>, height = 240) => (
  <DialogFrame height={height}>
    {(dialogProps) => (
      <ConfirmDialog
        open
        onClose={noop}
        onConfirm={noop}
        title="Replay this game?"
        message="The moves played so far are discarded."
        confirmLabel="Replay"
        cancelLabel="Cancel"
        testId="gallery-confirm"
        dialogProps={dialogProps}
        {...props}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule = {
  section: "dialogs",
  title: "ConfirmDialog",
  demos: [
    { name: "Default tone, contained confirm", render: () => framed({}) },
    {
      name: "Destructive, contained",
      render: () =>
        framed({
          tone: "destructive",
          title: "Delete this folder?",
          message: "Its contents move up to its parent.",
          confirmLabel: "Delete",
          children: (
            <Typography variant="caption" color="text.secondary">
              3 games · 1 sub-folder
            </Typography>
          ),
        }, 260),
    },
    {
      name: "Destructive, text confirm",
      render: () =>
        framed({ tone: "destructive", confirmVariant: "text", title: "Resign?", message: "The game ends as a loss.", confirmLabel: "Resign" }),
    },
    {
      name: "The confirm under a screen's own test id (confirmTestId) — looks the same",
      render: () =>
        framed({ tone: "destructive", title: "Resign?", message: "The game ends as a loss.", confirmLabel: "Resign", confirmTestId: "gallery-confirm-ok" }),
    },
    {
      name: "Busy — carrying out the answer",
      render: () => framed({ tone: "destructive", busy: true, title: "Delete 12 games?", message: "This cannot be undone.", confirmLabel: "Delete" }),
    },
  ],
};

export default gallery;
