import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import AccuracyTrainerDetails from "./AccuracyTrainerDetails";
import { CASE_LINK, EXERCISE_TITLE, GAME_TITLE, HEBREW_TITLE } from "./fixtures";

type Settings = { arrows: boolean; engine: boolean; lines: number };

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
          engine={{
            on: settings.engine,
            onChange: (engine) => set({ ...settings, engine }),
            lines: settings.lines,
            onLinesChange: (lines) => set({ ...settings, lines }),
          }}
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
      name: "A session running — its case linked, the engine on, three lines",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details", { arrows: true, engine: true, lines: 3 }, true),
    },
    {
      name: "Nothing loaded — the exercise's name, the engine off",
      render: () => framed(EXERCISE_TITLE, "gallery-accuracy-details-empty", { arrows: false, engine: false, lines: 3 }),
    },
    { name: "A Hebrew name", render: () => framed(HEBREW_TITLE, "gallery-accuracy-details-he", { arrows: true, engine: false, lines: 5 }) },
  ],
};

export default gallery;
