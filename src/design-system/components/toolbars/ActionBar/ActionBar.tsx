import type { ReactNode } from "react";
import Box from "@mui/material/Box";

export type ActionBarProps = {
  /** The actions — `IconAction`s, buttons, a switch. */
  children: ReactNode;
  /** A rule on one side of the row — `top` over a panel's foot, `bottom` under a header. */
  divider?: "top" | "bottom" | "none";
  /** Where the actions gather. `space-between` spreads them; an item with `marginInlineStart: auto` still pushes. */
  justify?: "start" | "end" | "space-between";
  /** Tighter gaps, for a row of icons. */
  dense?: boolean;
  /** Its accessible name — given one, it is a `toolbar`. */
  ariaLabel?: string;
  testId: string;
};

/**
 * **A row of actions** (CTA-108) — the board controls' row, a map's
 * toolbar, a panel's foot: wrapping, vertically centred, with an optional
 * rule on one side. Named, it is a `role="toolbar"`.
 */
function ActionBar({ children, divider = "none", justify = "start", dense = false, ariaLabel, testId }: ActionBarProps) {
  const justifyContent = { start: "flex-start", end: "flex-end", "space-between": "space-between" }[justify];
  return (
    <Box
      role={ariaLabel === undefined ? undefined : "toolbar"}
      aria-label={ariaLabel}
      data-testid={testId}
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent,
        gap: dense ? 0.25 : 1,
        flexShrink: 0,
        ...(divider === "top" && { pt: 1, borderTop: "1px solid", borderColor: "divider" }),
        ...(divider === "bottom" && { pb: 1, borderBottom: "1px solid", borderColor: "divider" }),
      }}
    >
      {children}
    </Box>
  );
}

export default ActionBar;
