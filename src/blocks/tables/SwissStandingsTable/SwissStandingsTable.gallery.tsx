import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { Tournament } from "../../../lib/tournament";
import type { BlockFamilyId } from "../../families";
import { CLUB_OPEN, EMPTY, HEBREW, LONG_NAMES, ONE_GAME, SOFIA } from "./fixtures";
import SwissStandingsTable, { type SwissStandingsTableProps } from "./SwissStandingsTable";

/**
 * The block on a fixture, in a box of a definite height and the preview's own
 * width (it asks for none and takes all there is) — so the frame scrolls
 * inside it, both ways, as it does in a screen.
 */
const demo = (tournament: Tournament | undefined, ariaLabel: string, height = 280, extra: Partial<SwissStandingsTableProps> = {}) => (
  <Box sx={{ height, width: 0, minWidth: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
    <SwissStandingsTable tournament={tournament} ariaLabel={ariaLabel} testId="gallery-swiss-standings" {...extra} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "SwissStandingsTable",
  demos: [
    {
      name: "Sofia Cup Rapid 2026 — the real file: 99 players, 9 rounds, the top boards only (most rounds a dash), 8 games unfinished",
      render: () => demo(SOFIA, "Sofia Cup Rapid 2026 — standings", 460, { density: "dense" }),
    },
    {
      name: "A club open — one of every cell: a win, a draw, a loss, an unfinished game (*), a round with no game in the file (–); a player with no title, rating or federation",
      render: () => demo(CLUB_OPEN, "Club open — standings"),
    },
    { name: "Still being read", render: () => demo(undefined, "Standings, loading", 160) },
    { name: "A file with no game in it", render: () => demo(EMPTY, "Standings, empty", 160) },
    { name: "One game — two rows, one round", render: () => demo(ONE_GAME, "One game — standings", 180) },
    { name: "Long names — one line each, and a sideways scroll", render: () => demo(LONG_NAMES, "Long names — standings", 180) },
    {
      name: "Hebrew names, every game finished — no legend (switch the direction to RTL)",
      render: () => demo(HEBREW, "טבלת הדירוג", 240),
    },
  ],
};

export default gallery;
