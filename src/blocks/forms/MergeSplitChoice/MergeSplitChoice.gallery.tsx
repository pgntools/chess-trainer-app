import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { FOURTEEN, SOME_SKIPPED, UNMERGEABLE, type ChoiceFixture } from "./fixtures";
import MergeSplitChoice from "./MergeSplitChoice";

const noop = () => {};

const demo = (fixture: ChoiceFixture, { split = true, problem = null }: { split?: boolean; problem?: string | null } = {}) => (
  <Box sx={{ width: 360 }}>
    <MergeSplitChoice
      labelKey="repertoires.choice"
      testId="gallery-choice"
      {...fixture}
      onMerge={noop}
      onSplit={split ? noop : undefined}
      problem={problem}
    />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "MergeSplitChoice",
  demos: [
    { name: "Fourteen games — merge or split (a repertoire's upload)", render: () => demo(FOURTEEN) },
    { name: "Two games left out", render: () => demo(SOME_SKIPPED) },
    { name: "Games from different starts — Merge off, saying why", render: () => demo(UNMERGEABLE) },
    { name: "Merge only (the Openings explorer's Load tab)", render: () => demo(FOURTEEN, { split: false }) },
    { name: "A problem with the last choice", render: () => demo(FOURTEEN, { problem: "That would pass the limit of 500 repertoires in this browser." }) },
  ],
};

export default gallery;
