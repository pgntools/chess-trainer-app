import Box from "@mui/material/Box";

import JobsScreen from "./JobsScreen";

/** Layout-only wrapper, as on every other screen — the shell insets and squares the area this fills. */
const JobsMain = () => (
  <Box data-testid="jobs-wrapper" sx={{ height: "100%" }}>
    <JobsScreen />
  </Box>
);

export default JobsMain;
