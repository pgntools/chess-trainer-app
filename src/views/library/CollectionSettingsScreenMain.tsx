import Box from "@mui/material/Box";

import { default as CollectionSettingsScreen } from "./CollectionSettingsScreen";

/**
 * Layout-only wrapper, as on every other screen — the shell already insets and
 * squares the area this fills (`Layout.tsx`, `BOARD_INSET_PX`).
 */
const Main = () => (
  <Box data-testid="library-collection-settings-wrapper" sx={{ height: "100%" }}>
    <CollectionSettingsScreen />
  </Box>
);

export default Main;
