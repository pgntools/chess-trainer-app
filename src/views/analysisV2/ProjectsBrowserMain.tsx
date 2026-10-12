import Box from "@mui/material/Box";

import ProjectsBrowser from "./ProjectsBrowser";

/** Layout-only wrapper, as on every other screen — the shell insets the area this fills (`Layout.tsx`). */
const ProjectsBrowserMain = () => (
  <Box sx={{ height: "100%" }}>
    <ProjectsBrowser />
  </Box>
);

export default ProjectsBrowserMain;
