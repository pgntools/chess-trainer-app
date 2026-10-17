import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { DEEP, DEFAULTS, INSTANT, OFF_THE_MARKS } from "./fixtures";
import SearchLimitsFields from "./SearchLimitsFields";

type Limits = { depth: number; moveTimeMs: number };

const demo = (initial: Limits, testId: string) => (
  <WithState<Limits> initial={initial}>
    {(limits, set) => (
      <Box sx={{ maxWidth: 420 }}>
        <SearchLimitsFields
          depth={limits.depth}
          moveTimeMs={limits.moveTimeMs}
          onChange={(patch) => set((before) => ({ ...before, ...patch }))}
          testId={testId}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "SearchLimitsFields",
  demos: [
    { name: "The defaults — depth 20, no time limit: the move time's box off", render: () => demo(DEFAULTS, "gallery-limits-defaults") },
    { name: "A deep search — depth 34, a minute a move", render: () => demo(DEEP, "gallery-limits-deep") },
    { name: "A move time typed off the marks — 7.5 s, the slider between 5 and 10", render: () => demo(OFF_THE_MARKS, "gallery-limits-off") },
    { name: "The instant reply — 0 s, on the first mark", render: () => demo(INSTANT, "gallery-limits-instant") },
  ],
};

export default gallery;
