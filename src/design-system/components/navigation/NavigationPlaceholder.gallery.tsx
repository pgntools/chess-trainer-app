import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Navigation section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "navigation",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Breadcrumbs>
          <Link underline="hover" color="inherit" href="#">
            Library
          </Link>
          <Typography color="text.primary">World Championships</Typography>
        </Breadcrumbs>
      ),
    },
  ],
};

export default gallery;
