import Box from "@mui/material/Box";
import type { Theme } from "@mui/material/styles";
import type { Square } from "chess.js";
import { chessTokensOf } from "../../design-system/theme";
import { moveMarkBadge } from "../../lib/moveAnnotations";

/**
 * **A move's mark, drawn on the board** (CTA-168) — lichess's round badge
 * with `!!`, `!`, `!?`, `?!`, `?` or `??` in the top corner of the square the
 * move landed on, for the position on screen. The move's first move mark
 * (`moveMarkBadge`); position and feature glyphs stay off the board.
 *
 * An overlay in the board's relative box, as `ShapeCircles` is: a `0 0 8 8`
 * viewBox, one unit a square, turned with the board's orientation;
 * `pointer-events: none`, so every drag reaches the board, and
 * `aria-hidden` — the move list already reads the glyph out. The disc is the
 * theme's `chess.nag` token for its tone in the scheme on screen, the glyph
 * whichever of white or black reads on it. The glyph is pinned LTR with the
 * `direction` attribute, so `!?` never turns into `?!` under Hebrew.
 */

type MoveGlyphBadgeProps = {
  /** The move's NAGs — absent or without a move mark, nothing is drawn. */
  nags: readonly number[] | undefined;
  /** The square the move landed on. */
  square: Square;
  orientation: "white" | "black";
  testId: string;
};

/** The disc's radius and its centre's inset from the square's top and right edges, in squares. */
const RADIUS = 0.2;
const INSET = 0.23;

const badgeSx = (tone: keyof ReturnType<typeof chessTokensOf>["nag"]) => (theme: Theme) => {
  const { light, dark } = chessTokensOf(theme).nag[tone];
  return {
    "& circle": { fill: light, ...theme.applyStyles("dark", { fill: dark }) },
    "& text": {
      fill: theme.palette.getContrastText(light),
      ...theme.applyStyles("dark", { fill: theme.palette.getContrastText(dark) }),
    },
  };
};

function MoveGlyphBadge({ nags, square, orientation, testId }: MoveGlyphBadgeProps) {
  const badge = moveMarkBadge(nags);
  if (badge === undefined) return null;
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]) - 1;
  const left = orientation === "white" ? file : 7 - file;
  const top = orientation === "white" ? 7 - rank : rank;
  const cx = left + 1 - INSET;
  const cy = top + INSET;
  return (
    <Box
      component="svg"
      data-testid={testId}
      data-square={square}
      data-tone={badge.tone}
      viewBox="0 0 8 8"
      width="100%"
      height="100%"
      aria-hidden="true"
      sx={badgeSx(badge.tone)}
      style={{ position: "absolute", inset: 0, display: "block", pointerEvents: "none" }}
    >
      <circle cx={cx} cy={cy} r={RADIUS} />
      <text
        x={cx}
        y={cy}
        direction="ltr"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={badge.glyph.length > 1 ? 0.22 : 0.27}
        fontWeight={700}
        fontFamily="sans-serif"
      >
        {badge.glyph}
      </text>
    </Box>
  );
}

export default MoveGlyphBadge;
