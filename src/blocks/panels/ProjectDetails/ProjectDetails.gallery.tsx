import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import ProjectDetails, { type ProjectDetailsTab } from "./ProjectDetails";
import { HEBREW_NAME, LONG_NAME, NAME } from "./fixtures";

/** The screen's board stands here — the block only places it (a block draws no board). */
const BOARD_STAND_IN = (
  <Box sx={{ aspectRatio: "1 / 1", border: "1px dashed", borderColor: "divider", display: "grid", placeItems: "center" }}>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      The screen&apos;s opening-moves board
    </Typography>
  </Box>
);

const demo = (name: string, tab: ProjectDetailsTab = "general", gamesTree?: ReactNode) => (
  <WithState<{ tab: ProjectDetailsTab; on: boolean }> initial={{ tab, on: false }}>
    {(state, setState) => (
      <Box sx={{ width: 400, height: 520, display: "flex", flexDirection: "column" }}>
        <ProjectDetails
          name={name}
          tab={state.tab}
          onTabChange={(next) => setState({ ...state, tab: next })}
          exampleOption={state.on}
          onExampleOptionChange={(on) => setState({ ...state, on })}
          gamesTree={gamesTree}
          testId="gallery-project-details"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "ProjectDetails",
  demos: [
    { name: "A Project, General's placeholder open", render: () => demo(NAME) },
    { name: "The Games tree, its board the screen's", render: () => demo(NAME, "gamesTree", BOARD_STAND_IN) },
    { name: "The Games tree with no games", render: () => demo(NAME, "gamesTree") },
    { name: "The example switch on Options", render: () => demo(NAME, "options") },
    { name: "A long name, wrapping in the head", render: () => demo(LONG_NAME) },
    { name: "A Hebrew name (switch to RTL)", render: () => demo(HEBREW_NAME) },
  ],
};

export default gallery;
