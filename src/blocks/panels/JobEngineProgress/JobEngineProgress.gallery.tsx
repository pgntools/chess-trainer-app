import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import JobEngineProgress from "./JobEngineProgress";
import { DEEP, HEARD_RECENTLY, MATE, SILENT, SILENT_NOW, STARTING } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "JobEngineProgress",
  demos: [
    { name: "Deep in a search — depth, nodes, speed, time, hash and the best line; a heartbeat 3 s ago", render: () => <Box sx={{ width: 360 }}><JobEngineProgress live={DEEP} now={HEARD_RECENTLY} testId="gallery-live-deep" /></Box> },
    { name: "A long quiet stretch at depth 32 — the engine last heard 42 s ago", render: () => <Box sx={{ width: 360 }}><JobEngineProgress live={SILENT} now={SILENT_NOW} testId="gallery-live-silent" /></Box> },
    { name: "A search just begun — the final position, nothing counted yet, heard just now", render: () => <Box sx={{ width: 360 }}><JobEngineProgress live={STARTING} now={STARTING.heardAt} testId="gallery-live-start" /></Box> },
    { name: "A mate found, no hash reported", render: () => <Box sx={{ width: 360 }}><JobEngineProgress live={MATE} now={HEARD_RECENTLY} testId="gallery-live-mate" /></Box> },
  ],
};

export default gallery;
