import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, Navigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { PanelTabs, tabPanelProps } from "../../design-system/components/tabs";

import AppearanceTab from "./AppearanceTab";
import ExportTab from "./ExportTab";
import ImportTab from "./ImportTab";
import StorageTab from "./StorageTab";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";

/**
 * **Settings** (`/settings/<tab>`, CTA-86) — the app's own settings, one tab
 * per concern. A tab is a route segment, so each is linkable and has its own
 * nav entry; **adding one** is an entry in {@link SETTINGS_TABS}, a
 * `navItems()` entry in the Settings folder, and its `settings.tabs.<id>` key
 * in both catalogs. An unknown tab lands on the first. The strip is the
 * design system's `PanelTabs`, its tabs links sized to their words (CTA-109).
 */
const SETTINGS_TABS: readonly { id: string; content: () => ReactNode }[] = [
  { id: "export", content: () => <ExportTab /> },
  { id: "import", content: () => <ImportTab /> },
  { id: "storage", content: () => <StorageTab /> },
  { id: "appearance", content: () => <AppearanceTab /> },
];

function SettingsScreen() {
  const { t } = useTranslation();
  const { tab } = useParams();
  const active = SETTINGS_TABS.find((candidate) => candidate.id === tab);
  // The page is the tab — "Export — Settings" (CTA-112); the visible title is its `h1`.
  usePageTitle(active === undefined ? undefined : t(`settings.tabs.${active.id}`));
  useOwnPageHeading();
  if (active === undefined) return <Navigate to={`/settings/${SETTINGS_TABS[0].id}`} replace />;

  return (
    <Box
      data-testid="settings-screen"
      sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 700, flexShrink: 0 }}>
        {t("settings.title")}
      </Typography>
      <PanelTabs
        tabs={SETTINGS_TABS.map(({ id }) => ({
          id,
          label: t(`settings.tabs.${id}`),
          link: { component: RouterLink, to: `/settings/${id}` },
        }))}
        value={active.id}
        fullWidth={false}
        ariaLabel={t("settings.title")}
        idPrefix="settings"
        testId="settings"
      />
      <Box
        {...tabPanelProps("settings", active.id)}
        data-testid={`settings-tab-content-${active.id}`}
        sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        {active.content()}
      </Box>
    </Box>
  );
}

export default SettingsScreen;
