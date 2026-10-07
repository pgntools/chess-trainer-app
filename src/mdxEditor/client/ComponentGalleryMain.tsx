import Box from "@mui/material/Box";

import { useOwnPageHeading } from "../../views/main/pageTitle";
import ComponentGallery from "./ComponentGallery";

/**
 * Layout-only wrapper, as on every other screen — the MDX editor's
 * Components gallery (`/dev/mdx-editor/components`, CTA-140): every
 * component an article embeds, to set up and try. Reached only under
 * `yarn mdx-editor:start`, so it never ships.
 */
const ComponentGalleryMain = () => {
  // The gallery's own title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  return (
    <Box data-testid="mdx-component-gallery-wrapper" sx={{ height: { md: "100%" } }}>
      <ComponentGallery />
    </Box>
  );
};

export default ComponentGalleryMain;
