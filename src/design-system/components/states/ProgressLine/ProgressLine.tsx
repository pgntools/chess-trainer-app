import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

export type ProgressLineProps = {
  /** 0–100; absent, the bar is indeterminate. */
  value?: number;
  /** The bar's accessible name ("Import progress") — required, so a bar is never nameless (CTA-111). */
  label: string;
  /** The words under the bar ("120 of 800 games") — they describe it. */
  caption?: ReactNode;
  /**
   * Read the caption out as it changes — a `status` live region — for a job
   * the reader waits on (an import). Absent, the caption only describes the bar.
   */
  announce?: boolean;
  /** `success` for a coverage bar (how much of a repertoire is learnt). */
  color?: "primary" | "success";
  /** The root's test id; the bar is `<testId>-bar`, the caption `<testId>-caption`. */
  testId: string;
};

/**
 * **A bar with a caption** (CTA-108) — an import's progress, a repertoire's
 * coverage: MUI's `LinearProgress`, 6 px and rounded, named by its `label`
 * and described by its caption. A determinate bar reports its value
 * (`aria-valuenow`, 0–100); an indeterminate one reports none, which is how a
 * screen reader tells "under way" from "this far".
 */
function ProgressLine({ value, label, caption, announce = false, color = "primary", testId }: ProgressLineProps) {
  const captionId = useId();
  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 0.5 }}>
      <LinearProgress
        variant={value === undefined ? "indeterminate" : "determinate"}
        value={value === undefined ? undefined : Math.max(0, Math.min(100, value))}
        color={color}
        aria-label={label}
        aria-describedby={caption === undefined ? undefined : captionId}
        data-testid={`${testId}-bar`}
        sx={{ height: 6, borderRadius: 3 }}
      />
      {caption !== undefined && (
        <Typography
          id={captionId}
          variant="caption"
          color="text.secondary"
          role={announce ? "status" : undefined}
          data-testid={`${testId}-caption`}
        >
          {caption}
        </Typography>
      )}
    </Box>
  );
}

export default ProgressLine;
