import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import AccuracySessionReport from "./AccuracySessionReport";
import { EMPTY, ROWS, SUMMARY } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "AccuracySessionReport",
  demos: [
    {
      name: "Three positions graded, one still to answer",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <AccuracySessionReport summary={SUMMARY} rows={ROWS} onOpen={() => {}} testId="gallery-accuracy-report" />
        </Box>
      ),
    },
    {
      name: "Nothing graded yet",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <AccuracySessionReport summary={EMPTY} rows={[]} onOpen={() => {}} testId="gallery-accuracy-report-empty" />
        </Box>
      ),
    },
  ],
};

export default gallery;
