import Box from "@mui/material/Box";

import ProjectScreen from "./ProjectScreen";

/** Layout-only wrapper, as on every other screen — the shell insets the area this fills (`Layout.tsx`). */
const ProjectScreenMain = () => (
  <Box sx={{ height: "100%" }}>
    <ProjectScreen />
  </Box>
);

export default ProjectScreenMain;
