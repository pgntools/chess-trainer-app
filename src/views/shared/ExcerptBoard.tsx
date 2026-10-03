import { useMemo, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled, type Theme } from "@mui/material/styles";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import LastPageRoundedIcon from "@mui/icons-material/LastPageRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import { Chessboard, type ChessboardOptions, type PieceDropHandlerArgs } from "react-chessboard";
import { useTranslation } from "react-i18next";

import { IconAction } from "../../design-system/components/toolbars";
import { MIN_TARGET_PX, MONOSPACE_FONT_FAMILY, useChessTokens } from "../../design-system/theme";
import { drawsShapes, shapesOf } from "../../lib/boardShapes";
import { findNode, pathTo, type GameTree } from "../../lib/gameTree";
import { lastMoveSquareStyles } from "../../lib/gameNavigation";
import { excerptTokens, isInExcerpt, moveName, type ExcerptToken, type ExcerptWindow } from "../../lib/pgnExcerpt";
import { readComment } from "../../lib/moveAnnotations";
import { ForceLTR } from "../../theme/ForceLTR";
import NagGlyphs from "./NagGlyphs";
import { nextMoveArrowsOf } from "../tools/analysis/nextMoveArrows";
import { useBoardSquareOptions } from "./boardColors";
import PromotionPicker, { type PromotionChoice } from "./PromotionPicker";
import ShapeCircles from "./ShapeCircles";
import { useBoardKeys } from "./useBoardKeys";

/**
 * **An excerpt of a game, on a board** (CTA-126) — what an article's
 * `<InlinePgnGame>` draws: a window of a game (`lib/pgnExcerpt.ts`) the
 * reader steps through, the board beside the window's moves as PGN writes
 * them — the side lines that branch inside it nested where they branch, each
 * move a button that goes there.
 *
 * - The board shows the position on screen with its last move highlighted,
 *   and the moves on from it as the next-move arrows (the mainline's green,
 *   a side line's blue — `nextMoveArrowsOf`, every board's).
 * - **Only the window is reachable**: back stops at its first position,
 *   forward at its last; a drop is taken only when it is a move on from here
 *   that the window holds (a promotion made more than one way asks, through
 *   the shared picker), anything else snaps back.
 * - Above the board: to the window's first position, back, forward (along
 *   the line on screen), to its last, and flip — and the same from the
 *   keyboard, ← / → / Home / End, on whichever board of the page the reader
 *   last touched (`useBoardKeys`), which is ringed.
 * - **The shapes the PGN draws** at the position on screen — lichess's
 *   `[%cal]` arrows and `[%csl]` circles in the move's comment (the game's
 *   opening comment at its start; `lib/boardShapes.ts`), in the theme's
 *   brushes. Where the position carries a drawing, it is the board's message,
 *   and the next-move arrows step aside (the move list still offers the
 *   moves); `shapes={false}` turns drawings off. With `showComments`, the
 *   move on screen's PGN comment sits under the moves.
 *
 * Presentational: the tree and the window arrive as props, the position on
 * screen and the orientation are its own. Pinned LTR (`ForceLTR`), the theme's
 * squares and reduced motion (`useBoardSquareOptions`), the theme's colours.
 */

type ExcerptBoardProps = {
  /** `options.id` — unique on the page. */
  boardId: string;
  testId: string;
  /** The group's accessible name. */
  label: string;
  tree: GameTree;
  window: ExcerptWindow;
  orientation?: "white" | "black";
  /** Show the PGN comment of the move on screen. */
  showComments?: boolean;
  /** A line above the board — what this excerpt is for. */
  caption?: ReactNode;
  /** Draw the PGN's `[%cal]` / `[%csl]` shapes. Default on. */
  shapes?: boolean;
  /** Draw the arrows to the next moves over the board. Default on; off, the move list still offers them. */
  nextMoveArrows?: boolean;
};

