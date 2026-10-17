import Box from "@mui/material/Box";

import CaseWorkspace from "./CaseWorkspace";

/** Layout-only wrapper, as on every other screen — the shell insets the area this fills (`Layout.tsx`). */
const CaseWorkspaceMain = () => (
  <Box sx={{ height: "100%" }}>
    <CaseWorkspace />
  </Box>
);

export default CaseWorkspaceMain;
