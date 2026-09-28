import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";

import { linkProps, type LinkTarget } from "../../link";

export type FolderRowProps = {
  /** The folder's name — a reader's words, so `dir="auto"`. */
  name: ReactNode;
  /** What is in it ("12 games"). */
  count?: ReactNode;
  /** Open it — or give a `link`. */
  onOpen?: () => void;
  link?: LinkTarget;
  /** The icon before the name. Default: an outlined folder. */
  icon?: ReactNode;
  /** The folder's actions (`IconAction`s), at the row's end. */
  actions?: ReactNode;
  /** The row's test id; the open button is `<testId>-open`, the actions `<testId>-actions`. */
  testId: string;
  /** The open button's own test id, for a screen whose tests named it before it moved onto this row (CTA-113). */
  openTestId?: string;
};

/**
 * **A folder in a list** (CTA-108): one button over the icon, the name and
 * the count — a drill-in or a real link — and the folder's actions at the
 * row's end, **outside** the button (MUI's `secondaryAction` role), laid out
 * in flow so any number of them fit. The analyses' and the repertoires'
 * folder rows were two versions of this.
 */
function FolderRow({ name, count, onOpen, link, icon, actions, testId, openTestId = `${testId}-open` }: FolderRowProps) {
  return (
    <ListItem disablePadding divider data-testid={testId} sx={{ gap: 0.5 }}>
      <ListItemButton
        onClick={onOpen}
        data-testid={openTestId}
        sx={{ borderRadius: 1, py: 1, gap: 1.5, minWidth: 0 }}
        {...linkProps(link)}
      >
        <Box aria-hidden="true" sx={{ display: "flex", color: "text.secondary" }}>
          {icon ?? <FolderOutlinedIcon />}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" dir="auto" noWrap sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          {count !== undefined && (
            <Typography variant="caption" color="text.secondary" component="div">
              {count}
            </Typography>
          )}
        </Box>
      </ListItemButton>
      {actions !== undefined && (
        <Box data-testid={`${testId}-actions`} sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
          {actions}
        </Box>
      )}
    </ListItem>
  );
}

export default FolderRow;
