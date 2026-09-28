import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import ProgressLine from "./ProgressLine";

const gallery: GalleryModule = {
  section: "states",
  title: "ProgressLine",
  demos: [
    {
      name: "Determinate, primary",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <ProgressLine value={42} caption="Writing 420 of 1,000 games…" testId="gallery-progress-line" />
        </Box>
      ),
    },
    {
      name: "Success — a coverage bar",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <ProgressLine value={76} color="success" caption="76% of the lines learnt" testId="gallery-progress-line-success" />
        </Box>
      ),
    },
    {
      name: "Indeterminate, no caption",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <ProgressLine testId="gallery-progress-line-indeterminate" />
        </Box>
      ),
    },
  ],
};

export default gallery;
