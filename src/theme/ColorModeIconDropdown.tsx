import DarkModeIcon from "@mui/icons-material/DarkModeRounded";
import LightModeIcon from "@mui/icons-material/LightModeRounded";
import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { IconAction } from "../design-system/components/toolbars";

/** The header's light / dark switch — the design system's `IconAction` (CTA-113), named and with its tooltip. */
export default function ColorModeIconDropdown() {
  const { mode, systemMode, setMode } = useColorScheme();
  const { t } = useTranslation();

  // `mode` is undefined until the provider has read localStorage. Rendering a
  // same-sized placeholder instead of a guessed icon keeps the header from
  // shifting and avoids showing the wrong icon for a frame.
  if (!mode) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          width: "2.25rem",
          height: "2.25rem",
          // `borderRadius: 1` is one unit of theme.shape.borderRadius. Do not
          // interpolate the theme value here: under cssVariables it is already
          // a complete CSS value (`var(--mui-shape-borderRadius, 10px)`), so
          // appending "px" produces an invalid length that is silently dropped
          // — and passing the raw number instead yields calc(10 * 10px).
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
        }}
      />
    );
  }

  const resolvedMode = (systemMode || mode) as "light" | "dark";

  return (
    <IconAction
      label={t("nav.toggleColorMode")}
      onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
      testId="header-color-mode"
    >
      {resolvedMode === "dark" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
    </IconAction>
  );
}
