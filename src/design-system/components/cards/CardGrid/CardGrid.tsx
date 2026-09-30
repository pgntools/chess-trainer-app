import type { ReactNode } from "react";
import Box from "@mui/material/Box";

import { cardGridColumns, type CardSize } from "./cardGridColumns";

export type CardGridProps = {
  children: ReactNode;
  size?: CardSize;
  /** Be the one region that scrolls (`flex: 1; minHeight: 0`) — in a square that divides itself. */
  scroll?: boolean;
  /** Its accessible name — given one, the grid is a named `group`. */
  ariaLabel?: string;
  testId: string;
};

/**
 * **A grid of cards** (CTA-108): as many columns as fit at the size's least
 * width, and **`gridAutoRows: max-content`** — an `auto` row in a box of
 * definite height is stretched to share that height, squashing the cards,
 * which is why every card grid needs it (`chessboard.md` §5).
 */
function CardGrid({ children, size = "compact", scroll = false, ariaLabel, testId }: CardGridProps) {
  return (
    <Box
      role={ariaLabel === undefined ? undefined : "group"}
      aria-label={ariaLabel}
      data-testid={testId}
      data-size={size}
      sx={{
        display: "grid",
        gridTemplateColumns: cardGridColumns(size),
        gridAutoRows: "max-content",
        alignContent: "start",
        gap: 2,
        ...(scroll && { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", pt: 1.5 }),
      }}
    >
      {children}
    </Box>
  );
}

export default CardGrid;
