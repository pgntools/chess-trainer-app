import Box from "@mui/material/Box";

import JobsSettingsScreen from "./JobsSettingsScreen";

/** Layout-only wrapper, as on every other screen — the shell insets the area this fills. */
const JobsSettingsMain = () => (
  <Box data-testid="jobs-settings-wrapper" sx={{ height: "100%" }}>
    <JobsSettingsScreen />
  </Box>
);

export default JobsSettingsMain;
