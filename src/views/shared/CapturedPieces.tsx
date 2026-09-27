import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { defaultPieces, type PieceRenderObject } from "react-chessboard";
import type { CapturedPieceLetter } from "../../lib/capturedPieces";
import PlayerPlate, { type PlayerPlateData } from "./PlayerPlate";

/**
 * One captured-pieces strip: the pieces one side has taken, strongest first,
 * with the material difference beside them while that side is ahead — the
 * lichess / chess.com strip, on every board that plays or analyses a game.
 *
 * Presentational, like everything else in `views/shared/`: it takes props and
 * knows nothing about which screen renders it. Two strips sit on a board's top
 * and bottom edges, outside it — the screen composes them (strip / board /
 * strip) and decides which side each shows, which is why the constants below
 * live here: the strips' height must be accounted exactly, the board box keeps
 * `flexShrink: 0`, and the board gives up their height to stay square
 * (`.claude/rules/chessboard.md` §5 — the eval bar's width discipline, for
 * height). One file for the arithmetic is the point.
 *
 * A strip with nothing in it still renders: empty strips hold the board's size
 * steady — a queen-vs-rook study with no captures shows two empty strips
 * rather than a board that resizes when the first capture lands.
 *
 * The icons come from `defaultPieces` — or from `pieces`, which the masked
 * screen hands over as the mask's costumes (`lib/pieceMask.ts`), so a captured
 * rook is drawn pixel-identically to how the board draws one. Whatever the
 * icons show, the material difference is the caller's to hide: it is derived
 * from the true types and would leak what a mask exists to hide.
 *
 * A strip can also carry a **player plate** at its left end (CTA-105) — the
 * player whose colour it sits beside, their result, Elo and name — as the
 * row the pieces then share. The plate truncates where the row runs short
 * and the pieces keep the right edge, so the height arithmetic above is
 * untouched: the row is still one strip tall. Every board but the Library's
 * game board passes no plate and gets exactly the strip below as it was.
 */

/** Height of one strip, and the gap between it and the board, in pixels. */
const CAPTURED_STRIP_HEIGHT_PX = 20;
export const CAPTURED_STRIP_GAP_PX = 2;
/** What one strip and its gap take out of the board's side, together. */
const CAPTURED_STRIP_TOTAL_PX =
  CAPTURED_STRIP_HEIGHT_PX + CAPTURED_STRIP_GAP_PX;
/** What the two strips take out of the board's side, together. */
export const CAPTURED_STRIPS_TOTAL_PX = 2 * CAPTURED_STRIP_TOTAL_PX;

/** The icons render at the strip's height minus a pixel of breathing room. */
const PIECE_SIZE_PX = CAPTURED_STRIP_HEIGHT_PX - 2;

type CapturedPiecesProps = {
  /**
   * `options.id`-style test id root — the strip renders
   * `<root>-<side>`, keyed by the side that *took* the pieces, so it is
   * stable across board orientations.
   */
  testId: string;
  /** Whose captured pieces these are — the side that took them. */
  color: "white" | "black";
  /** The pieces this side took, strongest first (`lib/capturedPieces.ts`). */
  captured: readonly CapturedPieceLetter[];
  /** How far ahead this side is, or `null` when level or behind — rendered `+N`. */
  diff: number | null;
  /**
   * Renderers for the icons, keyed by the twelve piece types — the mask's
   * costumes on the masked screen, `defaultPieces` everywhere else.
   */
  pieces?: PieceRenderObject;
  /**
   * The player whose colour this strip sits beside (CTA-105) — their name,
   * Elo rating and result of the game, plated at the row's left end. Absent,
   * the strip renders alone, exactly as it always has.
   */
  plate?: PlayerPlateData;
};

function CapturedPieces({ testId, color, captured, diff, pieces, plate }: CapturedPiecesProps) {
  const { t } = useTranslation();

  // A capture is always of the opponent's man, so the icons are his colour.
  const capturedColor = color === "white" ? "b" : "w";
  const iconFor = (letter: CapturedPieceLetter) => {
    const render = (pieces ?? defaultPieces)[`${capturedColor}${letter.toUpperCase()}`];
    return render ? render({ svgStyle: { width: "100%", height: "100%" } }) : letter.toUpperCase();
  };

  /*
    Sharing its row with a plate, the strip keeps the width its pieces need
    (`flexShrink: 0`) and the plate is what yields (`minWidth: 0`); alone, it
    is the whole row, as it always was.
  */
  const strip = (
    <Box
      data-testid={`${testId}-${color}`}
      role="img"
      aria-label={t(color === "white" ? "board.capturedByWhite" : "board.capturedByBlack")}
      /*
        Exposed as an attribute as well as in the label: it is what a test
        asserts on, the way the eval bar's `data-score` is.
      */
      data-diff={diff ?? undefined}
      sx={{
        height: `${CAPTURED_STRIP_HEIGHT_PX}px`,
        width: plate === undefined ? "100%" : "auto",
        flexGrow: plate === undefined ? undefined : 1,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        // The pieces accumulate from the right edge — the lichess look.
        justifyContent: "flex-end",
        gap: "2px",
        overflow: "hidden",
      }}
    >
      {diff !== null && (
        <Typography
          component="span"
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 700, lineHeight: 1 }}
        >
          +{diff}
        </Typography>
      )}
      {captured.map((letter, index) => (
        <Box
          key={`${letter}-${index}`}
          data-testid={`${testId}-${color}-piece-${index}`}
          sx={{ width: `${PIECE_SIZE_PX}px`, height: `${PIECE_SIZE_PX}px`, display: "flex" }}
        >
          {iconFor(letter)}
        </Box>
      ))}
    </Box>
  );

  if (plate === undefined) return strip;
  return (
    <Box
      sx={{
        height: `${CAPTURED_STRIP_HEIGHT_PX}px`,
        width: "100%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        /*
          Reversed, the strip anchors at the row's right edge and the plate
          takes what is left — so the pieces accumulate from the row's right
          edge whatever the widths, and when the icons alone overflow the row
          it is they that clip from the left, exactly as a plate-less strip
          clips its own overflow. The board area is `ForceLTR`, so this row
          runs the one way in every language.
        */
        flexDirection: "row-reverse",
      }}
    >
      {strip}
      <PlayerPlate testId={`${testId}-${color}-plate`} color={color} {...plate} />
    </Box>
  );
}

export default CapturedPieces;
