import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Autocompletes section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "autocompletes",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Autocomplete
          size="small"
          sx={{ maxWidth: 360 }}
          options={["Sicilian Defence", "French Defence", "Caro-Kann Defence"]}
          defaultValue="French Defence"
          renderInput={(params) => <TextField {...params} label="Opening" />}
        />
      ),
    },
  ],
};

export default gallery;
