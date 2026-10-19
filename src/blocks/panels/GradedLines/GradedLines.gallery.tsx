import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import GradedLines from "./GradedLines";
import { MISSED, MIXED, PASSED, POSITION, TOP } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "GradedLines",
  demos: [
    {
      name: "The best move found, a top line and one outside the lines",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <GradedLines position={POSITION} grade={MIXED} testId="gallery-graded" />
        </Box>
      ),
    },
    {
      name: "One of the top lines",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <GradedLines position={POSITION} grade={TOP} testId="gallery-graded-top" />
        </Box>
      ),
    },
    {
      name: "None of the top lines — the game's mistake and a move outside them",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <GradedLines position={POSITION} grade={MISSED} testId="gallery-graded-missed" />
        </Box>
      ),
    },
    {
      name: "Passed",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <GradedLines position={POSITION} grade={PASSED} testId="gallery-graded-passed" />
        </Box>
      ),
    },
  ],
};

export default gallery;
