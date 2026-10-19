import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import AccuracyTrainerDetails from "./AccuracyTrainerDetails";
import { EXERCISE_TITLE, GAME_TITLE, HEBREW_TITLE } from "./fixtures";

const framed = (title: string, testId: string, arrows = true) => (
  <Box sx={{ width: 280, height: 320, display: "flex", border: 1, borderColor: "divider", p: 1 }}>
    <WithState initial={arrows}>
      {(showArrows, setShowArrows) => (
        <AccuracyTrainerDetails
          title={title}
          tab="settings"
          onTabChange={() => {}}
          showArrows={showArrows}
          onShowArrowsChange={setShowArrows}
          testId={testId}
        />
      )}
    </WithState>
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "AccuracyTrainerDetails",
  demos: [
    { name: "A game loaded — Settings, the arrows on", render: () => framed(GAME_TITLE, "gallery-accuracy-details") },
    { name: "Nothing loaded — the exercise's name, the arrows off", render: () => framed(EXERCISE_TITLE, "gallery-accuracy-details-empty", false) },
    { name: "A Hebrew name", render: () => framed(HEBREW_TITLE, "gallery-accuracy-details-he") },
  ],
};

export default gallery;
