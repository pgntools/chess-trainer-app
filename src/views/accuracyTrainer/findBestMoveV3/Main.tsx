import Box from "@mui/material/Box";

import FindBestMoveV3Route from "./FindBestMoveV3Route";

/**
 * Layout-only wrapper, as on every other screen — the shell already insets and
 * squares the area this fills (`Layout.tsx`, `BOARD_INSET_PX`). A session, or
 * the setup of a new one (CTA-239, `FindBestMoveV3Route`).
 */
const Main = () => (
  <Box data-testid="find-best-move-v3-wrapper" sx={{ height: "100%" }}>
    <FindBestMoveV3Route />
  </Box>
);

export default Main;
