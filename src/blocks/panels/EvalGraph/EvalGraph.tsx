import { useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { chessTokensOf } from "../../../design-system/theme";
import type { MoveVerdictKind } from "../../../lib/computerAnalysis";
import type { EvalPoint } from "../../../lib/computerAnalysisTree";
import { evalPointLabel, evalText, evalX, evalY, verdictTone } from "./evalGraphScale";

export type EvalGraphProps = {
  /** The graph's points (`evalSeriesOf`): the start position's eval when there is one, then every evaluated move. */
  points: readonly EvalPoint[];
  /** The move the board shows — marked on the graph. Absent, none is. */
  currentNodeId?: string | null;
  /** A point chosen — a click, or Enter on the focused one: where the board goes. Absent, the graph is only read. */
  onSelect?: (point: EvalPoint) => void;
  /** A point's move as the reader is told it ("12. Nf3"); absent, numbered from White's first move. */
  labelOf?: (point: EvalPoint) => string;
  /** The graph's accessible name ("Evaluation graph") — required, so it is never nameless. */
  label: string;
  /**
   * How many points the whole graph will hold (CTA-174): a run still being
   * made draws what it has from the left, the line growing rightwards as
   * lichess's does. Absent (or fewer than the points), the points span the
   * width.
   */
  span?: number;
  /** Its height in pixels; the width is its parent's. */
  height?: number;
  /** The root; the parts are `-plot`, `-point-<ply>` (a verdict's dot), `-current`, `-tooltip`. */
  testId: string;
};

const POINT_RADIUS = 4;

/** The colours, every one the theme's: the line and its wash, the zero line, the hairlines, the verdicts' dots. */
const graphSx = (theme: Theme) => {
  const palette = (theme.vars ?? theme).palette;
  const nag = chessTokensOf(theme).nag;
  return {
    "& .eval-area": { fill: palette.primary.main },
    "& .eval-line": { stroke: palette.primary.main },
    "& .eval-zero": { stroke: palette.divider },
    "& .eval-crosshair": { stroke: palette.text.secondary },
    "& .eval-current": { stroke: palette.primary.main },
    "& .eval-point": { stroke: palette.background.paper },
    "& .eval-point-active": { fill: palette.primary.main, stroke: palette.background.paper },
    ...Object.fromEntries(
      (["dubious", "mistake", "blunder"] as const).map((tone) => [
        `& .eval-point[data-tone="${tone}"]`,
        { fill: nag[tone].light, ...theme.applyStyles("dark", { fill: nag[tone].dark }) },
      ]),
    ),
    "&:focus-visible": { ...theme.mixins.focusRing },
  };
};

/**
 * **A game's evaluation graph** (CTA-173, CTA-171), lichess's: White's
 * advantage over the moves, a line over a wash from the zero line, each
 * inaccuracy, mistake and blunder a dot in its move-mark colour (`?!`, `?`,
 * `??` — a missed mate a blunder's), the move on the board a hairline.
 *
 * - **The scale** is the win chance, not the centipawns (`evalGraphScale.ts`):
 *   a pawn up matters near equality and hardly at all at +8, so the graph
 *   reads as the game felt. Mates sit at the edges.
 * - **Pointed at**, a crosshair snaps to the nearest move and a tooltip says
 *   its move, eval and verdict; a click chooses it (`onSelect` — the board
 *   goes there).
 * - **By keyboard** it is a slider over the moves (WAI-ARIA's slider): ← / →
 *   step, Home / End go to either end, Enter or Space chooses — the value read
 *   out as the move, its eval and its verdict, so the graph has a text
 *   alternative point by point. The report beside it (`ComputerAnalysisReport`)
 *   is the same run in numbers.
 * - Pinned left to right: the moves run as time does, in every language.
 *
 * Presentational: the points are a prop (`lib/computerAnalysisTree.ts`), the
 * words the app's (`computerAnalysis.graph.*`).
 */
function EvalGraph({ points, currentNodeId, onSelect, labelOf, label, span, height = 120, testId }: EvalGraphProps) {
  const { t } = useTranslation();
  const hintId = useId();
  const currentIndex = currentNodeId === undefined ? -1 : points.findIndex((point) => point.nodeId === currentNodeId);
  const [hovered, setHovered] = useState<number | undefined>();
  const [focused, setFocused] = useState<number | undefined>();
  const [hasFocus, setHasFocus] = useState(false);

  if (points.length === 0) {
    return (
      <Typography variant="body2" data-testid={testId} sx={{ color: "text.secondary" }}>
        {t("computerAnalysis.graph.empty")}
      </Typography>
    );
  }

  const last = points.length - 1;
  const keyboardIndex = focused ?? (currentIndex >= 0 ? currentIndex : last);
  const active = hovered ?? (hasFocus ? keyboardIndex : undefined);
  const nameOf = (point: EvalPoint) => (point.nodeId === null ? t("computerAnalysis.graph.start") : (labelOf ?? evalPointLabel)(point));
  const kindOf = (kind: MoveVerdictKind | null) => (kind === null ? "" : t(`computerAnalysis.verdicts.${kind}`));
  const describe = (point: EvalPoint) =>
    [nameOf(point), evalText(point.score), kindOf(point.kind)].filter((part) => part !== "").join(", ");

  const slots = Math.max(points.length, span ?? 0);
  const xs = points.map((_, index) => evalX(index, slots));
  const ys = points.map((point) => evalY(point.cp));
  const line = xs.map((x, index) => `${index === 0 ? "M" : "L"}${x} ${ys[index]}`).join(" ");
  const area = `M${xs[0]} 50 ${xs.map((x, index) => `L${x} ${ys[index]}`).join(" ")} L${xs[last]} 50 Z`;

  const indexAt = (event: MouseEvent<HTMLElement>): number => {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = box.width === 0 ? 0 : (event.clientX - box.left) / box.width;
    return Math.min(last, Math.max(0, Math.round(fraction * (slots - 1))));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step: Record<string, number | undefined> = {
      ArrowRight: keyboardIndex + 1,
      ArrowUp: keyboardIndex + 1,
      ArrowLeft: keyboardIndex - 1,
      ArrowDown: keyboardIndex - 1,
      Home: 0,
      End: last,
    };
    const next = step[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setFocused(Math.min(last, Math.max(0, next)));
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && onSelect !== undefined) {
      event.preventDefault();
      onSelect(points[keyboardIndex]);
    }
  };

  return (
    <Box data-testid={testId} dir="ltr" sx={{ position: "relative" }}>
      <Box
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-describedby={hintId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={keyboardIndex}
        aria-valuetext={describe(points[keyboardIndex])}
        data-testid={`${testId}-plot`}
        onKeyDown={onKeyDown}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        onPointerMove={(event) => setHovered(indexAt(event))}
        onPointerLeave={() => setHovered(undefined)}
        onClick={(event) => {
          const index = indexAt(event);
          setFocused(index);
          onSelect?.(points[index]);
        }}
        sx={(theme) => ({
          position: "relative",
          height,
          borderRadius: 1,
          cursor: onSelect === undefined ? "crosshair" : "pointer",
          touchAction: "none",
          ...graphSx(theme),
        })}
      >
        {/* The line and its wash, stretched to the box: the strokes keep their width. */}
        <Box component="svg" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <line className="eval-zero" x1={0} y1={50} x2={100} y2={50} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path className="eval-area" d={area} fillOpacity={0.12} />
          <path className="eval-line" d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </Box>
        {/* The marks, unstretched: placed in percentages, so a dot stays round. */}
        <Box component="svg" aria-hidden="true" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          {currentIndex >= 0 && (
            <line className="eval-current" data-testid={`${testId}-current`} x1={`${xs[currentIndex]}%`} y1="0%" x2={`${xs[currentIndex]}%`} y2="100%" strokeWidth={1} />
          )}
          {active !== undefined && (
            <line className="eval-crosshair" x1={`${xs[active]}%`} y1="0%" x2={`${xs[active]}%`} y2="100%" strokeWidth={1} />
          )}
          {points.map((point, index) =>
            point.kind === null ? null : (
              <circle
                key={point.nodeId ?? "start"}
                className="eval-point"
                data-tone={verdictTone(point.kind)}
                data-testid={`${testId}-point-${point.ply}`}
                cx={`${xs[index]}%`}
                cy={`${ys[index]}%`}
                r={POINT_RADIUS}
                strokeWidth={2}
              />
            ),
          )}
          {active !== undefined && (
            <circle className="eval-point-active" cx={`${xs[active]}%`} cy={`${ys[active]}%`} r={POINT_RADIUS + 1} strokeWidth={2} />
          )}
        </Box>
      </Box>
      {active !== undefined && (
        <Box
          aria-hidden="true"
          data-testid={`${testId}-tooltip`}
          // Inline, so the RTL stylis plugin never turns the side — the graph is pinned left to right.
          style={{ insetInlineStart: `${xs[active]}%`, transform: `translateX(${xs[active] > 70 ? "-100%" : xs[active] < 30 ? "0" : "-50%"})` }}
          sx={{
            position: "absolute",
            bottom: "100%",
            mb: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            boxShadow: 1,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <Typography variant="caption">{describe(points[active])}</Typography>
        </Box>
      )}
      <Box id={hintId} sx={visuallyHidden}>
        {t(onSelect === undefined ? "computerAnalysis.graph.hintRead" : "computerAnalysis.graph.hint")}
      </Box>
    </Box>
  );
}

export default EvalGraph;
