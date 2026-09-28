import { useMemo, useRef, useState } from "react";
import { CacheProvider } from "@emotion/react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { buildTheme, ltrCache, rtlCache } from "../theme";
import { DEFAULT_THEME_ID, themeById, themes } from "../themes";
import { discoverGallery } from "./discover";

/** Found once: the glob is resolved at build time, so it never changes. */
const sections = discoverGallery();

type Mode = "light" | "dark";
type Direction = "ltr" | "rtl";

type DesignGalleryProps = {
  /** The theme the gallery opens on — the reader's own, from the route. */
  initialThemeId?: string;
  /** The scheme it opens on — the app's, from the route. */
  initialMode?: Mode;
};

/**
 * **The design gallery** (`/dev/design`, CTA-107, dev-only): every section's
 * components and their variations, in one place, under any registered theme,
 * either colour scheme and either direction.
 *
 * The preview is its **own** theme — `buildTheme` for one fixed scheme, which
 * carries no CSS variables, so it sits inside the app's theme without fighting
 * it over the page's — and its own emotion cache and `dir`, so RTL flips it as
 * Hebrew flips the app. The switches change the preview only, never the app.
 *
 * A **section menu** runs down its left: one link per section, scrolling the
 * preview to it, the section in view marked as the reader scrolls. The route
 * takes the shell's whole body (`FULL_WIDTH_ROUTE`), so there is no board
 * square and no right-hand panel beside it.
 *
 * Its words are English and not in the catalogs: the gallery never ships
 * (`App.tsx`'s Development routes), so neither should they.
 */
function DesignGallery({ initialThemeId = DEFAULT_THEME_ID, initialMode = "light" }: DesignGalleryProps) {
  const { t } = useTranslation();
  const [themeId, setThemeId] = useState(() => themeById(initialThemeId).id);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [direction, setDirection] = useState<Direction>("ltr");

  const theme = useMemo(
    () => buildTheme(themeById(themeId), mode, direction),
    [themeId, mode, direction],
  );

  // The section menu: the one in view, and where each one starts.
  const [activeSection, setActiveSection] = useState(sections[0]?.id);
  const previewRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  const goToSection = (id: string) => {
    setActiveSection(id);
    sectionRefs.current.get(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  // The last section whose top has reached the preview's top is the one in view.
  const followScroll = () => {
    const preview = previewRef.current;
    if (preview === null) return;
    const top = preview.getBoundingClientRect().top;
    let current = sections[0]?.id;
    for (const { id } of sections) {
      const element = sectionRefs.current.get(id);
      if (element !== undefined && element.getBoundingClientRect().top - top <= 24) current = id;
    }
    setActiveSection(current);
  };

  return (
    <Box
      data-testid="design-gallery"
      sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Box sx={{ flexShrink: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Design system
        </Typography>
        <TextField
          select
          size="small"
          label="Theme"
          value={themeId}
          onChange={(event) => setThemeId(event.target.value)}
          slotProps={{ htmlInput: { "data-testid": "design-gallery-theme" } }}
          sx={{ minWidth: 140 }}
        >
          {themes.map((candidate) => (
            <MenuItem key={candidate.id} value={candidate.id}>
              {t(candidate.labelKey)}
            </MenuItem>
          ))}
        </TextField>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_event, next: Mode | null) => next !== null && setMode(next)}
          aria-label="Colour scheme"
        >
          <ToggleButton value="light" data-testid="design-gallery-mode-light">
            Light
          </ToggleButton>
          <ToggleButton value="dark" data-testid="design-gallery-mode-dark">
            Dark
          </ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={direction}
          onChange={(_event, next: Direction | null) => next !== null && setDirection(next)}
          aria-label="Direction"
        >
          <ToggleButton value="ltr" data-testid="design-gallery-direction-ltr">
            LTR
          </ToggleButton>
          <ToggleButton value="rtl" data-testid="design-gallery-direction-rtl">
            RTL
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 2 }}>
        <Box
          component="nav"
          aria-label="Sections"
          data-testid="design-gallery-nav"
          sx={{
            width: 200,
            flexShrink: 0,
            overflowY: "auto",
            borderInlineEnd: "1px solid",
            borderColor: "divider",
            paddingInlineEnd: 1,
          }}
        >
          <List dense disablePadding>
            {sections.map((section) => (
              <ListItemButton
                key={section.id}
                selected={section.id === activeSection}
                aria-current={section.id === activeSection ? "true" : undefined}
                onClick={() => goToSection(section.id)}
                data-testid={`design-gallery-nav-${section.id}`}
              >
                <ListItemText
                  primary={section.title}
                  secondary={`${section.modules.length}`}
                  slotProps={{ secondary: { component: "span" } }}
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
        <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>
          <ThemeProvider theme={theme}>
            <Box
              ref={previewRef}
              onScroll={followScroll}
              data-testid="design-gallery-preview"
              data-theme={themeId}
              data-mode={mode}
              dir={direction}
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                overflowY: "auto",
                p: 2,
                borderRadius: 1,
                bgcolor: "background.default",
                color: "text.primary",
                display: "grid",
                gap: 3,
                alignContent: "start",
              }}
            >
              {sections.map((section) => (
                <Box
                  component="section"
                  key={section.id}
                  ref={(element: HTMLElement | null) => {
                    if (element === null) sectionRefs.current.delete(section.id);
                    else sectionRefs.current.set(section.id, element);
                  }}
                  data-testid={`design-gallery-section-${section.id}`}
                  sx={{ display: "grid", gap: 1.5 }}
                >
                  <Typography variant="h3" component="h2">
                    {section.title}
                  </Typography>
                  {section.modules.map((module) => (
                    <Box key={module.title} sx={{ display: "grid", gap: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {module.title}
                      </Typography>
                      {module.demos.map((demo) => (
                        <Paper
                          key={demo.name}
                          variant="outlined"
                          data-testid={`design-gallery-demo-${section.id}`}
                          sx={{ p: 2, display: "grid", gap: 1 }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {demo.name}
                          </Typography>
                          {demo.render()}
                        </Paper>
                      ))}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </ThemeProvider>
        </CacheProvider>
      </Box>
    </Box>
  );
}

export default DesignGallery;
