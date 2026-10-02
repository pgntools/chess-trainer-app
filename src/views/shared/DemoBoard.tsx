import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import { Chess, type Square } from "chess.js";
import { Chessboard, type ChessboardOptions, type PieceDropHandlerArgs } from "react-chessboard";
import { useTranslation } from "react-i18next";

import { demoNodeAt, numberedLine, type DemoNode } from "../../lib/demoTree";
import { IconAction } from "../../design-system/components/toolbars";
import { ForceLTR } from "../../theme/ForceLTR";
import ChanceArrows from "../explorer/ChanceArrows";
import { useBoardSquareOptions } from "./boardColors";
import { moveSx, sanTokenSx } from "./moveTokenSx";
import PromotionPicker, { type PromotionChoice } from "./PromotionPicker";
import { useBoardKeys } from "./useBoardKeys";

/**
 * **A demo mini-board** (CTA-126) — the front page's interactive boards, in
 * the style of the Library's opening-moves filter (`OpeningFilterBoard`,
 * CTA-76): the reader replays a tree of moves (`lib/demoTree.ts` — a Library
 * game, a repertoire, any stored game), and from each position the board
 * offers exactly the tree's continuations:
 *
 * - drawn as the **play-chance arrows** (`ChanceArrows`) — the wider the
 *   likelier (a repertoire's play chance), the hovered one in the hover
 *   colour — and listed under the board, each a button that plays it, with
 *   its share where there is a choice;
 * - **only those moves** are taken: a drop the tree does not hold snaps back.
 *   A promotion the tree makes more than one way asks which piece, through the
 *   shared picker;
 * - start, back, next (the first continuation — the mainline, or the most
 *   played) and flip, above the board — and ← / → / Home / End from the
 *   keyboard, on whichever board of the page the reader last touched
 *   (`useBoardKeys`), which is ringed.
 *
 * Presentational: the tree, the start position and where the board opens
 * (`initialLine`, `initialOrientation`) arrive as props; the line played, the
 * orientation and the hover are then the board's own state, since nothing
 * outside it needs them. "Back to the start" is the tree's start, wherever the
 * board opened. The board is pinned LTR (`ForceLTR`, it is
 * outside the shell's board area), its squares and the reduced-motion switch
 * are the theme's (`useBoardSquareOptions`), and every colour drawn over it is
 * a `chess` token. `chess.js` only turns the line into a position and SAN
 * into squares.
 */

type Continuation = {
  /** Its SAN, unique among a position's moves — the arrows' id. */
  id: string;
  san: string;
  from: Square;
  to: Square;
  promotion?: string;
  node: DemoNode;
};

const percent = (share: number) => Math.round(share * 100);

type DemoBoardProps = {
  /** `options.id` — unique on the page (chessboard.md §2). */
  boardId: string;
  testId: string;
  /** The board's accessible name — the group the board, its controls and its moves make. */
  label: string;
  root: DemoNode;
  /** The position the tree starts from; the standard start when absent. */
  startFen?: string;
  /** The caption before a move is played; `demoBoard.start` when absent. */
  startCaption?: string;
  /** The moves the board opens after (`startLineOf`); the start when absent. Read on mount. */
  initialLine?: readonly string[];
  /** Which way the board opens facing; the side to move at the start when absent. Read on mount. */
  initialOrientation?: "white" | "black";
};

