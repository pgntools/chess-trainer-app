import Button from "@mui/material/Button";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";

import type { GalleryModule } from "../../../gallery/types";
import EmptyState from "./EmptyState";

const gallery: GalleryModule = {
  section: "states",
  title: "EmptyState",
  demos: [
    { name: "Words alone", render: () => <EmptyState testId="gallery-empty">No games match the filters.</EmptyState> },
    {
      name: "With an icon and an action",
      render: () => (
        <EmptyState
          icon={<FolderOpenOutlinedIcon />}
          action={
            <Button size="small" variant="contained">
              New analysis
            </Button>
          }
          testId="gallery-empty-action"
        >
          No saved analyses yet.
        </EmptyState>
      ),
    },
  ],
};

export default gallery;
