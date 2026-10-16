import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import { Chess, type Square } from "chess.js";
import { Chessboard, type ChessboardOptions, type PieceDropHandlerArgs } from "react-chessboard";
import { useTranslation } from "react-i18next";

import type { OpeningTreeNode } from "../../lib/openingTree";
import { openingTreeToPgn, type OpeningTreePgnTags } from "../../lib/openingTreePgn";
import { downloadPgn } from "../../lib/pgnExport";
import { slugify } from "../../lib/pgnText";
import { OpeningTreePgnDialog } from "../../blocks/dialogs";
import { IconAction } from "../../design-system/components/toolbars";
import { MIN_TARGET_PX, useChessTokens } from "../../design-system/theme";
import type { ResultTone } from "../../design-system/themes";
import { ForceLTR } from "../../theme/ForceLTR";
import ChanceArrows from "../explorer/ChanceArrows";
import { useBoardSquareOptions } from "./boardColors";
import PromotionPicker, { type PromotionChoice } from "./PromotionPicker";
import { moveSx, sanTokenSx } from "./moveTokenSx";

/**
 * **The opening-moves filter** (CTA-76) — a small board beside a table of
 * games: the reader plays an opening on it, and the table keeps the games
 * that began that way. The Library's collection table has it at the foot of
 * its filters; an Analysis Project its Games tree tab, over its Game Cases
 * (CTA-214) — one board, shared, each naming its tree and its test ids.
 *
 * Presentational over an opening tree (`lib/openingTree.ts`, merged from the
 * games the table's other filters leave): `line` is the moves played so far,
 * `node` where they lead in that tree — a node of no games when those games
 * never played the line — and every change goes out through `onLine`. From the
 * position it reaches, the board shows
 *
 * - the **continuations** as the play-chance arrows over the board
 *   (`ChanceArrows`, CTA-92) — white with a magenta border, the wider the more
 *   of the position's games played the move (its share, `child.count /
 *   node.count`), the hovered one in red — and as a list, lichess-explorer
 *   style: each move with its games, their share, and a White / draw / Black
 *   bar. A click plays it, a hover draws its arrow;
 * - **only those moves**: a drop the games never played is refused and the
 *   piece snaps back. A promotion the games made more than one way asks which
 *   piece, the shared picker over the board.
 *
 * The tree is cut where the games stop branching (`node.continues`): a
 * position only one game goes on from offers nothing to choose, and the
 * caption says so rather than drawing one lone arrow for the rest of it.
 *
 * **Save tree as PGN** (CTA-99), the link at the end of the caption row, writes
 * that tree below the position shown as one PGN file — the moves played lead to
 * it, the most played move is the line — with each move's counts as
 * `[%games N]` / `[%prc P]` when the reader asks for them
 * (`OpeningTreePgnDialog`, `lib/openingTreePgn.ts`). Built only on Save.
 *
 * `chess.js` only turns the line into a position and SAN into squares here —
 * up to a game's full length, replayed when the line changes. The board is
 * pinned LTR (`ForceLTR`): files run a–h left to right in every language.
 */

type Continuation = {
  /** Its SAN, which is unique among a position's moves — the arrows' id. */
  id: string;
  san: string;
  from: Square;
  to: Square;
  promotion?: string;
  node: OpeningTreeNode;
};

const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

