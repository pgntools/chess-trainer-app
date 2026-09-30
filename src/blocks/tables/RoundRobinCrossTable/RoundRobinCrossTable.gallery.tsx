import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { Tournament } from "../../../lib/tournament";
import type { BlockFamilyId } from "../../families";
import { CANDIDATES, EMPTY, HEBREW, LONG_NAMES, MISSING_GAME, SINGLE, UNFINISHED } from "./fixtures";
import RoundRobinCrossTable, { type RoundRobinCrossTableProps } from "./RoundRobinCrossTable";

/**
 * The block on a fixture, in a box of a definite height and the preview's own
 * width (it asks for none and takes all there is) — so the frame scrolls
 * inside it, both ways, as it does in a screen.
 */
const demo = (tournament: Tournament | undefined, ariaLabel: string, height = 260, extra: Partial<RoundRobinCrossTableProps> = {}) => (
  <Box sx={{ height, width: 0, minWidth: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
    <RoundRobinCrossTable tournament={tournament} ariaLabel={ariaLabel} testId="gallery-round-robin" {...extra} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "RoundRobinCrossTable",
  demos: [
    {
      name: "The FIDE Candidates 2026 — the real file: 8 players, a complete 14-round double round robin, two results a cell",
      render: () => demo(CANDIDATES, "FIDE Candidates 2026 — crosstable", 380),
    },
    { name: "A single round robin — one result a cell; a player with no title, rating or federation", render: () => demo(SINGLE, "Single round robin — crosstable") },
    {
      name: "An unfinished double round robin — cells with two results, cells with one, a game still going (*)",
      render: () => demo(UNFINISHED, "Unfinished double round robin — crosstable"),
    },
    { name: "A file that lacks one pair's game (–)", render: () => demo(MISSING_GAME, "A missing game — crosstable") },
    { name: "Still being read", render: () => demo(undefined, "Crosstable, loading", 160) },
    { name: "A file with no game in it", render: () => demo(EMPTY, "Crosstable, empty", 160) },
    { name: "Long names — one line each, and a sideways scroll", render: () => demo(LONG_NAMES, "Long names — crosstable", 180) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW, "טבלת התוצאות", 220) },
    { name: "Dense", render: () => demo(CANDIDATES, "FIDE Candidates 2026 — crosstable, dense", 300, { density: "dense" }) },
  ],
};

export default gallery;