/** A move of the list — `VariationLine`'s token: monospace, 24 px, current by `aria-current`. */
const MoveToken = styled("button")(({ theme }) => ({
  border: 0,
  margin: 0,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  paddingInline: theme.spacing(0.5),
  paddingBlock: theme.spacing(0.125),
  borderRadius: Number(theme.shape.borderRadius) * 0.5,
  minWidth: MIN_TARGET_PX,
  minHeight: MIN_TARGET_PX,
  unicodeBidi: "isolate",
  fontFamily: MONOSPACE_FONT_FAMILY,
  fontSize: "0.8125rem",
  "&:hover": { backgroundColor: (theme.vars ?? theme).palette.action.hover },
  "&:focus-visible": {
    outline: `2px solid ${(theme.vars ?? theme).palette.primary.main}`,
    outlineOffset: 1,
  },
  '&[aria-current="true"]': {
    backgroundColor: (theme.vars ?? theme).palette.primary.main,
    color: (theme.vars ?? theme).palette.primary.contrastText,
    fontWeight: 700,
  },
}));

const MoveNumber = styled("span")(({ theme }) => ({
  fontFamily: MONOSPACE_FONT_FAMILY,
  fontSize: "0.8125rem",
  color: (theme.vars ?? theme).palette.text.secondary,
  paddingInlineStart: theme.spacing(0.5),
}));

