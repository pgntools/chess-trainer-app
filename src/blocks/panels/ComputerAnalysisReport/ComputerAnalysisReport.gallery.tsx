import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import ComputerAnalysisReport from "./ComputerAnalysisReport";
import { BOTH, NO_LOSS, WHITE_ONLY } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "ComputerAnalysisReport",
  demos: [
    {
      name: "Both players, named",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <ComputerAnalysisReport report={BOTH} players={{ w: "Carlsen, Magnus", b: "Nepomniachtchi, Ian" }} testId="gallery-report" />
        </Box>
      ),
    },
    {
      name: "White only — Black not analysed",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <ComputerAnalysisReport report={WHITE_ONLY} testId="gallery-report-white" />
        </Box>
      ),
    },
    {
      name: "No loss known — no ACPL or accuracy",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <ComputerAnalysisReport report={NO_LOSS} testId="gallery-report-no-loss" />
        </Box>
      ),
    },
  ],
};

export default gallery;
