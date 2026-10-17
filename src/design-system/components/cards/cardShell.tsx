import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";

import { linkProps, type LinkTarget } from "../link";
import { nativeIndeterminate } from "../a11y";

/** The parts `RecordCard` and `FolderCard` share — so both stand the same height in one grid. */
export type CardShellProps = {
  /** The square at the top — the action area's content. */
  square: ReactNode;
  /** Open it — or give a `link`. With neither, the square is not a button (a record that will not open). */
  onOpen?: () => void;
  link?: LinkTarget;
  /** The action area's accessible name (the square alone has no words). */
  openLabel: string;
  name: ReactNode;
  /** The line under the name. Always takes its line, empty or not. */
  caption?: ReactNode;
  /**
   * A third line under the caption (CTA-113) — the opening a saved analysis
   * reached. Give every card of a grid one (a blank `" "` where there is
   * nothing to say) so they stay the same height. Absent, there is no third line.
   */
  detail?: ReactNode;
  actions?: ReactNode;
  /**
   * The card's pick. `indeterminate` (CTA-147): some, not all, of what the
   * card stands for — a folder card whose pick covers its whole subtree.
   */
  pick?: { checked: boolean; indeterminate?: boolean; onToggle: () => void; label: string };
  testId: string;
  /** The action area's own test id, for a screen whose tests named it before (CTA-113). Absent, `<testId>-open`. */
  openTestId?: string;
  /** The pick's own test id (CTA-113). Absent, `<testId>-pick`. */
  pickTestId?: string;
  /** The name's own test id (CTA-113). Absent, `<testId>-name`. */
  nameTestId?: string;
};

/**
 * **The one card shape** (CTA-108): an outlined card, a **square** action
 * area on top, then a caption row — the name over its line, the actions, a
 * pick. The caption row's two lines are always there, so a folder card and
 * a record card side by side in a grid are the same height, which the
 * analyses' folder cards were not.
 */
export function CardShell({
  square,
  onOpen,
  link,
  openLabel,
  name,
  caption,
  detail,
  actions,
  pick,
  testId,
  openTestId = `${testId}-open`,
  pickTestId = `${testId}-pick`,
  nameTestId = `${testId}-name`,
}: CardShellProps) {
  const face = <Box sx={{ aspectRatio: "1 / 1", width: "100%", overflow: "hidden", borderRadius: 0.5 }}>{square}</Box>;
  return (
    <Card variant="outlined" data-testid={testId} sx={{ display: "flex", flexDirection: "column" }}>
      {onOpen === undefined && link === undefined ? (
        <Box data-testid={openTestId} sx={{ p: 1 }}>
          {face}
        </Box>
      ) : (
        <CardActionArea onClick={onOpen} aria-label={openLabel} data-testid={openTestId} sx={{ p: 1 }} {...linkProps(link)}>
          {face}
        </CardActionArea>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, pb: 0.75, minWidth: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" dir="auto" noWrap data-testid={nameTestId} sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" noWrap>
            {caption ?? " "}
          </Typography>
          {detail !== undefined && (
            <Typography variant="caption" color="text.secondary" component="div" noWrap>
              {detail}
            </Typography>
          )}
        </Box>
        {actions}
        {pick !== undefined && (
          <Checkbox
            size="small"
            checked={pick.checked}
            indeterminate={pick.indeterminate}
            onChange={pick.onToggle}
            slotProps={{ input: { "aria-label": pick.label, ref: nativeIndeterminate(pick.indeterminate ?? false) } as object }}
            data-testid={pickTestId}
          />
        )}
      </Box>
    </Card>
  );
}
