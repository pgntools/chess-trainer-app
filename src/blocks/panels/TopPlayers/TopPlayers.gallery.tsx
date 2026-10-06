import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import TopPlayers from "./TopPlayers";
import { ONE_LEADER, SPREAD } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "TopPlayers",
  demos: [
    {
      name: "One player leads everything — the name a link",
      render: () => <TopPlayers top={ONE_LEADER} playerLink={(player) => ({ href: `#${encodeURIComponent(player.name)}` })} testId="gallery-top-players" />,
    },
    { name: "Different leaders", render: () => <TopPlayers top={SPREAD} testId="gallery-top-players-spread" /> },
    {
      name: "Narrow",
      render: () => (
        <Box sx={{ width: 280 }}>
          <TopPlayers top={SPREAD} testId="gallery-top-players-narrow" />
        </Box>
      ),
    },
  ],
};

export default gallery;
