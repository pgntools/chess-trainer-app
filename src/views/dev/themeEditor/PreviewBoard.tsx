import { useId, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { defaultPieces } from "react-chessboard";

import { SelectField } from "../../../design-system/components/forms";
import { ForceLTR } from "../../../theme/ForceLTR";
import { chessTokensOf } from "../../../design-system/theme";
import type { ChessTokens } from "../../../design-system/themes";
import { MARKED_MOVES, PREVIEW_FEN, piecesOfFen, squareCentre, squareIsLight, type Arrow } from "./previewBoardData";

/** react-chessboard's own arrow opacity — the board draws its arrows translucent. */
const ARROW_OPACITY = 0.65;

/** Arrows over a board of `size` squares, in the board's units (a square is 1). */
function ArrowLayer({ arrows }: { arrows: readonly Arrow[] }) {
  const id = useId();
  return (
    <Box component="svg" viewBox="0 0 8 8" aria-hidden="true" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {arrows.map((arrow, index) => {
        const [x1, y1] = squareCentre(arrow.from);
        const [x2, y2] = squareCentre(arrow.to);
        const length = Math.hypot(x2 - x1, y2 - y1);
        // Stop a little short of the target's centre, as the board does.
        const end = (length - 0.35) / length;
        const [ex, ey] = [x1 + (x2 - x1) * end, y1 + (y2 - y1) * end];
        const marker = `${id}-head-${index}`;
        return (
          <g key={`${arrow.from}${arrow.to}`} opacity={ARROW_OPACITY}>
            <defs>
              <marker id={marker} markerWidth="2.4" markerHeight="2.4" refX="0.9" refY="1.2" orient="auto">
                <polygon points="0 0, 2.4 1.2, 0 2.4" fill={arrow.border ?? arrow.color} />
              </marker>
            </defs>
            {arrow.border !== undefined && <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={arrow.border} strokeWidth={0.26} />}
            <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={arrow.color} strokeWidth={arrow.border === undefined ? 0.2 : 0.14} markerEnd={`url(#${marker})`} />
          </g>
        );
      })}
    </Box>
  );
}

type MiniBoardProps = {
  label: string;
  tokens: ChessTokens;
  fen?: string;
  /** Squares filled with the last move's colour. */
  lastMove?: readonly string[];
  arrows?: readonly Arrow[];
  /** Laid over the squares — the promotion picker. */
  overlay?: ReactNode;
  size?: number;
};

/**
 * **A small board in the theme's colours** — its squares, coordinates,
 * pieces, last move and arrows. Pinned left to right (`ForceLTR`): a board
 * never mirrors, and the RTL cache would flip its physical sides.
 */
function MiniBoard({ label, tokens, fen = PREVIEW_FEN, lastMove = [], arrows = [], overlay, size = 280 }: MiniBoardProps) {
  const pieces = piecesOfFen(fen);
  const { board } = tokens;
  return (
    <ForceLTR sx={{ width: size, maxWidth: "100%", flexShrink: 0 }}>
      <Box role="img" aria-label={label} sx={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", width: "100%", height: "100%" }}>
          {pieces.map(({ square, piece }) => {
            const light = squareIsLight(square);
            const notation = light ? board.lightSquareNotation : board.darkSquareNotation;
            const Piece = piece === undefined ? undefined : defaultPieces[piece];
            return (
              <Box key={square} sx={{ position: "relative", backgroundColor: light ? board.lightSquare : board.darkSquare }}>
                {lastMove.includes(square) && <Box sx={{ position: "absolute", inset: 0, backgroundColor: tokens.lastMove }} />}
                {square[0] === "a" && (
                  <Box component="span" sx={{ position: "absolute", top: 1, insetInlineStart: 2, fontSize: 10, lineHeight: 1, color: notation, userSelect: "none" }}>
                    {square[1]}
                  </Box>
                )}
                {square[1] === "1" && (
                  <Box component="span" sx={{ position: "absolute", bottom: 1, insetInlineEnd: 3, fontSize: 10, lineHeight: 1, color: notation, userSelect: "none" }}>
                    {square[0]}
                  </Box>
                )}
                {Piece !== undefined && (
                  <Box sx={{ position: "absolute", inset: 0 }}>
                    <Piece />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
        <ArrowLayer arrows={arrows} />
        {overlay}
      </Box>
    </ForceLTR>
  );
}

const PROMOTION_PIECES = ["wQ", "wR", "wB", "wN"] as const;

/** The board with the promotion picker open over it: its scrim, and the four pieces a pawn on e8 may become. */
function PromotionSample({ tokens }: { tokens: ChessTokens }) {
  return (
    <MiniBoard
      label="The promotion picker over the board, on its scrim"
      tokens={tokens}
      fen="8/4P3/8/2k5/8/8/5K2/8 w - - 0 1"
      size={200}
      overlay={
        <Box sx={{ position: "absolute", inset: 0, backgroundColor: tokens.promotion.scrim }}>
          <Box sx={{ position: "absolute", top: 0, left: "50%", width: "12.5%", display: "grid", bgcolor: "background.paper", boxShadow: 4 }}>
            {PROMOTION_PIECES.map((piece) => {
              const Piece = defaultPieces[piece];
              return (
                <Box key={piece} sx={{ aspectRatio: "1 / 1" }}>
                  <Piece />
                </Box>
              );
            })}
          </Box>
        </Box>
      }
    />
  );
}

/** A move list with every move mark, each glyph in its tone's shade for the scheme in view. */
function MarkedMoves({ tokens }: { tokens: ChessTokens }) {
  const theme = useTheme();
  const scheme = theme.palette.mode;
  return (
    <Box
      data-testid="theme-editor-preview-moves"
      dir="ltr"
      sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5, fontFamily: "fontFamilyMonospace", lineHeight: 2 }}
    >
      {MARKED_MOVES.map(({ number, san, glyph, tone }) => (
        <Box component="span" key={`${number}${san}`} sx={{ marginInlineEnd: 1, whiteSpace: "nowrap" }}>
          {number !== undefined && <Box component="span" sx={{ color: "text.secondary" }}>{`${number}. `}</Box>}
          {san}
          {tone !== undefined && (
            <Box component="span" sx={{ color: tokens.nag[tone][scheme], fontWeight: 700 }}>
              {glyph}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

type Palette = keyof ChessTokens["arrowPalettes"];

/** **The board sections' preview** — the squares, the last move and a palette's arrows; the other arrows; the picker; the marks. */
export function BoardPreview() {
  const tokens = chessTokensOf(useTheme());
  const [palette, setPalette] = useState<Palette>("classic");
  const arrows = tokens.arrowPalettes[palette];
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
        <Box sx={{ minWidth: 200 }}>
          <SelectField
            label="Next-move arrows"
            value={palette}
            onChange={(next) => setPalette(next as Palette)}
            options={[
              { value: "classic", label: "Classic" },
              { value: "lichess", label: "Lichess" },
              { value: "colorblind", label: "Colour-blind" },
            ]}
            testId="theme-editor-preview-palette"
          />
        </Box>
        <MiniBoard
          label={`A board after 1.e4 e5 2.Nf3: the last move filled, and the ${palette} arrows — the mainline's, a side line's, the hovered one`}
          tokens={tokens}
          lastMove={["g1", "f3"]}
          arrows={[
            { from: "b8", to: "c6", color: arrows.mainline },
            { from: "d7", to: "d6", color: arrows.sideline },
            { from: "g8", to: "f6", color: arrows.hovered },
          ]}
        />
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "start" }}>
        <MiniBoard
          label="The other arrows: a move you must play, an untagged one, a play-chance arrow, and the book's"
          tokens={tokens}
          size={200}
          arrows={[
            { from: "f1", to: "b5", color: tokens.arrows.required },
            { from: "d2", to: "d4", color: tokens.arrows.untagged },
            { from: "f3", to: "g5", color: tokens.arrows.chanceFill, border: tokens.arrows.chanceBorder },
            { from: "b1", to: "c3", color: tokens.book.known },
            { from: "c2", to: "c3", color: tokens.book.hovered },
          ]}
        />
        <PromotionSample tokens={tokens} />
      </Box>
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          The move marks, on this scheme's paper
        </Typography>
        <MarkedMoves tokens={tokens} />
      </Box>
    </Box>
  );
}

const RESULT_BAR = [
  { result: "white", share: 46 },
  { result: "draw", share: 31 },
  { result: "black", share: 23 },
] as const;

/** **The Map & Library preview** — the map's move dots, and the opening filter's result bars. */
export function MapPreview() {
  const tokens = chessTokensOf(useTheme());
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          The map's move dots, White's and Black's in turn
        </Typography>
        <Box
          role="img"
          aria-label="The map's move dots"
          sx={{ display: "flex", flexWrap: "wrap", gap: 1, p: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1 }}
        >
          {Array.from({ length: 16 }, (_, index) => (
            <Box
              key={index}
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: index % 2 === 0 ? tokens.map.whiteDot : tokens.map.blackDot,
              }}
            />
          ))}
        </Box>
      </Box>
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          The opening filter's result bar
        </Typography>
        <Box dir="ltr" data-testid="theme-editor-preview-bar" sx={{ display: "flex", height: 24, borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
          {RESULT_BAR.map(({ result, share }) => (
            <Box
              key={result}
              sx={{
                width: `${share}%`,
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: tokens.filterBoard[result].background,
                color: tokens.filterBoard[result].text,
              }}
            >
              {share}%
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
