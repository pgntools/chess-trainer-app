import Box from "@mui/material/Box";

import { default as FindBestMoveV2 } from "./FindBestMoveV2";

/**
 * Layout-only wrapper, as on every other screen — the shell already insets and
 * squares the area this fills (`Layout.tsx`, `BOARD_INSET_PX`).
 */
const Main = () => (
  <Box data-testid="find-best-move-v2-wrapper" sx={{ height: "100%" }}>
    <FindBestMoveV2 />
  </Box>
);

export default Main;
