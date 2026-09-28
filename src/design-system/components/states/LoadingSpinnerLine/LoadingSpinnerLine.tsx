import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

export type LoadingSpinnerLineProps = {
  /** "Reading…". */
  children: ReactNode;
  /** `small` beside a line of `body2` (the default), `medium` for a line on its own. */
  size?: "small" | "medium";
  testId: string;
};

/**
 * **A spinner beside a line** (CTA-108) — the repertoire upload's and the
 * player's "Reading…": a small ring before the words, the pair announced as a
 * `status` — the words alone, the ring being decoration (`aria-hidden`).
 */
function LoadingSpinnerLine({ children, size = "small", testId }: LoadingSpinnerLineProps) {
  return (
    <Box role="status" data-testid={testId} sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
      <CircularProgress aria-hidden size={size === "small" ? 16 : 24} color="inherit" />
      <Typography variant={size === "small" ? "body2" : "body1"}>{children}</Typography>
    </Box>
  );
}

export default LoadingSpinnerLine;
