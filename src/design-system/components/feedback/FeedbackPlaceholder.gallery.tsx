import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Feedback section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "feedback",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Box sx={{ display: "grid", gap: 1, maxWidth: 360 }}>
          <Alert severity="info">3 games read from the file.</Alert>
          <Alert severity="success">Saved.</Alert>
          <Alert severity="error">The PGN will not read.</Alert>
        </Box>
      ),
    },
  ],
};

export default gallery;
