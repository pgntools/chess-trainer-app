import Box from "@mui/material/Box";

import JobScreen from "./JobScreen";

/** Layout-only wrapper, as on every other screen — the shell insets the area this fills. */
const JobMain = () => (
  <Box data-testid="job-wrapper" sx={{ height: "100%" }}>
    <JobScreen />
  </Box>
);

export default JobMain;
