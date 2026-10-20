import Box from "@mui/material/Box";

import FindBestMoveRoute from "./FindBestMoveRoute";

/**
 * Layout-only wrapper, as on every other screen — the shell already insets and
 * squares the area this fills (`Layout.tsx`, `BOARD_INSET_PX`). A session at
 * its address (`FindBestMoveRoute`).
 */
const Main = () => (
  <Box data-testid="find-best-move-v4-wrapper" sx={{ height: "100%" }}>
    <FindBestMoveRoute />
  </Box>
);

export default Main;
