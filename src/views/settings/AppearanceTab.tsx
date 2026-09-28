import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import type { PaletteOptions } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { themes, type ThemeDefinition } from "../../design-system/themes";
import { useThemeChoice } from "../../theme/themeChoice";

/** A colour out of a palette's options, which may be a colour or an object. */
const colorOf = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (value !== null && typeof value === "object" && "main" in value) {
    return typeof value.main === "string" ? value.main : undefined;
  }
  return undefined;
};

/** One scheme of a theme in miniature: its page, a paper card, a line of text and its primary. */
function SchemePreview({ palette }: { palette: PaletteOptions }) {
  const page = palette.background?.default;
  const paper = palette.background?.paper;
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 56,
        height: 40,
        p: 0.5,
        borderRadius: 0.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: page,
        display: "grid",
        alignContent: "start",
        gap: 0.5,
      }}
    >
      <Box sx={{ height: 6, width: "70%", borderRadius: 0.25, bgcolor: palette.text?.primary }} />
      <Box sx={{ height: 14, borderRadius: 0.25, bgcolor: paper, display: "flex", alignItems: "center", px: 0.5 }}>
        <Box sx={{ height: 6, width: 18, borderRadius: 0.25, bgcolor: colorOf(palette.primary) }} />
      </Box>
    </Box>
  );
}

/** The theme's board in miniature: two squares of each colour, one under the last-move fill. */
function BoardPreview({ chess }: { chess: ThemeDefinition["chess"] }) {
  const { lightSquare, darkSquare } = chess.board;
  const squares = [lightSquare, darkSquare, darkSquare, lightSquare];
  return (
    <Box
      aria-hidden="true"
      dir="ltr"
      sx={{ width: 40, height: 40, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 0.5, overflow: "hidden" }}
    >
      {squares.map((square, index) => (
        <Box
          key={index}
          sx={{ bgcolor: square, backgroundImage: index === 3 ? `linear-gradient(${chess.lastMove}, ${chess.lastMove})` : undefined }}
        />
      ))}
    </Box>
  );
}

/**
 * **Settings → Appearance** (`/settings/appearance`, CTA-107): the reader
 * picks a theme from the registry, each shown in miniature — its light and
 * dark schemes and its board. The choice applies at once and is a preference
 * (`localStorage`, `theme/themeChoice.ts`); light and dark stay the header's
 * switch, under every theme.
 */
function AppearanceTab() {
  const { t } = useTranslation();
  const { themeId, setThemeId } = useThemeChoice();

  return (
    <Box data-testid="appearance-tab" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {t("settings.appearance.intro")}
      </Typography>
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, display: "grid", gap: 1 }}>
        <FormLabel component="legend" sx={{ typography: "body2", fontWeight: 600, mb: 0.5 }}>
          {t("settings.appearance.theme")}
        </FormLabel>
        <RadioGroup value={themeId} onChange={(_event, next) => setThemeId(next)} sx={{ gap: 1 }}>
          {themes.map((theme) => (
            <FormControlLabel
              key={theme.id}
              value={theme.id}
              data-testid={`appearance-theme-${theme.id}`}
              sx={{
                mx: 0,
                p: 1,
                gap: 1,
                borderRadius: 1,
                border: "1px solid",
                borderColor: theme.id === themeId ? "primary.main" : "divider",
              }}
              control={
                <Radio
                  size="small"
                  slotProps={{ input: { "data-testid": `appearance-theme-${theme.id}-radio` } as object }}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 96 }}>
                    {t(theme.labelKey)}
                  </Typography>
                  <Box
                    data-testid={`appearance-theme-${theme.id}-preview`}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <SchemePreview palette={theme.light} />
                    <SchemePreview palette={theme.dark} />
                    <BoardPreview chess={theme.chess} />
                  </Box>
                </Box>
              }
            />
          ))}
        </RadioGroup>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {t("settings.appearance.modeNote")}
      </Typography>
    </Box>
  );
}

export default AppearanceTab;
