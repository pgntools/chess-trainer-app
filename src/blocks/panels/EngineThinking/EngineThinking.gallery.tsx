import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import EngineThinking from "./EngineThinking";
import { DEEP, STARTING } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "EngineThinking",
  demos: [
    { name: "The engine thinking — its depth beside the dots", render: () => <Box sx={{ width: 320 }}><EngineThinking thinking depth={DEEP.depth} testId="gallery-play" /></Box> },
    { name: "A search just begun", render: () => <Box sx={{ width: 320 }}><EngineThinking thinking depth={STARTING.depth} testId="gallery-play-start" /></Box> },
    { name: "The reader's move", render: () => <Box sx={{ width: 320 }}><EngineThinking thinking={false} depth={DEEP.depth} testId="gallery-play-yours" /></Box> },
  ],
};

export default gallery;
