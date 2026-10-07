import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import TournamentInfo from "./TournamentInfo";
import { CANDIDATES, DESCRIPTION, SPARSE, TEAM } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "cards",
  title: "TournamentInfo",
  demos: [
    {
      name: "A round robin, described",
      render: () => <TournamentInfo facts={CANDIDATES} description={DESCRIPTION} testId="gallery-tournament-info" />,
    },
    { name: "A team event, some games unfinished", render: () => <TournamentInfo facts={TEAM} testId="gallery-tournament-info-team" /> },
    { name: "Tags that say little", render: () => <TournamentInfo facts={SPARSE} testId="gallery-tournament-info-sparse" /> },
    {
      name: "Narrow",
      render: () => (
        <Box sx={{ width: 280 }}>
          <TournamentInfo facts={CANDIDATES} description={DESCRIPTION} testId="gallery-tournament-info-narrow" />
        </Box>
      ),
    },
  ],
};

export default gallery;
