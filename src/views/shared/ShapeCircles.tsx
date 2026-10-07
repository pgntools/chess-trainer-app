import { useChessTokens } from "../../design-system/theme";
import type { BoardShapes } from "../../lib/boardShapes";

/**
 * **A PGN's `[%csl]` circles, drawn over the board** (CTA-126) — lichess's
 * rings round squares, which react-chessboard has no option for. An overlay
 * in the board's relative box, as the play-chance arrows are
 * (`views/explorer/ChanceArrows.tsx`): a `0 0 8 8` viewBox, one unit a
 * square, so it scales with the board and measures nothing; turned with the
 * board's orientation; `pointer-events: none`, so every drag reaches the
 * board. Each ring in its brush's `chess.drawing` colour.
 */

type ShapeCirclesProps = {
  circles: BoardShapes["circles"];
  orientation: "white" | "black";
  testId: string;
};

function ShapeCircles({ circles, orientation, testId }: ShapeCirclesProps) {
  const { drawing } = useChessTokens();
  if (circles.length === 0) return null;
  return (
    <svg
      data-testid={testId}
      viewBox="0 0 8 8"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, display: "block", pointerEvents: "none" }}
    >
      {circles.map(({ brush, square }) => {
        const file = square.charCodeAt(0) - "a".charCodeAt(0);
        const rank = Number(square[1]) - 1;
        const x = orientation === "white" ? file + 0.5 : 7 - file + 0.5;
        const y = orientation === "white" ? 7 - rank + 0.5 : rank + 0.5;
        return (
          <circle
            key={`${brush}-${square}`}
            data-square={square}
            cx={x}
            cy={y}
            r={0.44}
            fill="none"
            stroke={drawing[brush]}
            strokeWidth={0.08}
            strokeOpacity={0.85}
          />
        );
      })}
    </svg>
  );
}

export default ShapeCircles;
