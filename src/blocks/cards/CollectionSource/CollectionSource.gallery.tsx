import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import CollectionSource from "./CollectionSource";
import { EVERY_TAG, MERGED, PARTLY, TWIC } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "cards",
  title: "CollectionSource",
  demos: [
    { name: "One issue of The Week in Chess", render: () => <CollectionSource sources={TWIC} testId="gallery-collection-source" /> },
    { name: "Two issues merged, a few games naming none", render: () => <CollectionSource sources={MERGED} testId="gallery-collection-source-merged" /> },
    { name: "Every tag PGN names, and one it does not", render: () => <CollectionSource sources={EVERY_TAG} testId="gallery-collection-source-every-tag" /> },
    { name: "A Hebrew source over some games (switch to RTL)", render: () => <CollectionSource sources={PARTLY} testId="gallery-collection-source-partly" /> },
    {
      name: "Narrow",
      render: () => (
        <Box sx={{ width: 280 }}>
          <CollectionSource sources={MERGED} testId="gallery-collection-source-narrow" />
        </Box>
      ),
    },
  ],
};

export default gallery;
