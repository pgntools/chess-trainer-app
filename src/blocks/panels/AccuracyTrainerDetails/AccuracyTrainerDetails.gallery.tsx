import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import AccuracyTrainerDetails, { type AccuracyTrainerDetailsTab } from "./AccuracyTrainerDetails";
import { CASE_LINK, EXERCISE_TITLE, GAME_TITLE, HEBREW_TITLE, MOVES } from "./fixtures";

type Settings = { arrows: boolean; engine: boolean; moves: number };

/** The reader's moves reordered and deleted, as a screen's board would. */
const moved = (list: readonly string[], index: number, move: "up" | "down"): string[] => {
  const to = move === "up" ? index - 1 : index + 1;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
};

const framed = (title: string, testId: string, initial: Settings, withCase = false, tab: AccuracyTrainerDetailsTab = "settings", locked = false) => (
  <Box sx={{ width: 300, height: 420, display: "flex", border: 1, borderColor: "divider", p: 1 }}>
    <WithState initial={{ ...initial, list: withCase ? MOVES : [] }}>
      {(settings, set) => (
        <AccuracyTrainerDetails
          title={title}
          tab={tab}
          onTabChange={() => {}}
          showArrows={settings.arrows}
          onShowArrowsChange={(arrows) => set({ ...settings, arrows })}
          movesToFind={settings.moves}
          onMovesToFindChange={(moves) => set({ ...settings, moves })}
          engine={settings.engine}
          onEngineChange={(engine) => set({ ...settings, engine })}
          {...(withCase
            ? {
                caseLink: CASE_LINK,
                moves: {
                  list: settings.list,
                  onMove: (index: number, move: "up" | "down") => set({ ...settings, list: moved(settings.list, index, move) }),
                  onRemove: (index: number) => set({ ...settings, list: settings.list.filter((_, at) => at !== index) }),
                  locked,
                },
              }
            : {})}
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
      name: "Moves — the reader's moves at the position, moved up or down, deleted",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details-moves", { arrows: true, engine: false, moves: 3 }, true, "moves"),
    },
    {
      name: "Moves — checked, read only",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details-moves-locked", { arrows: true, engine: false, moves: 3 }, true, "moves", true),
    },
    {
      name: "Moves — before a session",
      render: () => framed(EXERCISE_TITLE, "gallery-accuracy-details-moves-none", { arrows: true, engine: false, moves: 3 }, false, "moves"),
    },
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