function DemoBoard({
  boardId,
  testId,
  label,
  root,
  startFen,
  startCaption,
  initialLine,
  initialOrientation,
}: DemoBoardProps) {
  const { t } = useTranslation();
  const squareOptions = useBoardSquareOptions();
  const [played, setPlayed] = useState<string[]>(() => [...(initialLine ?? [])]);
  const [orientation, setOrientation] = useState<"white" | "black">(
    () => initialOrientation ?? (startFen !== undefined && new Chess(startFen).turn() === "b" ? "black" : "white"),
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);

  // A new tree keeps only the part of the line it still holds.
  const { line, node } = demoNodeAt(root, played);
  const key = line.join(" ");
  const { fen, turn, continuations } = useMemo(() => {
    const chess = startFen === undefined ? new Chess() : new Chess(startFen);
    for (const san of key === "" ? [] : key.split(" ")) chess.move(san);
    const legal = new Map(chess.moves({ verbose: true }).map((move) => [move.san, move]));
    const found: Continuation[] = [];
    for (const child of node.children) {
      const move = legal.get(child.san);
      if (move === undefined) continue;
      found.push({ id: child.san, san: child.san, from: move.from, to: move.to, promotion: move.promotion, node: child });
    }
    return { fen: chess.fen(), turn: chess.turn(), continuations: found };
  }, [key, node, startFen]);

  const goTo = (next: string[]) => {
    setHovered(null);
    setPromotion(null);
    setPlayed(next);
  };
  const play = (san: string) => goTo([...line, san]);

  // ← / → / Home / End, when this is the board the reader last touched (`useBoardKeys`).
  const keys = useBoardKeys({
    back: () => {
      if (line.length > 0) goTo(line.slice(0, -1));
    },
    next: () => {
      if (continuations.length > 0) play(continuations[0].san);
    },
    first: () => goTo([]),
    last: () => {
      // On along the first continuation at every step, to the line's end.
      const end = [...line];
      let at = node;
      while (at.children.length > 0) {
        at = at.children[0];
        end.push(at.san);
      }
      goTo(end);
    },
  });

  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (targetSquare === null) return false;
    const matching = continuations.filter((move) => move.from === sourceSquare && move.to === targetSquare);
    if (matching.length === 0) return false;
    if (matching.length === 1) {
      play(matching[0].san);
      return true;
    }
    // Promoted more than one way in the tree: the reader picks. `true`, or the
    // pawn would snap back and jump forward again when the choice lands.
    setPromotion({ from: sourceSquare, to: targetSquare });
    return true;
  };

  const resolvePromotion = (piece: PromotionChoice | null) => {
    const move = continuations.find(
      (candidate) =>
        candidate.from === promotion?.from && candidate.to === promotion.to && candidate.promotion === piece,
    );
    setPromotion(null);
    if (piece !== null && move !== undefined) play(move.san);
  };

  const options: ChessboardOptions = {
    // The theme's squares, and no animation under reduced motion (CTA-107, CTA-111).
    ...squareOptions,
    id: boardId,
    position: fen,
    boardOrientation: orientation,
    allowDrawingArrows: false,
    canDragPiece: ({ piece }) => piece.pieceType.startsWith(turn),
    onPieceDrop,
  };

  const noteOf = (move: Continuation): string => (continuations.length > 1 ? `${percent(move.node.chance)}%` : "");

  return (
    <Box
      role="group"
      aria-label={label}
      data-testid={testId}
      {...keys}
      sx={{
        display: "grid",
        gap: 1,
        minWidth: 0,
        // The board the keys drive (`useBoardKeys`) is ringed.
        '&:focus': { outline: "none" },
        '&[data-keys-active="true"]': {
          outline: (theme: Theme) => `2px solid ${(theme.vars ?? theme).palette.primary.main}`,
          outlineOffset: 4,
          borderRadius: 1,
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
        <IconAction
          label={t("demoBoard.reset")}
          disabled={line.length === 0}
          onClick={() => goTo([])}
          testId={`${testId}-reset`}
        >
          <FirstPageRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction
          label={t("demoBoard.back")}
          disabled={line.length === 0}
          onClick={() => goTo(line.slice(0, -1))}
          testId={`${testId}-back`}
        >
          <NavigateBeforeRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction
          label={t("demoBoard.next")}
          disabled={continuations.length === 0}
          onClick={() => play(continuations[0].san)}
          testId={`${testId}-next`}
        >
          <NavigateNextRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction
          label={t("demoBoard.flip")}
          onClick={() => setOrientation((side) => (side === "white" ? "black" : "white"))}
          testId={`${testId}-flip`}
        >
          <SwapVertRoundedIcon fontSize="small" />
        </IconAction>
      </Box>

      <ForceLTR sx={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
        <Chessboard options={options} />
        <ChanceArrows
          testId={`${testId}-arrows`}
          nodes={continuations}
          chances={continuations.map((move) => move.node.chance)}
          hoveredId={hovered}
          orientation={orientation}
        />
        {promotion && (
          <PromotionPicker
            targetSquare={promotion.to}
            orientation={orientation}
            color={turn}
            onSelect={resolvePromotion}
          />
        )}
      </ForceLTR>

      {/* The moves do not mirror; `aria-live`, so a screen reader hears each one played. */}
      <Typography
        variant="caption"
        dir="ltr"
        aria-live="polite"
        data-testid={`${testId}-line`}
        sx={{ color: "text.secondary", minHeight: "1.5em", unicodeBidi: "isolate" }}
      >
        {line.length === 0 ? (startCaption ?? t("demoBoard.start")) : numberedLine(line, startFen)}
      </Typography>

      {continuations.length === 0 ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }} data-testid={`${testId}-end`}>
          {t("demoBoard.end")}
        </Typography>
      ) : (
        <Box
          role="list"
          aria-label={t("demoBoard.moves")}
          data-testid={`${testId}-moves`}
          sx={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "center", columnGap: 1, rowGap: 0.25 }}
          onMouseLeave={() => setHovered(null)}
        >
          {continuations.map((move) => (
            <Box key={move.id} role="listitem" sx={{ display: "contents" }}>
              <ButtonBase
                dir="ltr"
                data-testid={`${testId}-move-${move.san}`}
                onClick={() => play(move.san)}
                onMouseEnter={() => setHovered(move.id)}
                onFocus={() => setHovered(move.id)}
                onBlur={() => setHovered(null)}
                // At least 24 px each way (WCAG 2.5.8) — several moves stack in the list.
                sx={{ ...moveSx, ...sanTokenSx, justifySelf: "start", minHeight: 24, minWidth: 24 }}
              >
                {move.san}
              </ButtonBase>
              <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                {noteOf(move)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default DemoBoard;
