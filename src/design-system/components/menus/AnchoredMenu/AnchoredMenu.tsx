import type { ReactNode } from "react";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";

import { linkProps, type LinkTarget } from "../../link";

/** One entry: an action, or a place to go. */
export type AnchoredMenuEntry = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  /** Go somewhere — a real link, so a middle click opens a tab. */
  link?: LinkTarget;
  /** The entry for where the reader already is. */
  selected?: boolean;
  disabled?: boolean;
};

export type AnchoredMenuProps = {
  /** The button it hangs from; `null` is closed. */
  anchorEl: HTMLElement | null;
  onClose: () => void;
  entries: readonly AnchoredMenuEntry[];
  /** The menu's test id; each entry is `<testId>-<id>`. */
  testId: string;
};

/**
 * **A menu hanging from a button** (CTA-108) — the repertoire's games menu:
 * under its anchor, aligned to the anchor's inline end, entries that are
 * actions or real links, the current one marked. Choosing an entry closes it.
 */
function AnchoredMenu({ anchorEl, onClose, entries, testId }: AnchoredMenuProps) {
  const { direction } = useTheme();
  // Popover places by the page's sides, so the inline end is picked here.
  const end = direction === "rtl" ? "left" : "right";
  return (
    <Menu
      open={anchorEl !== null}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: end }}
      transformOrigin={{ vertical: "top", horizontal: end }}
      dir={direction}
      data-testid={testId}
    >
      {entries.map((entry) => (
        <MenuItem
          key={entry.id}
          selected={entry.selected}
          disabled={entry.disabled}
          aria-current={entry.selected === true ? "page" : undefined}
          data-testid={`${testId}-${entry.id}`}
          onClick={() => {
            onClose();
            entry.onClick?.();
          }}
          {...linkProps(entry.link)}
        >
          {entry.icon !== undefined && <ListItemIcon>{entry.icon}</ListItemIcon>}
          <ListItemText>{entry.label}</ListItemText>
        </MenuItem>
      ))}
    </Menu>
  );
}

export default AnchoredMenu;
