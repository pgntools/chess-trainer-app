import Box from "@mui/material/Box";

import { default as FindBestMoveV3 } from "./FindBestMoveV3";

/**
 * Layout-only wrapper, as on every other screen — the shell already insets and
 * squares the area this fills (`Layout.tsx`, `BOARD_INSET_PX`).
 */
const Main = () => (
  <Box data-testid="find-best-move-v3-wrapper" sx={{ height: "100%" }}>
    <FindBestMoveV3 />
  </Box>
);

export default Main;
