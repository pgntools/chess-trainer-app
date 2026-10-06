import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import TeamRosters from "./TeamRosters";
import { LONG_NAMES, OLYMPIAD } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "TeamRosters",
  demos: [
    {
      name: "An Olympiad's teams, a line each, in a side panel's width — flags, every name a link",
      render: () => (
        <Box sx={{ width: 320 }}>
          <TeamRosters
            teams={OLYMPIAD}
            playerLink={(name) => ({ href: `#player-${encodeURIComponent(name)}` })}
            teamLink={(roster) => ({ href: `#team-${encodeURIComponent(roster.team)}` })}
            testId="gallery-team-rosters"
          />
        </Box>
      ),
    },
    {
      name: "Not linked",
      render: () => (
        <Box sx={{ width: 320 }}>
          <TeamRosters teams={OLYMPIAD} testId="gallery-team-rosters-plain" />
        </Box>
      ),
    },
    {
      name: "Long names, narrow",
      render: () => (
        <Box sx={{ width: 280 }}>
          <TeamRosters teams={LONG_NAMES} testId="gallery-team-rosters-long" />
        </Box>
      ),
    },
  ],
};

export default gallery;
