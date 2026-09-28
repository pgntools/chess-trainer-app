import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import PanelTabs, { type PanelTab, type PanelTabsProps } from "./PanelTabs";

const BOARD_TABS: PanelTab[] = [
  { id: "moves", label: "Moves" },
  { id: "map", label: "Map" },
  { id: "load", label: "Load" },
  { id: "export", label: "Export" },
  { id: "engine", label: "Engine" },
];

const live = (tabs: PanelTab[], initial: string, props: Partial<PanelTabsProps> = {}) => (
  <Box sx={{ maxWidth: 420 }}>
    <WithState initial={initial}>
      {(value, setValue) => (
        <>
          <PanelTabs tabs={tabs} value={value} onChange={setValue} ariaLabel="Panel" testId="gallery-tabs" {...props} />
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            The {value} tab's content.
          </Typography>
        </>
      )}
    </WithState>
  </Box>
);

const gallery: GalleryModule = {
  section: "tabs",
  title: "PanelTabs",
  demos: [
    { name: "Compact, full width — the board panel", render: () => live(BOARD_TABS, "moves") },
    {
      name: "A disabled tab",
      render: () => live([...BOARD_TABS.slice(0, 2), { id: "score", label: "Score", disabled: true }, BOARD_TABS[4]], "moves"),
    },
    {
      name: "Tall — a dialog's strip",
      render: () =>
        live(
          [
            { id: "move", label: "Move" },
            { id: "position", label: "Position" },
            { id: "features", label: "Features" },
          ],
          "move",
          { size: "tall" },
        ),
    },
    {
      name: "Link tabs, sized to their words — a routed strip",
      render: () => (
        <PanelTabs
          ariaLabel="Settings"
          value="storage"
          fullWidth={false}
          tabs={[
            { id: "export", label: "Export", link: { href: "#export" } },
            { id: "import", label: "Import", link: { href: "#import" } },
            { id: "storage", label: "Storage", link: { href: "#storage" } },
            { id: "appearance", label: "Appearance", link: { href: "#appearance" } },
          ]}
          testId="gallery-tabs-links"
        />
      ),
    },
  ],
};

export default gallery;
