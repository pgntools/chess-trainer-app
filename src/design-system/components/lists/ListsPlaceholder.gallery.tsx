import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Lists section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "lists",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <List dense sx={{ maxWidth: 280 }}>
          <ListItemButton selected>
            <ListItemText primary="Collections" />
          </ListItemButton>
          <ListItemButton>
            <ListItemText primary="Add collection" />
          </ListItemButton>
        </List>
      ),
    },
  ],
};

export default gallery;
