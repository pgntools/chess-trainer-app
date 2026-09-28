import type { ReactNode } from "react";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

import { linkProps, type LinkTarget } from "../../link";

/** One tab: its id (the value), its words, and — for a routed strip — where it goes. */
export type PanelTab = { id: string; label: ReactNode; disabled?: boolean; link?: LinkTarget };

export type PanelTabsProps = {
  tabs: readonly PanelTab[];
  /** The tab on screen — `false` for none (a routed strip on a route none of them names). */
  value: string | false;
  /** A tab picked; a routed strip's tabs are links and may leave it out. */
  onChange?: (id: string) => void;
  /** `compact` (36 px, the board panel's) or `tall` (48 px, a dialog's). */
  size?: "compact" | "tall";
  /** Share the width equally (the default) or size each tab to its words. */
  fullWidth?: boolean;
  /** The strip's accessible name. */
  ariaLabel: string;
  /** The strip's test id; each tab is `<testId>-tab-<id>`. */
  testId: string;
};

/**
 * **The board panel's tab strip** (CTA-108), which `BoardPanel`,
 * `NewGameForm`, `PositionEditor`, `SettingsScreen` and `NagDialog` each
 * copied: words as written (`textTransform: none`), no minimum tab width, a
 * divider under it. A tab with a `link` is a real link — a routed strip (the
 * Settings tabs) — and `size="tall"` is the dialog's taller strip.
 */
function PanelTabs({ tabs, value, onChange, size = "compact", fullWidth = true, ariaLabel, testId }: PanelTabsProps) {
  const height = size === "compact" ? 36 : 48;
  return (
    <Tabs
      value={value}
      onChange={(_event, next: string) => onChange?.(next)}
      variant={fullWidth ? "fullWidth" : "scrollable"}
      scrollButtons={fullWidth ? undefined : "auto"}
      aria-label={ariaLabel}
      data-testid={testId}
      sx={{
        flexShrink: 0,
        minHeight: height,
        borderBottom: "1px solid",
        borderColor: "divider",
        "& .MuiTab-root": { minHeight: height, minWidth: 0, px: 1, textTransform: "none" },
      }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          value={tab.id}
          label={tab.label}
          disabled={tab.disabled}
          data-testid={`${testId}-tab-${tab.id}`}
          {...linkProps(tab.link)}
        />
      ))}
    </Tabs>
  );
}

export default PanelTabs;
