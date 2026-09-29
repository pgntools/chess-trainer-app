import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

import type { VisibleLabel } from "../../a11y";
import { linkProps, type LinkTarget } from "../../link";
import { panelTabIds } from "./panelIds";

/** One tab: its id (the value), its words, and — for a routed strip — where it goes. */
export type PanelTab = { id: string; label: VisibleLabel; disabled?: boolean; link?: LinkTarget };

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
  /**
   * Links each tab to its panel (CTA-112): the tabs take ids under this
   * prefix and the selected one points at its panel (`aria-controls`), which
   * the host marks with `tabPanelProps(idPrefix, id)`. Unique on the page.
   * Absent, the tabs carry no ids — as before.
   */
  idPrefix?: string;
  /** The strip's test id; each tab is `<testId>-tab-<id>`. */
  testId: string;
  /**
   * The prefix of the tabs' test ids, for a host whose tests named its tabs
   * after itself rather than after the strip (CTA-113: the position editor's
   * `editor-tab-fen`). Absent, the strip's `testId`.
   */
  tabTestIdPrefix?: string;
};

/**
 * **The board panel's tab strip** (CTA-108), which `BoardPanel`,
 * `NewGameForm`, `PositionEditor`, `SettingsScreen` and `NagDialog` each
 * copied: words as written (`textTransform: none`), no minimum tab width, a
 * divider under it. A tab with a `link` is a real link — a routed strip (the
 * Settings tabs) — and `size="tall"` is the dialog's taller strip. With an
 * `idPrefix`, each tab names its panel (CTA-112, `tabPanelProps`).
 */
function PanelTabs({
  tabs,
  value,
  onChange,
  size = "compact",
  fullWidth = true,
  ariaLabel,
  idPrefix,
  testId,
  tabTestIdPrefix = testId,
}: PanelTabsProps) {
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
          id={idPrefix === undefined ? undefined : panelTabIds(idPrefix, tab.id).tab}
          // Only the selected tab's panel is on the page to point at.
          aria-controls={idPrefix === undefined || tab.id !== value ? undefined : panelTabIds(idPrefix, tab.id).panel}
          data-testid={`${tabTestIdPrefix}-tab-${tab.id}`}
          {...linkProps(tab.link)}
        />
      ))}
    </Tabs>
  );
}

export default PanelTabs;
