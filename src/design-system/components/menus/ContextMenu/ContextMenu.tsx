import type { ReactNode } from "react";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";

import type { VisibleLabel } from "../../a11y";

/** One entry of a menu. */
export type MenuEntry = {
  /** Stable, for its test id (`<testId>-<id>`). */
  id: string;
  label: VisibleLabel;
  /** An icon before the words. */
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** A rule above this entry, starting a group. */
  divider?: boolean;
  /** Paint it in the error colour — a delete. */
  destructive?: boolean;
};

export type ContextMenuProps = {
  /** Where the pointer was (`clientX` / `clientY`); `null` is closed. */
  position: { top: number; left: number } | null;
  onClose: () => void;
  entries: readonly MenuEntry[];
  /** A heading over the entries — what the menu is about ("12…Nf6"). */
  subheader?: ReactNode;
  /** The menu's test id; each entry is `<testId>-<id>`. */
  testId: string;
};

/**
 * **A menu at the pointer** (CTA-108) — the move list's right-click menu: a
 * dense list at the pointer's position, an optional heading, icons, rules
 * between groups. Choosing an entry closes the menu, then runs it.
 */
function ContextMenu({ position, onClose, entries, subheader, testId }: ContextMenuProps) {
  const { direction } = useTheme();
  return (
    <Menu
      open={position !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={position ?? undefined}
      dir={direction}
      data-testid={testId}
      slotProps={{ list: { dense: true } }}
    >
      {subheader !== undefined && (
        <ListSubheader data-testid={`${testId}-subheader`} sx={{ lineHeight: 2.5 }}>
          {subheader}
        </ListSubheader>
      )}
      {entries.flatMap((entry) => [
        ...(entry.divider === true ? [<Divider key={`${entry.id}-divider`} />] : []),
        <MenuItem
          key={entry.id}
          disabled={entry.disabled}
          data-testid={`${testId}-${entry.id}`}
          sx={entry.destructive === true ? { color: "error.main" } : undefined}
          onClick={() => {
            onClose();
            entry.onClick();
          }}
        >
          {entry.icon !== undefined && (
            <ListItemIcon sx={entry.destructive === true ? { color: "inherit" } : undefined}>{entry.icon}</ListItemIcon>
          )}
          <ListItemText>{entry.label}</ListItemText>
        </MenuItem>,
      ])}
    </Menu>
  );
}

export default ContextMenu;
