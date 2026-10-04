import Box from "@mui/material/Box";

import { useOwnPageHeading } from "../../main/pageTitle";
import MdxEditor from "./MdxEditor";

/**
 * Layout-only wrapper, as on every other screen — the dev-only MDX editor
 * (`/dev/mdx-editor`): an article's MDX beside its live rendering. Reached
 * only through `routes.tsx`'s Development routes, so it — and the MDX
 * compiler it loads — never ships.
 */
const Main = () => {
  // The editor's own title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  return (
    <Box data-testid="mdx-editor-wrapper" sx={{ height: { md: "100%" } }}>
      <MdxEditor />
    </Box>
  );
};

export default Main;
