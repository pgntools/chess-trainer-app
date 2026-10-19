import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import AccuracyTrainerDetails from "./AccuracyTrainerDetails";
import { CASE_LINK, EXERCISE_TITLE, GAME_TITLE, HEBREW_TITLE } from "./fixtures";

type Settings = { arrows: boolean; engine: boolean; moves: number };

const framed = (title: string, testId: string, initial: Settings, withCase = false) => (
  <Box sx={{ width: 300, height: 420, display: "flex", border: 1, borderColor: "divider", p: 1 }}>
    <WithState initial={initial}>
      {(settings, set) => (
        <AccuracyTrainerDetails
          title={title}
          tab="settings"
          onTabChange={() => {}}
          showArrows={settings.arrows}
          onShowArrowsChange={(arrows) => set({ ...settings, arrows })}
          movesToFind={settings.moves}
          onMovesToFindChange={(moves) => set({ ...settings, moves })}
          engine={settings.engine}
          onEngineChange={(engine) => set({ ...settings, engine })}
          {...(withCase ? { caseLink: CASE_LINK } : {})}
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
    {
      name: "A session running — its case linked, three moves to find, the engine on",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details", { arrows: true, engine: true, moves: 3 }, true),
    },
    {
      name: "Nothing loaded — the exercise's name, the engine off",
      render: () => framed(EXERCISE_TITLE, "gallery-accuracy-details-empty", { arrows: false, engine: false, moves: 3 }),
    },
    { name: "A Hebrew name", render: () => framed(HEBREW_TITLE, "gallery-accuracy-details-he", { arrows: true, engine: false, moves: 5 }) },
  ],
};

export default gallery;
