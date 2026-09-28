import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Menus section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "menus",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Paper elevation={4} sx={{ maxWidth: 240 }}>
          <MenuList dense>
            <MenuItem>Promote variation</MenuItem>
            <MenuItem selected>Add comment</MenuItem>
            <MenuItem>Delete from here</MenuItem>
          </MenuList>
        </Paper>
      ),
    },
  ],
};

export default gallery;
