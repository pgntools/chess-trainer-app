import { BLOCK_FAMILIES } from "../../../blocks/families";
import { galleryEntriesOf, groupGallery } from "../../../design-system/gallery/discover";
import type { GalleryModule, GalleryTier } from "../../../design-system/gallery/types";

/**
 * **The Blocks tier** (CTA-110): every `src/blocks/**\/*.gallery.tsx`, found
 * by Vite's `import.meta.glob` at build time and grouped by the families
 * registry. Discovered here, not in the gallery, because the design system
 * may not import a block — the route composes the tiers, as a screen
 * composes blocks.
 *
 * Its own module (CTA-116) so the route and its test read **one** registry:
 * the test derives what the route should land on from it, instead of naming
 * a block that the next new one would displace.
 */
export const blocksTier: GalleryTier = {
  id: "blocks",
  title: "Blocks",
  sections: groupGallery(
    galleryEntriesOf(
      import.meta.glob<GalleryModule<string>>("../../../blocks/**/*.gallery.tsx", { eager: true, import: "default" }),
    ),
    BLOCK_FAMILIES,
  ),
};
