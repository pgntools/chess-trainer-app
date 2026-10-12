import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { CaseRow } from "../../../lib/analysisCaseRows";
import type { BlockFamilyId } from "../../families";
import CaseDetails from "./CaseDetails";
import type { Game } from "../../../lib/gameModel";
import { GAME, GAME_ROW, HEBREW_ROW, POSITION_ROW } from "./fixtures";

const demo = (row: CaseRow, game: Game | undefined, ends = false) => (
  <Box sx={{ width: 400, height: 420, display: "flex", flexDirection: "column" }}>
    <CaseDetails
      row={row}
      game={game}
      backLink={{ href: "#cases" }}
      previous={ends ? undefined : { href: "#previous" }}
      next={{ href: "#next" }}
      testId="gallery-case-details"
    />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "CaseDetails",
  demos: [
    { name: "A Game Case, its PGN tags on Info", render: () => demo(GAME_ROW, GAME) },
    { name: "A Position with a long name and no tags, the first of the list", render: () => demo(POSITION_ROW, undefined, true) },
    { name: "A Hebrew name (switch to RTL — the arrows turn)", render: () => demo(HEBREW_ROW, undefined) },
  ],
};

export default gallery;
