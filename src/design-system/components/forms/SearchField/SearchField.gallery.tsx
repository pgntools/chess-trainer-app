import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import SearchField from "./SearchField";

const gallery: GalleryModule = {
  section: "forms",
  title: "SearchField",
  demos: [
    {
      name: "A placeholder (type to see the clear button; Escape clears)",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial="">
            {(value, setValue) => <SearchField value={value} onChange={setValue} placeholder="Filter by name" clearLabel="Clear" testId="gallery-search" />}
          </WithState>
        </Box>
      ),
    },
    {
      name: "A label, with words in it",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial="Tal">
            {(value, setValue) => <SearchField value={value} onChange={setValue} label="Words" clearLabel="Clear" testId="gallery-search-label" />}
          </WithState>
        </Box>
      ),
    },
  ],
};

export default gallery;
