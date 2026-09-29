import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import ChangesStrip, { type ChangesStripProps } from "./ChangesStrip";
import { ADDED, EDITED, STORAGE } from "./fixtures";

const noop = () => {};

const demo = (props: Partial<ChangesStripProps>) => (
  <Box sx={{ width: 380 }}>
    <ChangesStrip testId="gallery-changes" labelKey="repertoires.changes" summary={ADDED} problem={null} onUpdate={noop} onCopy={noop} onDiscard={noop} {...props} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "ChangesStrip",
  demos: [
    { name: "Moves added — update, copy or discard", render: () => demo({}) },
    { name: "Lines edited", render: () => demo({ summary: EDITED }) },
    { name: "A protected repertoire — its settings instead of Update", render: () => demo({ protectedLink: { href: "#settings" } }) },
    { name: "A shipped game — no Update (the Library's)", render: () => demo({ labelKey: "library.shippedChanges", readOnly: true }) },
    { name: "The save failed", render: () => demo({ problem: STORAGE }) },
  ],
};

export default gallery;
