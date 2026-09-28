import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

export type ProgressLineProps = {
  /** 0–100; absent, the bar is indeterminate. */
  value?: number;
  /** The words under the bar — they also name it. */
  caption?: ReactNode;
  /** `success` for a coverage bar (how much of a repertoire is learnt). */
  color?: "primary" | "success";
  /** The root's test id; the bar is `<testId>-bar`, the caption `<testId>-caption`. */
  testId: string;
};

/**
 * **A bar with a caption** (CTA-108) — an import's progress, a repertoire's
 * coverage: MUI's `LinearProgress`, 6 px and rounded, labelled by its
 * caption.
 */
function ProgressLine({ value, caption, color = "primary", testId }: ProgressLineProps) {
  const captionId = useId();
  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 0.5 }}>
      <LinearProgress
        variant={value === undefined ? "indeterminate" : "determinate"}
        value={value === undefined ? undefined : Math.max(0, Math.min(100, value))}
        color={color}
        aria-labelledby={caption === undefined ? undefined : captionId}
        data-testid={`${testId}-bar`}
        sx={{ height: 6, borderRadius: 3 }}
      />
      {caption !== undefined && (
        <Typography id={captionId} variant="caption" color="text.secondary" data-testid={`${testId}-caption`}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}

export default ProgressLine;
