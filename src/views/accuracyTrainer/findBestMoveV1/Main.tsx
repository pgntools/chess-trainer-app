import Box from "@mui/material/Box";

import { default as FindBestMoveV1 } from "./FindBestMoveV1";

/**
 * Layout-only wrapper, as on every other screen — the shell already insets and
 * squares the area this fills (`Layout.tsx`, `BOARD_INSET_PX`).
 */
const Main = () => (
  <Box data-testid="find-best-move-v1-wrapper" sx={{ height: "100%" }}>
    <FindBestMoveV1 />
  </Box>
);

export default Main;
