import type { ReactNode } from "react";
import Box from "@mui/material/Box";

/** A card's least width: `compact` 160 px, `medium` 220 px (Home), `comfortable` 260 px. */
export type CardSize = "compact" | "medium" | "comfortable";

const MIN_WIDTH: Record<CardSize, number> = { compact: 160, medium: 220, comfortable: 260 };

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
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${MIN_WIDTH[size]}px, 100%), 1fr))`,
        gridAutoRows: "max-content",
        alignContent: "start",
        gap: 2,
        ...(scroll && { flex: 1, minHeight: 0, overflowY: "auto", pt: 1.5 }),
      }}
    >
      {children}
    </Box>
  );
}

export default CardGrid;
