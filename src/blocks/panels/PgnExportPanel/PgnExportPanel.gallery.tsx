import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { GameTree } from "../../../lib/gameTree";
import type { BlockFamilyId } from "../../families";
import { ANNOTATED, ANNOTATED_FEN, EMPTY, START_FEN } from "./fixtures";
import PgnExportPanel from "./PgnExportPanel";

const demo = (tree: GameTree, fen: string, testId: string) => (
  <Box sx={{ width: 340 }}>
    <PgnExportPanel fen={fen} tree={tree} onDownload={() => {}} testId={testId} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "PgnExportPanel",
  demos: [
    { name: "A game with a comment, a mark and a side line — switch each off", render: () => demo(ANNOTATED, ANNOTATED_FEN, "gallery-export") },
    { name: "No moves yet", render: () => demo(EMPTY, START_FEN, "gallery-export-empty") },
  ],
};

export default gallery;
