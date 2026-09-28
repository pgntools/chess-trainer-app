import type { MouseEvent } from "react";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";

export type ExpandToggleProps = {
  expanded: boolean;
  onToggle: () => void;
  /** Its accessible name — the row's ("Open Openings", "Close Openings"). */
  label: string;
  /** The id of what it opens, for `aria-controls`. */
  controls?: string;
  testId: string;
};

/**
 * **A tree row's chevron** (CTA-108): one rotation for every tree. Closed,
 * it points the way the text runs (right, or left under RTL); open, it
 * points down — `aria-expanded` saying the same. The transform is an inline
 * style, so the RTL stylis plugin leaves it be; a click is the toggle's alone
 * and never reaches the row.
 */
function ExpandToggle({ expanded, onToggle, label, controls, testId }: ExpandToggleProps) {
  const { direction } = useTheme();
  const transform = expanded ? "rotate(90deg)" : direction === "rtl" ? "scaleX(-1)" : "none";
  return (
    <IconButton
      size="small"
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        onToggle();
      }}
      data-testid={testId}
      sx={{ p: 0.25 }}
    >
      <KeyboardArrowRightRoundedIcon
        fontSize="small"
        data-testid={`${testId}-icon`}
        style={{ transform, transition: "transform 150ms" }}
      />
    </IconButton>
  );
}

export default ExpandToggle;
