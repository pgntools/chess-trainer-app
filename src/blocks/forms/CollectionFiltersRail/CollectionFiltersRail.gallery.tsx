import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { CollectionFilterValues } from "../../../lib/libraryCollections";
import type { BlockFamilyId } from "../../families";
import CollectionFiltersRail from "./CollectionFiltersRail";
import { EVERY_FILTER, NO_FILTERS, THREE_FILTERS } from "./fixtures";

/** The rail as the shell draws it: 48 px wide, a paper ground, its border on the side the table is. */
const demo = (values: CollectionFilterValues) => (
  <Box sx={{ width: 48, height: 160, p: 0.5, bgcolor: "background.paper", borderInlineStart: "1px solid", borderColor: "divider" }}>
    <CollectionFiltersRail values={values} onExpand={() => {}} testId="library-filters-rail" />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "CollectionFiltersRail",
  demos: [
    { name: "No filter on — no badge", render: () => demo(NO_FILTERS) },
    { name: "Three on — players as White, a start date", render: () => demo(THREE_FILTERS) },
    { name: "Every filter on", render: () => demo(EVERY_FILTER) },
  ],
};

export default gallery;
