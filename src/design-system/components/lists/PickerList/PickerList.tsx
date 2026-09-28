import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

/** One choice: its id (`null` is the "none" row — Unfiled, Top level), words, depth in a tree, icon. */
export type PickerItem = { id: string | null; label: ReactNode; depth?: number; icon?: ReactNode; disabled?: boolean };

export type PickerListProps = {
  items: readonly PickerItem[];
  /** The chosen id — `null` for the "none" row, `undefined` for nothing chosen yet. */
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  /** The list's accessible name ("Folder"). */
  ariaLabel: string;
  /** Box it in a bordered frame of this height that scrolls — for a long list in a form. */
  maxHeight?: number;
  /** The list's test id; each row is `<testId>-<id>`, the "none" row `<testId>-none`. */
  testId: string;
  /** The "none" row's own test id, for a screen whose tests named it before (CTA-113: `analysis-folder-move-top`). */
  noneTestId?: string;
};

/**
 * **Pick one from a list** (CTA-108) — the folder picker: dense rows (each
 * button in its own list item, so the list is a list of choices), the
 * chosen one selected (`aria-current`), a tree's depth as an indent from the
 * inline start (`2 + depth × 2.5`, so it mirrors), icons before the words
 * with a logical gap.
 */
function PickerList({ items, value, onChange, ariaLabel, maxHeight, testId, noneTestId = `${testId}-none` }: PickerListProps) {
  return (
    <List
      dense
      disablePadding
      aria-label={ariaLabel}
      data-testid={testId}
      sx={
        maxHeight === undefined
          ? undefined
          : { maxHeight, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 0.5 }
      }
    >
      {items.map((item) => {
        const selected = value !== undefined && item.id === value;
        return (
          <ListItem key={item.id ?? "none"} disablePadding>
            <ListItemButton
              selected={selected}
              disabled={item.disabled}
              aria-current={selected ? "true" : undefined}
              onClick={() => onChange(item.id)}
              data-testid={item.id === null ? noneTestId : `${testId}-${item.id}`}
              sx={{ borderRadius: 0.5, paddingInlineStart: 2 + (item.depth ?? 0) * 2.5 }}
            >
              {item.icon !== undefined && (
                <Box aria-hidden="true" sx={{ display: "flex", marginInlineEnd: 1.5, color: "text.secondary" }}>
                  {item.icon}
                </Box>
              )}
              <ListItemText primary={item.label} slotProps={{ primary: { dir: "auto" } }} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

export default PickerList;
