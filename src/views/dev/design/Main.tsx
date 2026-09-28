import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import { useParams } from "react-router";

import DesignGallery from "../../../design-system/gallery/DesignGallery";
import { useThemeChoice } from "../../../theme/themeChoice";

/** A section's page — `/dev/design/<section>`. */
const sectionPath = (id: string) => `/dev/design/${encodeURIComponent(id)}`;

/**
 * Layout-only wrapper, as on every other screen — the dev-only design gallery
 * (`/dev/design/<section>`, CTA-107), one page per section, opened on the
 * reader's own theme and scheme. `/dev/design` and an unknown section land on
 * the first. Reached only through `App.tsx`'s Development routes, so it never
 * ships.
 */
const Main = () => {
  const { section } = useParams();
  const { themeId } = useThemeChoice();
  const { mode, systemMode } = useColorScheme();
  const resolved = systemMode ?? mode;
  return (
    <Box data-testid="design-gallery-wrapper" sx={{ height: "100%" }}>
      <DesignGallery
        section={section}
        sectionPath={sectionPath}
        initialThemeId={themeId}
        initialMode={resolved === "dark" ? "dark" : "light"}
      />
    </Box>
  );
};

export default Main;
