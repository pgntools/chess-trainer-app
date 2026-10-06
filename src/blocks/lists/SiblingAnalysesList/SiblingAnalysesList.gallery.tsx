import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import SiblingAnalysesList, { type SiblingAnalysesListProps } from "./SiblingAnalysesList";
import { CURRENT, CUT_LABELS, LABELS, SIBLINGS } from "./fixtures";

const noop = () => {};

/** The panel in the width the board's own left panel has, over a short viewport. */
const demo = (props: Partial<SiblingAnalysesListProps>) => (
  <Box sx={{ width: 240, height: 320, display: "flex", flexDirection: "column", p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
    <SiblingAnalysesList testId="gallery-siblings" items={SIBLINGS} currentId={CURRENT} labels={LABELS} onClose={noop} {...props} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "SiblingAnalysesList",
  demos: [
    { name: "A folder's analyses — the current one marked", render: () => demo({}) },
    { name: "The first of them", render: () => demo({ currentId: "a1", labels: { ...LABELS, position: "1 of 5" } }) },
    { name: "Unsaved changes — the others disabled, and why", render: () => demo({ locked: true }) },
    {
      name: "A long folder — cut around the current one",
      render: () => demo({ labels: CUT_LABELS, hiddenBefore: 139, hiddenAfter: 360 }),
    },
    {
      name: "One analysis alone in its folder",
      render: () => demo({ items: SIBLINGS.slice(2, 3), labels: { ...LABELS, position: "1 of 1" } }),
    },
  ],
};

export default gallery;
