import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import SuggestionList from "./SuggestionList";
import { ONE, THREE } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "SuggestionList",
  demos: [
    {
      name: "Three moves, each removable",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <SuggestionList moves={THREE} onRemove={() => {}} testId="gallery-suggestions" />
        </Box>
      ),
    },
    {
      name: "None yet",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <SuggestionList moves={[]} onRemove={() => {}} testId="gallery-suggestions-empty" />
        </Box>
      ),
    },
    {
      name: "Graded — read only",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <SuggestionList moves={ONE} testId="gallery-suggestions-read" />
        </Box>
      ),
    },
  ],
};

export default gallery;
