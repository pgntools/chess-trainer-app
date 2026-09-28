import type { ReactNode } from "react";
import Box from "@mui/material/Box";

export type FeedbackStripProps = {
  /** The border's colour: `info` (the comment block), `success` (the changes strip), `neutral` (next moves, the engine lines). */
  tone: "info" | "success" | "neutral";
  children: ReactNode;
  /** Its height cap, in px; past it the strip scrolls. */
  maxHeight?: number;
  /** A row of actions at its end (Update · Save as copy · Discard). */
  actions?: ReactNode;
  /** An accessible name — given one, it is a `region`. */
  ariaLabel?: string;
  testId: string;
};

const BORDER = { info: "info.main", success: "success.main", neutral: "divider" } as const;

/**
 * **The raised strip** (CTA-108) the board panels repeat — the comment block
 * (`info`), the changes strip (`success`), the next-moves bar and the pinned
 * engine lines (`neutral`): a paper box with a one-pixel border in its tone,
 * the same shape every time.
 */
function FeedbackStrip({ tone, children, maxHeight, actions, ariaLabel, testId }: FeedbackStripProps) {
  return (
    <Box
      role={ariaLabel === undefined ? undefined : "region"}
      aria-label={ariaLabel}
      data-testid={testId}
      data-tone={tone}
      sx={{
        flexShrink: 0,
        border: "1px solid",
        borderColor: BORDER[tone],
        borderRadius: 1,
        bgcolor: "background.paper",
        px: 1,
        py: 0.75,
        maxHeight,
        overflowY: maxHeight === undefined ? undefined : "auto",
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ flex: "1 1 12rem", minWidth: 0 }}>{children}</Box>
      {actions !== undefined && <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0, flexWrap: "wrap" }}>{actions}</Box>}
    </Box>
  );
}

export default FeedbackStrip;
