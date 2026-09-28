import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export type StatusTextProps = {
  /** Its colour — `neutral` is the text's own, for an outcome that is neither good nor bad (a game's result). */
  tone: "error" | "success" | "warning" | "info" | "neutral";
  children: ReactNode;
  /**
   * A line the screen leads with — `body2` in 600 rather than a caption (a
   * game's result under its board). Absent, a caption.
   */
  emphasis?: boolean;
  testId: string;
};

/**
 * **A one-line outcome** (CTA-108) — "Saved.", "Copied.", "The save
 * failed." — a caption in its tone's colour, announced: an `error` as an
 * `alert` (read at once), anything else as a `status` (read when idle). The
 * board screens' save problems and the Load tab's success line were this.
 * `emphasis` and the `neutral` tone (CTA-109) make it a game's result.
 */
function StatusText({ tone, children, emphasis = false, testId }: StatusTextProps) {
  return (
    <Typography
      variant={emphasis ? "body2" : "caption"}
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
      sx={{ display: "block", color: tone === "neutral" ? "text.primary" : `${tone}.main`, ...(emphasis && { fontWeight: 600 }) }}
    >
      {children}
    </Typography>
  );
}

export default StatusText;
