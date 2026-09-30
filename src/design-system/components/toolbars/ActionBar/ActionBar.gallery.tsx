import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import LastPageRoundedIcon from "@mui/icons-material/LastPageRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import ZoomOutRoundedIcon from "@mui/icons-material/ZoomOutRounded";

import type { GalleryModule } from "../../../gallery/types";
import IconAction from "../IconAction/IconAction";
import ActionBar from "./ActionBar";

const noop = () => {};

const gallery: GalleryModule = {
  section: "toolbars",
  title: "ActionBar",
  demos: [
    {
      name: "Divider on top, the last action pushed to the end (a board's controls)",
      render: () => (
        <ActionBar divider="top" dense ariaLabel="Board controls" testId="gallery-action-bar">
          <IconAction label="First" onClick={noop} testId="gallery-bar-first">
            <FirstPageRoundedIcon fontSize="small" />
          </IconAction>
          <IconAction label="Last" onClick={noop} testId="gallery-bar-last">
            <LastPageRoundedIcon fontSize="small" />
          </IconAction>
          <Box sx={{ marginInlineStart: "auto" }}>
            <IconAction label="Flip" onClick={noop} testId="gallery-bar-flip">
              <SwapVertRoundedIcon fontSize="small" />
            </IconAction>
          </Box>
        </ActionBar>
      ),
    },
    {
      name: "Divider below, dense icons (a map's toolbar)",
      render: () => (
        <ActionBar divider="bottom" dense testId="gallery-action-bar-map">
          <IconAction label="Zoom out" onClick={noop} testId="gallery-bar-zoom-out">
            <ZoomOutRoundedIcon fontSize="small" />
          </IconAction>
          <IconAction label="Zoom in" onClick={noop} testId="gallery-bar-zoom-in">
            <ZoomInRoundedIcon fontSize="small" />
          </IconAction>
        </ActionBar>
      ),
    },
    {
      name: "Buttons at the end, no divider",
      render: () => (
        <ActionBar justify="end" testId="gallery-action-bar-end">
          <Button size="small">Discard</Button>
          <Button size="small" variant="contained">
            Update
          </Button>
        </ActionBar>
      ),
    },
    {
      name: "Spread apart",
      render: () => (
        <ActionBar justify="space-between" testId="gallery-action-bar-spread">
          <Button size="small">Previous</Button>
          <Button size="small">Next</Button>
        </ActionBar>
      ),
    },
  ],
};

export default gallery;
