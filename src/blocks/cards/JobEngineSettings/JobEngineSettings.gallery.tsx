import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import JobEngineSettings from "./JobEngineSettings";
import { HEBREW, NO_OPTIONS, NO_PRESET, WITH_OPTIONS } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "cards",
  title: "JobEngineSettings",
  demos: [
    { name: "A preset that sent its options", render: () => <JobEngineSettings settings={WITH_OPTIONS} testId="gallery-job-engine-settings" /> },
    { name: "The Default preset — no options sent, no time limit", render: () => <JobEngineSettings settings={NO_OPTIONS} testId="gallery-job-engine-settings-none" /> },
    { name: "No preset recorded, the engine by its id", render: () => <JobEngineSettings settings={NO_PRESET} testId="gallery-job-engine-settings-no-preset" /> },
    { name: "A Hebrew preset name (switch to RTL)", render: () => <JobEngineSettings settings={HEBREW} testId="gallery-job-engine-settings-hebrew" /> },
    {
      name: "Narrow",
      render: () => (
        <Box sx={{ width: 280 }}>
          <JobEngineSettings settings={WITH_OPTIONS} testId="gallery-job-engine-settings-narrow" />
        </Box>
      ),
    },
  ],
};

export default gallery;
