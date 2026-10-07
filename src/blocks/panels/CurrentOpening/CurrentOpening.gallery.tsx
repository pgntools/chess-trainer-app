import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { OpeningEntry } from "../../../lib/openings";
import type { BlockFamilyId } from "../../families";
import CurrentOpening from "./CurrentOpening";
import { KINGS_PAWN, LONG } from "./fixtures";

const demo = (opening: OpeningEntry | undefined, loading: boolean, testId: string, oneLine = false) => (
  <Box sx={{ width: 320, display: "flex" }}>
    <CurrentOpening opening={opening} loading={loading} ecoLink={{ href: "#openings" }} oneLine={oneLine} testId={testId} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "CurrentOpening",
  demos: [
    { name: "A known opening — the ECO chip a link", render: () => demo(KINGS_PAWN, false, "gallery-opening") },
    { name: "A long name — cut short", render: () => demo(LONG, false, "gallery-opening-long") },
    { name: "One line — cut with an ellipsis, the full name on hover, a click opens a new tab", render: () => demo(LONG, false, "gallery-opening-one-line", true) },
    { name: "One line, unknown — nothing at all", render: () => demo(undefined, false, "gallery-opening-one-line-unknown", true) },
    { name: "Unknown", render: () => demo(undefined, false, "gallery-opening-unknown") },
    { name: "The book still loading", render: () => demo(undefined, true, "gallery-opening-loading") },
  ],
};

export default gallery;
