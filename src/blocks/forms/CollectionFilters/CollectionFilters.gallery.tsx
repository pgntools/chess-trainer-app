import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { CollectionFacets, CollectionFilterValues } from "../../../lib/libraryCollections";
import type { BlockFamilyId } from "../../families";
import CollectionFilters from "./CollectionFilters";
import { FULL_FACETS, NO_FILTERS, SOME_FILTERS, SPARSE_FACETS } from "./fixtures";

/** The filters on fixtures, their values held by the demo as the collection's URL holds them. */
const demo = (facets: CollectionFacets, initial: CollectionFilterValues, board = false) => (
  <Box sx={{ maxWidth: 320 }}>
    <WithState<CollectionFilterValues> initial={initial}>
      {(values, set) => (
        <CollectionFilters
          facets={facets}
          values={values}
          onChange={(patch) => set((before) => ({ ...before, ...patch }))}
          onClear={() => set(NO_FILTERS)}
          openingBoard={
            board ? (
              <Typography variant="body2" color="text.secondary">
                (the screen's opening-moves board)
              </Typography>
            ) : undefined
          }
          testId="library-filter"
        />
      )}
    </WithState>
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "CollectionFilters",
  demos: [
    { name: "Every filter, none on (the side waits for a player)", render: () => demo(FULL_FACETS, NO_FILTERS, true) },
    { name: "Some on — a player as White, an event, a start date, a result", render: () => demo(FULL_FACETS, SOME_FILTERS, true) },
    { name: "An upload with players only — no opening, event, dates or result", render: () => demo(SPARSE_FACETS, NO_FILTERS) },
  ],
};

export default gallery;
