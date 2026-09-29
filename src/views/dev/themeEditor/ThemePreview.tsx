import { useMemo } from "react";
import { CacheProvider } from "@emotion/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import FormatTextdirectionLToRRoundedIcon from "@mui/icons-material/FormatTextdirectionLToRRounded";
import FormatTextdirectionRToLRoundedIcon from "@mui/icons-material/FormatTextdirectionRToLRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";

import { InlineAlert } from "../../../design-system/components/feedback";
import { ViewToggle } from "../../../design-system/components/toolbars";
import { buildTheme, ltrCache, rtlCache, usePrefersReducedMotion } from "../../../design-system/theme";
import type { ThemeDefinition } from "../../../design-system/themes";
import { BoardPreview, MapPreview } from "./PreviewBoard";
import { UiPreview } from "./PreviewUi";
import type { PreviewKind } from "./sections";

type ThemePreviewProps = {
  theme: ThemeDefinition;
  kind: PreviewKind;
  mode: "light" | "dark";
  onModeChange: (mode: "light" | "dark") => void;
  direction: "ltr" | "rtl";
  onDirectionChange: (direction: "ltr" | "rtl") => void;
};

/**
 * **The live preview** (CTA-115) — the draft built by `buildTheme` for one
 * fixed scheme (no CSS variables, so it sits inside the app's theme without
 * fighting it, as the gallery's preview does), in its own emotion cache and
 * `dir`, so RTL flips it as Hebrew flips the app. Its content follows the
 * section: the UI sample, the board, or the map and the Library's bars. A
 * draft `buildTheme` cannot build (a token MUI refuses) says so instead.
 */
function ThemePreview({ theme, kind, mode, onModeChange, direction, onDirectionChange }: ThemePreviewProps) {
  const reducedMotion = usePrefersReducedMotion();
  const built = useMemo(() => {
    try {
      return { theme: buildTheme(theme, mode, direction, { reducedMotion }) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [theme, mode, direction, reducedMotion]);

  return (
    <Box
      component="section"
      aria-labelledby="theme-editor-preview-title"
      data-testid="theme-editor-preview"
      sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0, height: "100%" }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, flexShrink: 0 }}>
        <Typography id="theme-editor-preview-title" variant="subtitle1" component="h2" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Preview
        </Typography>
        <ViewToggle
          value={mode}
          onChange={onModeChange}
          options={[
            { value: "light", label: "Light", icon: <LightModeRoundedIcon fontSize="small" /> },
            { value: "dark", label: "Dark", icon: <DarkModeRoundedIcon fontSize="small" /> },
          ]}
          ariaLabel="The preview's colour scheme"
          testId="theme-editor-preview-mode"
        />
        <ViewToggle
          value={direction}
          onChange={onDirectionChange}
          options={[
            { value: "ltr", label: "Left to right", icon: <FormatTextdirectionLToRRoundedIcon fontSize="small" /> },
            { value: "rtl", label: "Right to left", icon: <FormatTextdirectionRToLRoundedIcon fontSize="small" /> },
          ]}
          ariaLabel="The preview's direction"
          testId="theme-editor-preview-direction"
        />
      </Box>
      {"error" in built ? (
        <InlineAlert severity="error" title="The preview cannot build this theme" detail={built.error} testId="theme-editor-preview-error">
          MUI refused one of its tokens. Fix it — or undo the last change — and the preview comes back.
        </InlineAlert>
      ) : (
        <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>
          <ThemeProvider theme={built.theme}>
            <Box
              data-testid="theme-editor-preview-body"
              data-mode={mode}
              data-direction={direction}
              data-kind={kind}
              dir={direction}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: 2,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.default",
                color: "text.primary",
                fontFamily: built.theme.typography.fontFamily,
              }}
            >
              {kind === "board" ? <BoardPreview /> : kind === "map" ? <MapPreview /> : <UiPreview />}
            </Box>
          </ThemeProvider>
        </CacheProvider>
      )}
    </Box>
  );
}

export default ThemePreview;