function ResultBar({ node }: { node: OpeningTreeNode }) {
  const { white, draw, black } = node.results;
  // The theme's result tones (CTA-107).
  const tones = useChessTokens().filterBoard;
  const total = white + draw + black;
  if (total === 0) return <Box />;
  const part = (count: number, { background: bgcolor, text: color }: ResultTone) =>
    count === 0 ? null : (
      <Box
        sx={{
          flexGrow: count,
          flexBasis: 0,
          bgcolor,
          color,
          fontSize: 10,
          lineHeight: "14px",
          textAlign: "center",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {percent(count, total) >= 15 ? `${percent(count, total)}%` : ""}
      </Box>
    );
  return (
    <Box
      sx={{ display: "flex", height: 14, borderRadius: 0.5, overflow: "hidden", border: "1px solid", borderColor: "divider" }}
    >
      {part(white, tones.white)}
      {part(draw, tones.draw)}
      {part(black, tones.black)}
    </Box>
  );
}

/** The board's words that name its games — the Library's by default (`library.filters.moves.*`). */
export type OpeningFilterBoardCaptions = {
  /** Its heading. */
  title: string;
  /** The caption at the start. */
  start: string;
  /** No game goes further. */
  end: string;
  /** One game goes further, alone — the tree's cut. */
  single: string;
  /** No game the other filters leave was played this way. */
  none: string;
};

type OpeningFilterBoardProps = {
  /** The moves played, already matched against the collection's tree. */
  line: readonly string[];
  /** The node `line` reaches. */
  node: OpeningTreeNode;
  onLine: (line: string[]) => void;
  /** The games' name — a collection's, a Project's: the saved tree's `Event` and its file name. */
  treeName: string;
  /** The file's name when `treeName` makes none (`<it>-tree.pgn`). */
  fileFallback?: string;
  /** Its words naming the games — a Project's Cases rather than a collection's (CTA-214). */
  captions?: OpeningFilterBoardCaptions;
  /**
   * The prefix of its ids (`library-filter` by default, the Library's): the
   * board `<testId>-board`, the root `<testId>-moves`, its controls and
   * caption `<testId>-moves-…`, a move `<testId>-move-<san>`, the arrows
   * `<testId>-arrows`.
   */
  testId?: string;
};

function OpeningFilterBoard({
  line,
  node,
  onLine,
  treeName,
  fileFallback = "collection",
  captions,
  testId = "library-filter",
}: OpeningFilterBoardProps) {
  const { t } = useTranslation();
  const words: OpeningFilterBoardCaptions = captions ?? {
    title: t("library.filters.moves.title"),
    start: t("library.filters.moves.start"),
    end: t("library.filters.moves.end"),
    single: t("library.filters.moves.single"),
    none: t("library.filters.moves.none"),
  };
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const squareOptions = useBoardSquareOptions();
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);

  const key = line.join(" ");
  const { fen, turn, continuations } = useMemo(() => {
    const chess = new Chess();
    for (const san of key === "" ? [] : key.split(" ")) chess.move(san);
    const legal = new Map(chess.moves({ verbose: true }).map((move) => [move.san, move]));
    const found: Continuation[] = [];
    for (const child of node.children) {
      const move = legal.get(child.san);
      if (move === undefined) continue;
      found.push({ id: child.san, san: child.san, from: move.from, to: move.to, promotion: move.promotion, node: child });
    }
    return { fen: chess.fen(), turn: chess.turn(), continuations: found };
  }, [key, node]);

  const play = (san: string) => {
    setHovered(null);
    setPromotion(null);
    onLine([...line, san]);
  };

  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (targetSquare === null) return false;
    const played = continuations.filter((move) => move.from === sourceSquare && move.to === targetSquare);
    if (played.length === 0) return false;
    if (played.length === 1) {
      play(played[0].san);
      return true;
    }
    // Promoted more than one way in these games: the reader picks. `true`, or the
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
    // The theme's squares (CTA-107).
    ...squareOptions,
    id: `${testId}-board`,
    position: fen,
    boardOrientation: orientation,
    allowDrawingArrows: false,
    canDragPiece: ({ piece }) => piece.pieceType.startsWith(turn),
    onPieceDrop,
  };

  const saveTree = (tags: OpeningTreePgnTags) => {
    setSaving(false);
    downloadPgn(`${slugify(treeName) || fileFallback}-tree`, [
      openingTreeToPgn(line, node, tags, { Event: treeName }),
    ]);
  };

  const numbered = line.map((san, index) => (index % 2 === 0 ? `${index / 2 + 1}. ${san}` : san)).join(" ");

  return (
    <Box data-testid={`${testId}-moves`} sx={{ display: "grid", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {words.title}
        </Typography>
        <IconAction
          label={t("library.filters.moves.reset")}
          disabled={line.length === 0}
          onClick={() => onLine([])}
          testId={`${testId}-moves-reset`}
        >
          <FirstPageRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction
          label={t("library.filters.moves.back")}
          disabled={line.length === 0}
          onClick={() => onLine(line.slice(0, -1))}
          testId={`${testId}-moves-back`}
        >
          <NavigateBeforeRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction
          label={t("library.filters.moves.flip")}
          onClick={() => setOrientation((side) => (side === "white" ? "black" : "white"))}
          testId={`${testId}-moves-flip`}
        >
          <SwapVertRoundedIcon fontSize="small" />
        </IconAction>
      </Box>

      <ForceLTR sx={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
        <Chessboard options={options} />
        <ChanceArrows
          testId={`${testId}-arrows`}
          nodes={continuations}
          chances={continuations.map((move) => move.node.count / node.count)}
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

      {/* The row mirrors — the link sits at its inline end — and the moves in it do not. */}
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography
          variant="caption"
          dir="ltr"
          data-testid={`${testId}-moves-line`}
          sx={{ flexGrow: 1, minWidth: 0, color: "text.secondary", minHeight: "1.5em", unicodeBidi: "isolate" }}
        >
          {line.length === 0 ? words.start : numbered}
        </Typography>
        <Link
          component="button"
          type="button"
          variant="caption"
          onClick={() => setSaving(true)}
          data-testid={`${testId}-moves-save`}
          // A target of at least 24 px (WCAG 2.5.8) — in a panel at its true width it sits close to the line beside it.
          sx={{ flexShrink: 0, whiteSpace: "nowrap", minHeight: MIN_TARGET_PX, display: "inline-flex", alignItems: "center" }}
        >
          {t("library.filters.moves.save")}
        </Link>
      </Box>
      <OpeningTreePgnDialog
        open={saving}
        onClose={() => setSaving(false)}
        onSave={saveTree}
        testId={`${testId}-moves-save-dialog`}
        partsTestId={`${testId}-moves-save`}
      />

      {continuations.length === 0 ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }} data-testid={`${testId}-moves-end`}>
          {node.count === 0 ? words.none : node.continues ? words.single : words.end}
        </Typography>
      ) : (
        <Box
          data-testid={`${testId}-moves-list`}
          sx={{ display: "grid", gridTemplateColumns: "auto auto 1fr", alignItems: "center", columnGap: 1, rowGap: 0.25 }}
          onMouseLeave={() => setHovered(null)}
        >
          {continuations.map((move) => (
            <Box key={move.id} sx={{ display: "contents" }}>
              <ButtonBase
                dir="ltr"
                data-testid={`${testId}-move-${move.san}`}
                onClick={() => play(move.san)}
                onMouseEnter={() => setHovered(move.id)}
                // At least a 24 px target (WCAG 2.5.8): the rows sit close in a narrow panel.
                sx={{ ...moveSx, ...sanTokenSx, justifySelf: "start", minWidth: MIN_TARGET_PX, minHeight: MIN_TARGET_PX }}
              >
                {move.san}
              </ButtonBase>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", textAlign: "end", whiteSpace: "nowrap" }}
                data-testid={`${testId}-move-count-${move.san}`}
              >
                {t("library.games", { count: move.node.count })} · {percent(move.node.count, node.count)}%
              </Typography>
              <ResultBar node={move.node} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default OpeningFilterBoard;
