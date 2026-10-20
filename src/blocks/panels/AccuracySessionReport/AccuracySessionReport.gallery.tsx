import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import AccuracySessionReport from "./AccuracySessionReport";
import { EMPTY, EMPTY_MATERIAL, MATERIAL, ROWS, SUMMARY } from "./fixtures";

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
      name: "With the achievements — the material per category and each piece counted",
      render: () => (
        <Box sx={{ maxWidth: 560 }}>
          <AccuracySessionReport summary={SUMMARY} material={MATERIAL} rows={ROWS} onOpen={() => {}} testId="gallery-accuracy-report-achievements" />
        </Box>
      ),
    },
    {
      name: "With the achievements, nothing won yet",
      render: () => (
        <Box sx={{ maxWidth: 560 }}>
          <AccuracySessionReport summary={EMPTY} material={EMPTY_MATERIAL} rows={[]} onOpen={() => {}} testId="gallery-accuracy-report-achievements-empty" />
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
