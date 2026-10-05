import { useMemo, useState } from "react";
import { CacheProvider } from "@emotion/react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { Navigate, Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { Breadcrumbs } from "../components/navigation";
import { TreeView, ancestorsOf, type TreeNode } from "../patterns/trees";
import { buildTheme, ltrCache, rtlCache, usePrefersReducedMotion } from "../theme";
import { DEFAULT_THEME_ID, themeById, themes } from "../themes";
import { discoverTiers, pageKeyOf } from "./discover";
import type { GalleryEntry, GallerySection, GalleryTier } from "./types";

/** Found once: the globs are resolved at build time, so they never change. */
const ownTiers = discoverTiers();

const NO_TIERS: readonly GalleryTier[] = [];

/**
 * A page of the gallery — **one component**, under its key: its section's
 * key and its own id (`tables/TableFrame`, `patterns/tables/DataTable`,
 * `blocks/trees/FolderTree`).
 */
type Page = { key: string; sectionKey: string; tier: GalleryTier; section: GallerySection; entry: GalleryEntry };

/** A key as a test id's or a node id's tail: `tables-TableFrame`, `patterns-tables`. */
const slugOf = (key: string) => key.replaceAll("/", "-");
/** A tier's node in the menu: `base`, `patterns`, `blocks`. */
const tierNodeId = (tier: GalleryTier) => tier.id || "base";

type Mode = "light" | "dark";
type Direction = "ltr" | "rtl";

type DesignGalleryProps = {
  /**
   * The page on screen, as the route names it — a component's key
   * (`tables/TableFrame`, `patterns/tables/DataTable`). A section's key
   * (`tables`, the CTA-107 pages) lands on its first component; `undefined`
   * or unknown lands on the first page of all.
   */
  section: string | undefined;
  /** Where a page is — the route's business, handed in, so the gallery knows no route. */
  sectionPath: (page: string) => string;
  /** Where the gallery starts — the tier crumb's link, handed in for the same reason. */
  startPath: string;
  /**
   * Tiers from outside the design system, after its own Base and Patterns
   * (CTA-110): the dev route discovers `src/blocks/` and hands it in as
   * Blocks, because the design system may not import a block.
   */
  tiers?: readonly GalleryTier[];
  /** The theme the gallery opens on — the reader's own, from the route. */
  initialThemeId?: string;
  /** The scheme it opens on — the app's, from the route. */
  initialMode?: Mode;
  /** The direction it opens on — left to right unless asked. */
  initialDirection?: Direction;
};

/**
 * **The design gallery** (`/dev/design/…`, CTA-107, dev-only): **one page per
 * component** — its variations — under any registered theme, either colour
 * scheme and either direction.
 *
 * The menu down the left is a **collapsible tree** (CTA-110, the `TreeView`
 * pattern): tier → section → component. The tiers are Base
 * (`/dev/design/<section>/<component>`), Patterns
 * (`/dev/design/patterns/<section>/<component>`) and whatever the route hands
 * in as `tiers` — Blocks (`/dev/design/blocks/<family>/<block>`). One
 * catalogue of every tier. The chain above the page on screen opens with it;
 * the reader opens and closes the rest, and they stay as left while the pages
 * change. The page's own title is a `Breadcrumbs` trail — tier, section, the
 * component on screen — so the way up is the way back (CTA-133).
 *
 * The preview is its **own** theme — `buildTheme` for one fixed scheme, which
 * carries no CSS variables, so it sits inside the app's theme without fighting
 * it over the page's — and its own emotion cache and `dir`, so RTL flips it as
 * Hebrew flips the app. The switches change the preview only, never the app,
 * and they hold as the reader moves between pages (the route keeps this
 * component mounted; only its `section` changes).
 *
 * Its words are English and not in the catalogs: the gallery never ships
 * (`routes.tsx`'s Development routes), so neither should they.
 */
