import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Forms section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "forms",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Box sx={{ display: "grid", gap: 1, maxWidth: 360 }}>
          <TextField size="small" label="Title" defaultValue="Sicilian, Najdorf" />
          <FormControlLabel control={<Switch defaultChecked />} label="Show arrows" />
        </Box>
      ),
    },
  ],
};

export default gallery;