function ExcerptBoard({
  boardId,
  testId,
  label,
  tree,
  window,
  orientation: initialOrientation,
  showComments,
  caption,
  shapes: drawShapes = true,
  nextMoveArrows = true,
}: ExcerptBoardProps) {
  const { t } = useTranslation();
  const squareOptions = useBoardSquareOptions();
  const tokens = useChessTokens();
  const [nodeId, setNodeId] = useState<string | null>(window.startId);
  const [orientation, setOrientation] = useState<"white" | "black">(initialOrientation ?? "white");
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);

  const node = (nodeId === null ? undefined : findNode(tree, nodeId)) ?? undefined;
  const fen = node?.fen ?? tree.startFen;
  const turn = fen.split(" ")[1] === "b" ? "b" : "w";
  const reachable = (id: string | null) => isInExcerpt(tree, window, id);
  const onward = (node?.children ?? tree.moves).filter((child) => reachable(child.id));
  const parentId = useMemo(() => {
    const path = pathTo(tree, nodeId);
    return path.length === 0 ? undefined : (path.at(-2)?.id ?? null);
  }, [tree, nodeId]);
  const list = useMemo(() => excerptTokens(tree, window), [tree, window]);

  const goTo = (id: string | null) => {
    setPromotion(null);
    setNodeId(id);
  };

  // The position's own comments — the move's, or the game's opening one at its start.
  const comments: readonly string[] = node === undefined ? (tree.comments ?? []) : (node.comments ?? []);
  // What they say, the commands (`[%cal]`, `[%eval]`, `prc:` …) taken out.
  const comment = comments
    .flatMap((raw) => readComment(raw).paragraphs)
    .filter((text) => text.trim() !== "")
    .join("\n\n");
  const drawing = shapesOf(drawShapes ? comments : []);
  const drawn = drawsShapes(drawing);

  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (targetSquare === null) return false;
    const matching = onward.filter((child) => child.from === sourceSquare && child.to === targetSquare);
    if (matching.length === 0) return false;
    if (matching.length === 1) {
      goTo(matching[0].id);
      return true;
    }
    // Promoted more than one way here: the reader picks.
    setPromotion({ from: sourceSquare, to: targetSquare });
    return true;
  };

  const resolvePromotion = (piece: PromotionChoice | null) => {
    const move = onward.find(
      (child) => child.from === promotion?.from && child.to === promotion.to && child.san.includes(`=${piece?.toUpperCase()}`),
    );
    setPromotion(null);
    if (piece !== null && move !== undefined) goTo(move.id);
  };

  // ← / → / Home / End, when this is the board the reader last touched (`useBoardKeys`).
  const keys = useBoardKeys({
    back: () => {
      if (parentId !== undefined && reachable(parentId)) goTo(parentId);
    },
    next: () => {
      if (onward.length > 0) goTo(onward[0].id);
    },
    first: () => goTo(window.fromId),
    last: () => goTo(window.toId),
  });

  const options: ChessboardOptions = {
    ...squareOptions,
    id: boardId,
    position: fen,
    boardOrientation: orientation,
    allowDrawingArrows: false,
    arrows: drawn
      ? drawing.arrows.map(({ brush, from, to }) => ({ startSquare: from, endSquare: to, color: tokens.drawing[brush] }))
      : nextMoveArrows
        ? nextMoveArrowsOf(onward, null, tokens.arrowPalettes.classic)
        : [],
    squareStyles: node === undefined ? {} : lastMoveSquareStyles(node.from, node.to, tokens.lastMove),
    canDragPiece: ({ piece }) => piece.pieceType.startsWith(turn),
    onPieceDrop,
  };

  const renderTokens = (items: readonly ExcerptToken[]): ReactNode[] =>
    items.map((item) =>
      item.kind === "variation" ? (
        <Box
          key={`v-${item.tokens[0].kind === "move" ? item.tokens[0].node.id : "x"}`}
          data-testid={`${testId}-variation`}
          sx={{
            flexBasis: "100%",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            paddingInlineStart: 1,
            marginInlineStart: 1,
            borderInlineStart: 2,
            borderColor: "divider",
            color: "text.secondary",
          }}
        >
          {renderTokens(item.tokens)}
        </Box>
      ) : (
        <Box key={item.node.id} component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
          {item.label !== "" && <MoveNumber aria-hidden>{item.label}</MoveNumber>}
          <MoveToken
            type="button"
            dir="ltr"
            aria-label={moveName(tree.startFen, item.node)}
            aria-current={item.node.id === nodeId ? "true" : undefined}
            data-testid={`${testId}-move-${item.node.id}`}
            onClick={() => goTo(item.node.id)}
          >
            {item.node.san}
            <NagGlyphs nags={item.node.nags} testId={`${testId}-nags-${item.node.id}`} />
          </MoveToken>
        </Box>
      ),
    );

  const onScreen = node === undefined ? t("inlinePgn.start") : moveName(tree.startFen, node);

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
        mb: 3,
        // The board the keys drive (`useBoardKeys`) is ringed.
        '&:focus': { outline: "none" },
        '&[data-keys-active="true"]': {
          outline: (theme: Theme) => `2px solid ${(theme.vars ?? theme).palette.primary.main}`,
          outlineOffset: 4,
          borderRadius: 1,
        },
      }}
    >
      {caption !== undefined && (
        <Typography variant="subtitle2" component="p" sx={{ fontWeight: 600 }}>
          {caption}
        </Typography>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 320px) minmax(0, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Box sx={{ display: "grid", gap: 0.5, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="caption"
              dir="ltr"
              aria-live="polite"
              data-testid={`${testId}-on-screen`}
              sx={{ flexGrow: 1, color: "text.secondary", unicodeBidi: "isolate", fontFamily: MONOSPACE_FONT_FAMILY }}
            >
              {onScreen}
            </Typography>
            <IconAction label={t("inlinePgn.first")} disabled={nodeId === window.fromId} onClick={() => goTo(window.fromId)} testId={`${testId}-first`}>
              <FirstPageRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction
              label={t("inlinePgn.back")}
              disabled={parentId === undefined || !reachable(parentId)}
              onClick={() => parentId !== undefined && goTo(parentId)}
              testId={`${testId}-back`}
            >
              <NavigateBeforeRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction label={t("inlinePgn.next")} disabled={onward.length === 0} onClick={() => goTo(onward[0].id)} testId={`${testId}-next`}>
              <NavigateNextRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction label={t("inlinePgn.last")} disabled={nodeId === window.toId} onClick={() => goTo(window.toId)} testId={`${testId}-last`}>
              <LastPageRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction
              label={t("inlinePgn.flip")}
              onClick={() => setOrientation((side) => (side === "white" ? "black" : "white"))}
              testId={`${testId}-flip`}
            >
              <SwapVertRoundedIcon fontSize="small" />
            </IconAction>
          </Box>
          <ForceLTR sx={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
            <Chessboard options={options} />
            {drawn && <ShapeCircles circles={drawing.circles} orientation={orientation} testId={`${testId}-circles`} />}
            {promotion && (
              <PromotionPicker targetSquare={promotion.to} orientation={orientation} color={turn} onSelect={resolvePromotion} />
            )}
          </ForceLTR>
        </Box>

        <Box sx={{ display: "grid", gap: 1, minWidth: 0 }}>
          <Box
            role="group"
            aria-label={t("inlinePgn.moves")}
            data-testid={`${testId}-moves`}
            sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", rowGap: 0.25 }}
          >
            {renderTokens(list)}
          </Box>
          {showComments && comment !== "" && (
            <Typography
              variant="body2"
              data-testid={`${testId}-comment`}
              sx={{ borderInlineStart: 3, borderColor: "divider", paddingInlineStart: 1.5, whiteSpace: "pre-line" }}
            >
              {comment}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ExcerptBoard;

