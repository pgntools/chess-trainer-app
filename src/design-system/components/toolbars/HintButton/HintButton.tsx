import { useId, type MouseEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";

import { visuallyHidden } from "../../a11y";
import { linkProps, type LinkTarget } from "../../link";

export type HintButtonProps = {
  /** The button's words — its accessible name. */
  children: ReactNode;
  /** What it does, in a tooltip that **describes** the button (`aria-describedby`) and never renames it. */
  hint: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Go somewhere instead: a router link or an `href`. */
  link?: LinkTarget;
  variant?: "text" | "outlined" | "contained";
  color?: "primary" | "success" | "error";
  /** An icon before the words, `fontSize="small"`. */
  startIcon?: ReactNode;
  disabled?: boolean;
  /** A job is running: `aria-busy`, and a spinner takes the icon's place. */
  busy?: boolean;
  testId: string;
};

/**
 * **A text button with a hint** (CTA-116): a small `Button` under a tooltip
 * that says what it does, in the three places the app wrote it by hand — a
 * collection's *Add games* and *Analyse*, and the changes strip's *Update* and
 * *Save as copy*.
 *
 * - The hint **describes**: the button keeps its visible words as its name
 *   (WCAG 2.5.3, which a tooltip that renames it would break) and is
 *   `aria-describedby` a hidden copy of the hint, read after the name. The
 *   tooltip is for the eyes.
 * - It always sits in an inline-flex `span`, so a **disabled** button still
 *   shows its tooltip — the fix `IconAction` carries too.
 * - `busy` is the *Analyse* case: `aria-busy` and a hidden spinner in the
 *   icon's place, the button stays where it was.
 */
function HintButton({
  children,
  hint,
  onClick,
  link,
  variant = "text",
  color,
  startIcon,
  disabled = false,
  busy = false,
  testId,
}: HintButtonProps) {
  const hintId = useId();
  return (
    <Tooltip title={hint} describeChild>
      <Box component="span" sx={{ display: "inline-flex", flexShrink: 0 }}>
        <Button
          size="small"
          variant={variant}
          color={color}
          disabled={disabled}
          onClick={onClick}
          aria-describedby={hintId}
          aria-busy={busy || undefined}
          startIcon={busy ? <CircularProgress aria-hidden size={16} color="inherit" /> : startIcon}
          data-testid={testId}
          {...linkProps(link)}
        >
          {children}
        </Button>
        {/*
          The tooltip's own wiring lands on the span (its child), which no one
          focuses, and only while it is open. The button is described by this
          copy of the hint instead: always there, read after the name.
        */}
        <Box component="span" id={hintId} sx={visuallyHidden}>
          {hint}
        </Box>
      </Box>
    </Tooltip>
  );
}

export default HintButton;
