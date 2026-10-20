import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import AccuracyTrainerDetails, { type AccuracyTrainerDetailsTab } from "./AccuracyTrainerDetails";
import { CASE_LINK, EXERCISE_TITLE, GAME_TITLE, GRADED, GRADED_POSITION, HEBREW_TITLE, LABEL, MOVES, RESULTS } from "./fixtures";

type Settings = { arrows: boolean; moves: number };

/** The reader's moves reordered and deleted, as a screen's board would. */
const moved = (list: readonly string[], index: number, move: "up" | "down"): string[] => {
  const to = move === "up" ? index - 1 : index + 1;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
};

type Shown = "answering" | "waiting" | "graded" | "passed";

const framed = (title: string, testId: string, initial: Settings, withCase = false, tab: AccuracyTrainerDetailsTab = "settings", shown: Shown = "answering") => (
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
          {...(withCase
            ? {
                caseLink: CASE_LINK,
                results: { rows: RESULTS, onOpen: () => {} },
                moves:
                  shown === "passed"
                    ? { kind: "passed" as const, label: LABEL, onAnswerAgain: () => {} }
                    : shown === "graded"
                    ? { kind: "graded" as const, label: LABEL, position: GRADED_POSITION, grade: GRADED }
                    : shown === "waiting"
                      ? { kind: "waiting" as const, label: LABEL, list: settings.list }
                      : {
                          kind: "answering" as const,
                          label: LABEL,
                          list: settings.list,
                          onMove: (index: number, move: "up" | "down") => set({ ...settings, list: moved(settings.list, index, move) }),
                          onRemove: (index: number) => set({ ...settings, list: settings.list.filter((_, at) => at !== index) }),
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
      render: () => framed(GAME_TITLE, "gallery-accuracy-details-moves", { arrows: true, moves: 3 }, true, "moves"),
    },
    {
      name: "Moves — checked and graded: every line, the reader's moves marked",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details-moves-graded", { arrows: true, moves: 2 }, true, "moves", "graded"),
    },
    {
      name: "Moves — passed, put off for later: no line shown, Answer it now",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details-moves-passed", { arrows: true, moves: 3 }, true, "moves", "passed"),
    },
    {
      name: "Moves — checked, waiting for the engine",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details-moves-waiting", { arrows: true, moves: 3 }, true, "moves", "waiting"),
    },
    {
      name: "Results — every position answered or passed, each a way back to it",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details-results", { arrows: true, moves: 2 }, true, "results"),
    },
    {
      name: "Moves — before a session",
      render: () => framed(EXERCISE_TITLE, "gallery-accuracy-details-moves-none", { arrows: true, moves: 3 }, false, "moves"),
    },
    {
      name: "A session running — its case linked, three moves to find",
      render: () => framed(GAME_TITLE, "gallery-accuracy-details", { arrows: true, moves: 3 }, true),
    },
    {
      name: "Nothing loaded — the exercise's name",
      render: () => framed(EXERCISE_TITLE, "gallery-accuracy-details-empty", { arrows: false, moves: 3 }),
    },
    { name: "A Hebrew name", render: () => framed(HEBREW_TITLE, "gallery-accuracy-details-he", { arrows: true, moves: 5 }) },
  ],
};

export default gallery;
