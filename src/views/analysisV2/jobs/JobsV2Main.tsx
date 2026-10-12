import Box from "@mui/material/Box";

import JobsV2Screen from "./JobsV2Screen";

/** Layout-only wrapper, as on every other screen — the shell insets and squares the area this fills. */
const JobsV2Main = () => (
  <Box data-testid="analysis-v2-jobs-wrapper" sx={{ height: "100%" }}>
    <JobsV2Screen />
  </Box>
);

export default JobsV2Main;
