import { Children, isValidElement, type ReactNode } from "react";
import Box from "@mui/material/Box";

/**
 * **A row of the front page's boards** (CTA-126) — `<BoardRow>` around the
 * embeds that share a line: three game boards, two repertoires, one
 * collection card across the whole width. As many columns as it has
 * children (or `columns`); under the `sm` breakpoint one column, so the page
 * reflows at 320 px.
 */

type BoardRowProps = {
  children: ReactNode;
  /** How many side by side from `sm` up; the number of children when absent. */
  columns?: number;
};

export function BoardRow({ children, columns }: BoardRowProps) {
  const count = columns ?? Math.max(1, Children.toArray(children).filter(isValidElement).length);
  return (
    <Box
      data-testid="home-board-row"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: `repeat(${count}, minmax(0, 1fr))` },
        gap: 3,
        alignItems: "start",
        mb: 3,
      }}
    >
      {children}
    </Box>
  );
}
