import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import IconAction from "./IconAction";

const row = (children: ReactNode) => <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>{children}</Box>;

const gallery: GalleryModule = {
  section: "toolbars",
  title: "IconAction",
  demos: [
    {
      name: "Default and error colour",
      render: () =>
        row(
          <>
            <IconAction label="Download" testId="gallery-icon-download">
              <DownloadRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction label="Delete" color="error" testId="gallery-icon-delete">
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconAction>
          </>,
        ),
    },
    {
      name: "Disabled — its tooltip still opens",
      render: () =>
        row(
          <IconAction label="Download (nothing to download)" disabled testId="gallery-icon-disabled">
            <DownloadRoundedIcon fontSize="small" />
          </IconAction>,
        ),
    },
    {
      name: "Toggle — aria-pressed, primary while pressed",
      render: () => (
        <WithState initial={true}>
          {(pressed, setPressed) =>
            row(
              <IconAction label="Show moves" pressed={pressed} onClick={() => setPressed(!pressed)} testId="gallery-icon-toggle">
                <VisibilityRoundedIcon fontSize="small" />
              </IconAction>,
            )
          }
        </WithState>
      ),
    },
    {
      name: "A link (href)",
      render: () =>
        row(
          <IconAction label="Open the docs" link={{ href: "#icon-action" }} testId="gallery-icon-link">
            <LinkRoundedIcon fontSize="small" />
          </IconAction>,
        ),
    },
  ],
};

export default gallery;
