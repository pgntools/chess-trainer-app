import Box from "@mui/material/Box";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";

import { IconAction } from "../../../design-system/components/toolbars";

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
    {
      name: "With the panel's Hide at the heading's end (CTA-231)",
      render: () => (
        <Box sx={{ width: 320 }}>
          <TopPlayers
            top={SPREAD}
            action={
              <IconAction label="Hide statistics" onClick={() => {}} expanded testId="gallery-top-players-hide">
                <KeyboardDoubleArrowRightRoundedIcon fontSize="small" />
              </IconAction>
            }
            testId="gallery-top-players-action"
          />
        </Box>
      ),
    },
  ],
};

export default gallery;
