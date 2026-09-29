import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { Game } from "../../../lib/gameModel";
import type { BlockFamilyId } from "../../families";
import { FULL, LONG, PLACEHOLDERS } from "./fixtures";
import GameInfo from "./GameInfo";

const demo = (game: Game | undefined, testId: string) => (
  <Box sx={{ width: 320 }}>
    <GameInfo game={game} testId={testId} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "GameInfo",
  demos: [
    { name: "A game with its tags — the named first, then the file's own", render: () => demo(FULL, "gallery-game-info") },
    { name: "Long values wrap", render: () => demo(LONG, "gallery-game-info-long") },
    { name: "Only placeholders — nothing to show", render: () => demo(PLACEHOLDERS, "gallery-game-info-empty") },
  ],
};

export default gallery;
