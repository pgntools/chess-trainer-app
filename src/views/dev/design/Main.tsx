import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";

import DesignGallery from "../../../design-system/gallery/DesignGallery";
import { useThemeChoice } from "../../../theme/themeChoice";

/**
 * Layout-only wrapper, as on every other screen — the dev-only design gallery
 * (`/dev/design`, CTA-107), opened on the reader's own theme and scheme.
 * Reached only through `App.tsx`'s Development routes, so it never ships.
 */
const Main = () => {
  const { themeId } = useThemeChoice();
  const { mode, systemMode } = useColorScheme();
  const resolved = systemMode ?? mode;
  return (
    <Box data-testid="design-gallery-wrapper" sx={{ height: "100%" }}>
      <DesignGallery initialThemeId={themeId} initialMode={resolved === "dark" ? "dark" : "light"} />
    </Box>
  );
};

export default Main;