function DesignGallery({
  section,
  sectionPath,
  startPath,
  initialThemeId = DEFAULT_THEME_ID,
  initialMode = "light",
  initialDirection = "ltr",
  tiers = NO_TIERS,
}: DesignGalleryProps) {
  const { t } = useTranslation();
  const [themeId, setThemeId] = useState(() => themeById(initialThemeId).id);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [direction, setDirection] = useState<Direction>(initialDirection);

  const reducedMotion = usePrefersReducedMotion();
  const theme = useMemo(
    () => buildTheme(themeById(themeId), mode, direction, { reducedMotion }),
    [themeId, mode, direction, reducedMotion],
  );

  const { pages, nodes } = useMemo(() => {
    const shown = [...ownTiers, ...tiers].filter((tier) => tier.sections.length > 0);
    const found: Page[] = [];
    const tree: TreeNode[] = shown.map((tier) => ({
      id: tierNodeId(tier),
      label: tier.title,
      children: tier.sections.map((candidate) => {
        const sectionKey = pageKeyOf(tier.id, candidate.id);
        return {
          id: slugOf(sectionKey),
          label: candidate.title,
          secondary: candidate.modules.length,
          children: candidate.modules.map((entry) => {
            const key = `${sectionKey}/${entry.id}`;
            found.push({ key, sectionKey, tier, section: candidate, entry });
            return {
              id: slugOf(key),
              label: entry.title,
              link: { component: RouterLink, to: sectionPath(key) },
            };
          }),
        };
      }),
    }));
    return { pages: found, nodes: tree };
  }, [tiers, sectionPath]);

  const page = pages.find((candidate) => candidate.key === section);
  const activeId = page === undefined ? undefined : slugOf(page.key);

  /*
    The chain above the page on screen is open — on arrival, and whenever the
    page changes (adjusted during render against the page before, as the
    sidebar's open chain is). Everything else the reader opened stays open.
  */
  const [open, setOpen] = useState(() => new Set(activeId === undefined ? [] : ancestorsOf(nodes, activeId)));
  const [openedFor, setOpenedFor] = useState(activeId);
  if (activeId !== openedFor) {
    setOpenedFor(activeId);
    if (activeId !== undefined) setOpen((before) => new Set([...before, ...ancestorsOf(nodes, activeId)]));
  }

  if (page === undefined) {
    if (pages.length === 0) return null;
    const first = pages.find((candidate) => candidate.sectionKey === section) ?? pages[0];
    return <Navigate to={sectionPath(first.key)} replace />;
  }
  const sectionSlug = slugOf(page.sectionKey);

  return (
    <Box
      data-testid="design-gallery"
      sx={{ height: "100%", minHeight: 0, display: "flex", gap: 2 }}
    >
      <Box
        component="nav"
        aria-label="Sections"
        data-testid="design-gallery-menu"
        sx={{
          width: 260,
          flexShrink: 0,
          overflowY: "auto",
          borderInlineEnd: "1px solid",
          borderColor: "divider",
          paddingInlineEnd: 1,
        }}
      >
        <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 700, px: 2, py: 1 }}>
          Design system
        </Typography>
        <TreeView
          nodes={nodes}
          open={open}
          onToggle={(id) =>
            setOpen((before) => {
              const next = new Set(before);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          activeId={activeId}
          ariaLabel="Components"
          hint="Up and down arrows to move, right to open, left to close, Enter to go."
          testId="design-gallery-nav"
        />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ flexShrink: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Breadcrumbs
              ariaLabel="Gallery"
              testId="design-gallery-breadcrumbs"
              crumbs={[
                { id: tierNodeId(page.tier), label: page.tier.title, link: { component: RouterLink, to: startPath } },
                { id: slugOf(page.sectionKey), label: page.section.title, link: { component: RouterLink, to: sectionPath(page.sectionKey) } },
              ]}
              current={page.entry.title}
            />
          </Box>
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

        <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>
          <ThemeProvider theme={theme}>
            <Box
              data-testid="design-gallery-preview"
              data-page={page.key}
              data-section={page.sectionKey}
              data-component={page.entry.id}
              data-tier={tierNodeId(page.tier)}
              data-theme={themeId}
              data-mode={mode}
              dir={direction}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: 2,
                borderRadius: 1,
                bgcolor: "background.default",
                color: "text.primary",
                display: "grid",
                gap: 2,
                alignContent: "start",
              }}
            >
              {page.entry.demos.map((demo) => (
                <Paper
                  key={demo.name}
                  variant="outlined"
                  data-testid={`design-gallery-demo-${sectionSlug}`}
                  sx={{ p: 2, display: "grid", gap: 1 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {demo.name}
                  </Typography>
                  {demo.render()}
                </Paper>
              ))}
            </Box>
          </ThemeProvider>
        </CacheProvider>
      </Box>
    </Box>
  );
}

export default DesignGallery;
