import Box from "@mui/material/Box";

import LegalPage from "./LegalPage";

/** Layout-only wrappers, as on every other screen — the shell centres and scrolls the article column (CTA-130). */
export const PrivacyMain = () => (
  <Box data-testid="privacy-wrapper">
    <LegalPage page="privacy" />
  </Box>
);

export const CookiesMain = () => (
  <Box data-testid="cookies-wrapper">
    <LegalPage page="cookies" />
  </Box>
);
