import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";

import DialogFrame from "../../../gallery/DialogFrame";
import type { GalleryModule } from "../../../gallery/types";
import FullScreenDialog from "./FullScreenDialog";

const noop = () => {};

const body = (
  <Box sx={{ flex: 1, display: "grid", placeItems: "center", bgcolor: "background.default" }}>
    <Typography variant="body2" color="text.secondary">
      The body fills the rest of the window.
    </Typography>
  </Box>
);

const gallery: GalleryModule = {
  section: "dialogs",
  title: "FullScreenDialog",
  demos: [
    {
      name: "Default — a title and the close button",
      render: () => (
        <DialogFrame height={260}>
          {(dialogProps) => (
            <FullScreenDialog open onClose={noop} title="Map" closeLabel="Close" testId="gallery-full" dialogProps={dialogProps}>
              {body}
            </FullScreenDialog>
          )}
        </DialogFrame>
      ),
    },
    {
      name: "With header actions",
      render: () => (
        <DialogFrame height={260}>
          {(dialogProps) => (
            <FullScreenDialog
              open
              onClose={noop}
              title="Map — 1.e4 c5 2.Nf3 d6, the Najdorf and its side lines"
              closeLabel="Close"
              testId="gallery-full-actions"
              actions={
                <IconButton size="small" aria-label="Zoom in">
                  <ZoomInRoundedIcon fontSize="small" />
                </IconButton>
              }
              dialogProps={dialogProps}
            >
              {body}
            </FullScreenDialog>
          )}
        </DialogFrame>
      ),
    },
  ],
};

export default gallery;
