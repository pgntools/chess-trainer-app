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
      name: "An Olympiad's teams — flags, every name a link",
      render: () => (
        <TeamRosters
          teams={OLYMPIAD}
          playerLink={(name) => ({ href: `#player-${encodeURIComponent(name)}` })}
          teamLink={(roster) => ({ href: `#team-${encodeURIComponent(roster.team)}` })}
          testId="gallery-team-rosters"
        />
      ),
    },
    { name: "Not linked", render: () => <TeamRosters teams={OLYMPIAD} testId="gallery-team-rosters-plain" /> },
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
