import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { Match } from "../../../lib/match";
import type { BlockFamilyId } from "../../families";
import { CLUTCH, HEBREW, UNFINISHED } from "./fixtures";
import MatchTable, { type MatchTableProps } from "./MatchTable";

/** The block at the preview's own width (it asks for none and takes all there is), so the frame scrolls sideways inside it. */
const demo = (match: Match | undefined, ariaLabel: string, extra: Partial<MatchTableProps> = {}) => (
  <Box sx={{ height: 200, width: 0, minWidth: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
    <MatchTable match={match} ariaLabel={ariaLabel} testId="gallery-match" {...extra} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "MatchTable",
  demos: [
    { name: "Clutch Chess: The Legends 2026 — the real file: Topalov – Kasparov, twelve games", render: () => demo(CLUTCH, "Clutch Chess: The Legends 2026 — the match") },
    { name: "Three games, the last unfinished — the legend explains *", render: () => demo(UNFINISHED, "Club match — the match") },
    { name: "Still being read", render: () => demo(undefined, "Match, loading") },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW, "משחק — המשחק", { density: "dense" }) },
  ],
};

export default gallery;
