import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

import type { GalleryModule } from "../../gallery/types";

/**
 * The Tabs section's placeholder (CTA-107): plain MUI atoms, so the gallery
 * proves it discovers the section and every theme, mode and direction can be
 * looked at here. The section's own components replace it in the follow-up.
 */
const gallery: GalleryModule = {
  section: "tabs",
  title: "Placeholder",
  demos: [
    {
      name: "MUI atoms",
      render: () => (
        <Tabs value="moves" sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
          <Tab value="moves" label="Moves" />
          <Tab value="map" label="Map" />
          <Tab value="engine" label="Engine" />
        </Tabs>
      ),
    },
  ],
};

export default gallery;
