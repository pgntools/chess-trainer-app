import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import { useParams } from "react-router";

import { BLOCK_FAMILIES } from "../../../blocks/families";
import DesignGallery from "../../../design-system/gallery/DesignGallery";
import { galleryEntriesOf, groupGallery } from "../../../design-system/gallery/discover";
import type { GalleryModule, GalleryTier } from "../../../design-system/gallery/types";
import { useThemeChoice } from "../../../theme/themeChoice";

/** A page — `/dev/design/<section>/<component>`, `/dev/design/<tier>/<section>/<component>`. */
const sectionPath = (page: string) => `/dev/design/${page.split("/").map(encodeURIComponent).join("/")}`;

/**
 * **The Blocks tier** (CTA-110): every `src/blocks/**\/*.gallery.tsx`, found
 * by Vite's `import.meta.glob` at build time and grouped by the families
 * registry. Discovered here, not in the gallery, because the design system
 * may not import a block — the route composes the tiers, as a screen
 * composes blocks.
 */
const blocksTier: GalleryTier = {
  id: "blocks",
  title: "Blocks",
  sections: groupGallery(
    galleryEntriesOf(
      import.meta.glob<GalleryModule<string>>("../../../blocks/**/*.gallery.tsx", { eager: true, import: "default" }),
    ),
    BLOCK_FAMILIES,
  ),
};
const TIERS = [blocksTier];

/**
 * Layout-only wrapper, as on every other screen — the dev-only design gallery
 * (`/dev/design/<section>`, CTA-107), one page per section of each tier —
 * Base, Patterns and Blocks (CTA-110) — opened on the reader's own theme and
 * scheme. `/dev/design` and an unknown page land on the first. Reached only
 * through `App.tsx`'s Development routes, so it never ships.
 */
const Main = () => {
  const page = useParams()["*"]?.replace(/\/+$/, "");
  const { themeId } = useThemeChoice();
  const { mode, systemMode } = useColorScheme();
  const resolved = systemMode ?? mode;
  return (
    <Box data-testid="design-gallery-wrapper" sx={{ height: "100%" }}>
      <DesignGallery
        section={page === "" ? undefined : page}
        sectionPath={sectionPath}
        tiers={TIERS}
        initialThemeId={themeId}
        initialMode={resolved === "dark" ? "dark" : "light"}
      />
    </Box>
  );
};

export default Main;
