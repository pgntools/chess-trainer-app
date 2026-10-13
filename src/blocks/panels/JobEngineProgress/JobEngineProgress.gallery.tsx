import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import JobEngineProgress from "./JobEngineProgress";
import { DEEP, MATE, STARTING } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "JobEngineProgress",
  demos: [
    { name: "Deep in a search — depth, nodes, speed, time, hash and the best line", render: () => <Box sx={{ width: 360 }}><JobEngineProgress live={DEEP} testId="gallery-live-deep" /></Box> },
    { name: "A search just begun — the final position, nothing counted yet", render: () => <Box sx={{ width: 360 }}><JobEngineProgress live={STARTING} testId="gallery-live-start" /></Box> },
    { name: "A mate found, no hash reported", render: () => <Box sx={{ width: 360 }}><JobEngineProgress live={MATE} testId="gallery-live-mate" /></Box> },
  ],
};

export default gallery;
