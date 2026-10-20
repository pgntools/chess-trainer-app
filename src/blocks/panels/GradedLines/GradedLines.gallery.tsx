import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import GradedLines from "./GradedLines";
import { EVERY_PIECE, MISSED, MISSED_ACHIEVEMENTS, NO_PIECES, PASSED, PERFECT, PERFECT_ACHIEVEMENTS, POSITION, SWAPPED, SWAPPED_ACHIEVEMENTS } from "./fixtures";

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
      name: "Achievements — all in place, the line seen",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={PERFECT} achievements={PERFECT_ACHIEVEMENTS} testId="gallery-graded-achievements" />
        </Box>
      ),
    },
    {
      name: "Achievements — a move outside the lines, every tier above Pawn failed",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={SWAPPED} achievements={SWAPPED_ACHIEVEMENTS} testId="gallery-graded-achievements-swapped" />
        </Box>
      ),
    },
    {
      name: "Achievements — the game's move again: a precondition not met, most categories none",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={MISSED} achievements={MISSED_ACHIEVEMENTS} testId="gallery-graded-achievements-missed" />
        </Box>
      ),
    },
    {
      name: "Achievements — every piece, Queen to Pawn",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={PERFECT} achievements={EVERY_PIECE} testId="gallery-graded-achievements-every" />
        </Box>
      ),
    },
    {
      name: "Achievements — none",
      render: () => (
        <Box sx={{ maxWidth: 480 }}>
          <GradedLines position={POSITION} grade={PASSED} achievements={NO_PIECES} testId="gallery-graded-achievements-none" />
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
