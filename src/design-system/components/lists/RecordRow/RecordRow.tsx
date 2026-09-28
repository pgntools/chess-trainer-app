import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";

import { linkProps, type LinkTarget } from "../../link";

/** A row's main action — "Open" — as a button or a link. */
export type RowAction = { label: ReactNode; onClick?: () => void; link?: LinkTarget };

/** The row's pick: its box, its state and its accessible name. */
export type RowPick = { checked: boolean; onToggle: () => void; label: string };

export type RecordRowProps = {
  /** The record's name — a reader's words, so `dir="auto"`. */
  name: ReactNode;
  /** The facts line under it ("24 moves · 3 Sep 2026"). */
  caption?: ReactNode;
  /** The reader's description, in italics. */
  description?: ReactNode;
  /** The main action, contained, first among the actions. */
  primaryAction?: RowAction;
  /** More actions after it (`IconAction`s). */
  actions?: ReactNode;
  /** A pick box at the row's end. */
  pick?: RowPick;
  /** The row's test id; the parts are `-name`, `-open` and `-pick`. */
  testId: string;
};

/**
 * **A saved record in a list** (CTA-108) — a saved analysis, a repertoire:
 * the name over a caption and an optional description, then Open, the
 * record's other actions and its pick, over a bottom divider. The two saved
 * lists' rows were this, twice.
 */
function RecordRow({ name, caption, description, primaryAction, actions, pick, testId }: RecordRowProps) {
  return (
    <ListItem
      disableGutters
      divider
      data-testid={testId}
      sx={{ py: 1.25, gap: 1, alignItems: "center", flexWrap: "wrap" }}
    >
      <Box sx={{ flex: "1 1 12rem", minWidth: 0 }}>
        <Typography variant="subtitle2" dir="auto" noWrap data-testid={`${testId}-name`} sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        {caption !== undefined && (
          <Typography variant="caption" color="text.secondary" component="div" noWrap>
            {caption}
          </Typography>
        )}
        {description !== undefined && (
          <Typography variant="body2" color="text.secondary" dir="auto" sx={{ fontStyle: "italic", mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {primaryAction !== undefined && (
          <Button
            size="small"
            variant="contained"
            onClick={primaryAction.onClick}
            data-testid={`${testId}-open`}
            {...linkProps(primaryAction.link)}
          >
            {primaryAction.label}
          </Button>
        )}
        {actions}
        {pick !== undefined && (
          <Checkbox
            size="small"
            checked={pick.checked}
            onChange={pick.onToggle}
            slotProps={{ input: { "aria-label": pick.label } }}
            data-testid={`${testId}-pick`}
          />
        )}
      </Box>
    </ListItem>
  );
}

export default RecordRow;
