import Box from "@mui/material/Box";

import { default as Home } from "./Home";

/**
 * Layout-only wrapper, as on every other screen — the shell already insets the
 * page and centres it as an article (`Layout.tsx`, `ARTICLE_ROUTE`, CTA-130),
 * and scrolls it.
 */
const Main = () => (
  <Box data-testid="home-wrapper">
    <Home />
  </Box>
);

export default Main;
