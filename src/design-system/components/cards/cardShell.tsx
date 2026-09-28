import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";

import { linkProps, type LinkTarget } from "../link";

/** The parts `RecordCard` and `FolderCard` share — so both stand the same height in one grid. */
export type CardShellProps = {
  /** The square at the top — the action area's content. */
  square: ReactNode;
  /** Open it — or give a `link`. */
  onOpen?: () => void;
  link?: LinkTarget;
  /** The action area's accessible name (the square alone has no words). */
  openLabel: string;
  name: ReactNode;
  /** The line under the name. Always takes its line, empty or not. */
  caption?: ReactNode;
  actions?: ReactNode;
  pick?: { checked: boolean; onToggle: () => void; label: string };
  testId: string;
};

/**
 * **The one card shape** (CTA-108): an outlined card, a **square** action
 * area on top, then a caption row — the name over its line, the actions, a
 * pick. The caption row's two lines are always there, so a folder card and
 * a record card side by side in a grid are the same height, which the
 * analyses' folder cards were not.
 */
export function CardShell({ square, onOpen, link, openLabel, name, caption, actions, pick, testId }: CardShellProps) {
  return (
    <Card variant="outlined" data-testid={testId} sx={{ display: "flex", flexDirection: "column" }}>
      <CardActionArea
        onClick={onOpen}
        aria-label={openLabel}
        data-testid={`${testId}-open`}
        sx={{ p: 1 }}
        {...linkProps(link)}
      >
        <Box sx={{ aspectRatio: "1 / 1", width: "100%", overflow: "hidden", borderRadius: 0.5 }}>{square}</Box>
      </CardActionArea>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, pb: 0.75, minWidth: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" dir="auto" noWrap data-testid={`${testId}-name`} sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" noWrap>
            {caption ?? " "}
          </Typography>
        </Box>
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
    </Card>
  );
}
