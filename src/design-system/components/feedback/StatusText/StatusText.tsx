import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export type StatusTextProps = {
  tone: "error" | "success" | "warning" | "info";
  children: ReactNode;
  testId: string;
};

/**
 * **A one-line outcome** (CTA-108) — "Saved.", "Copied.", "The save
 * failed." — a caption in its tone's colour, announced: an `error` as an
 * `alert` (read at once), anything else as a `status` (read when idle). The
 * board screens' save problems and the Load tab's success line were this.
 */
function StatusText({ tone, children, testId }: StatusTextProps) {
  return (
    <Typography
      variant="caption"
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
      sx={{ display: "block", color: `${tone}.main` }}
    >
      {children}
    </Typography>
  );
}

export default StatusText;
