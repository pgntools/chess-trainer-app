import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import CaseLinks from "./CaseLinks";
import { LINKED_FROM, LINKS_TO } from "./fixtures";

const demo = (to = LINKS_TO, from = LINKED_FROM, link = true) => (
  <Box sx={{ width: 380 }}>
    <CaseLinks linksTo={to} linkedFrom={from} onUnlink={() => {}} onLink={link ? () => {} : undefined} testId="gallery-case-links" />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "CaseLinks",
  demos: [
    { name: "Links to two, linked from one", render: () => demo() },
    { name: "Linked from one only — None under Links to", render: () => demo([]) },
    { name: "No links yet", render: () => demo([], []) },
    { name: "No Link a case (the screen offers none)", render: () => demo(LINKS_TO, [], false) },
    {
      name: "An Unlink refused",
      render: () => (
        <CaseLinks linksTo={LINKS_TO} linkedFrom={[]} onUnlink={() => {}} problem="The link could not be changed — the browser refused the write." testId="gallery-case-links-problem" />
      ),
    },
  ],
};

export default gallery;
