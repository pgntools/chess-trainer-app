import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../gallery/types";

/**
 * The States section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "states",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Nothing saved yet.
          </Typography>
        </Box>
      ),
    },
  ],
};

export default gallery;
