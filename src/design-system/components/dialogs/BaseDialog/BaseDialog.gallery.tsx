import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import DialogFrame from "../../../gallery/DialogFrame";
import type { GalleryModule } from "../../../gallery/types";
import BaseDialog from "./BaseDialog";

const noop = () => {};

const gallery: GalleryModule = {
  section: "dialogs",
  title: "BaseDialog",
  demos: [
    {
      name: "Default — xs, full width",
      render: () => (
        <DialogFrame>
          {(dialogProps) => (
            <BaseDialog
              open
              onClose={noop}
              testId="gallery-base-dialog"
              title="Rename folder"
              actions={<Button onClick={noop}>Close</Button>}
              dialogProps={dialogProps}
            >
              <Typography variant="body2">A body of any content, under the title.</Typography>
            </BaseDialog>
          )}
        </DialogFrame>
      ),
    },
    {
      name: "Width sm, with dividers",
      render: () => (
        <DialogFrame height={360}>
          {(dialogProps) => (
            <BaseDialog
              open
              onClose={noop}
              width="sm"
              dividers
              testId="gallery-base-dialog-sm"
              title="Import"
              actions={<Button onClick={noop}>Close</Button>}
              dialogProps={dialogProps}
            >
              {Array.from({ length: 8 }, (_, index) => (
                <Typography key={index} variant="body2">
                  A longer body line {index + 1}, scrolling between the rules.
                </Typography>
              ))}
            </BaseDialog>
          )}
        </DialogFrame>
      ),
    },
    {
      name: "Width full — a workspace, the window's width",
      render: () => (
        <DialogFrame height={260}>
          {(dialogProps) => (
            <BaseDialog
              open
              onClose={noop}
              width="full"
              testId="gallery-base-dialog-full"
              title="Add PGN"
              actions={<Button onClick={noop}>Close</Button>}
              dialogProps={dialogProps}
            >
              <Typography variant="body2">As wide as the window, less a margin — narrower on a phone.</Typography>
            </BaseDialog>
          )}
        </DialogFrame>
      ),
    },
    {
      name: "Sized to the content (fullWidth off), no actions",
      render: () => (
        <DialogFrame height={220}>
          {(dialogProps) => (
            <BaseDialog
              open
              onClose={noop}
              fullWidth={false}
              testId="gallery-base-dialog-narrow"
              title="Copied"
              dialogProps={dialogProps}
            >
              <Typography variant="body2">Escape or the backdrop closes it.</Typography>
            </BaseDialog>
          )}
        </DialogFrame>
      ),
    },
  ],
};

export default gallery;
