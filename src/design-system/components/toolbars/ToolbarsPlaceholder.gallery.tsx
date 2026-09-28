import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Toolbars section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "toolbars",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            maxWidth: 360,
            pb: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Saved analyses
          </Typography>
          <Button size="small" variant="contained">
            New
          </Button>
        </Box>
      ),
    },
  ],
};

export default gallery;
