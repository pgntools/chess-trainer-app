import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import GradedLines from "./GradedLines";
import { MISSED, PASSED, PERFECT, POSITION, SWAPPED } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "GradedLines",
  demos: [
    {
      name: "Both found, the wrong way round — and a move outside the lines",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={SWAPPED} testId="gallery-graded" />
        </Box>
      ),
    },
    {
      name: "All found, each in its place",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={PERFECT} testId="gallery-graded-perfect" />
        </Box>
      ),
    },
    {
      name: "None of the top lines — the game's mistake and a move outside them",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={MISSED} testId="gallery-graded-missed" />
        </Box>
      ),
    },
    {
      name: "Passed",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={PASSED} testId="gallery-graded-passed" />
        </Box>
      ),
    },
  ],
};

export default gallery;
