import { useId, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { ComputerAnalysisReport, EvalGraph } from "../../../blocks/panels";
import { ExpandToggle } from "../../../design-system/components/navigation";
import type { MoveVerdictKind } from "../../../lib/computerAnalysis";
import { evalSeriesOf, reportFromTree, type EvalPoint } from "../../../lib/computerAnalysisTree";
import type { Turn } from "../../../lib/engineAnalysis";
import { gameTag } from "../../../lib/gameModel";
import { plyLabel, type GameTree } from "../../../lib/gameTree";
import { SAVED_ANALYSIS_PLAYER } from "../../../lib/savedAnalyses";

type AnalysisEvalReportProps = {
  /** The game on the board, and where it stands — the mainline's ply, 0 at the start or off the mainline. */
  tree: GameTree;
  mainlinePly: number;
  currentNodeId: string | null;
  onGoToNode: (nodeId: string | null) => void;
};

/** A player's name from the tags — none for the placeholders a board's own analysis is written with (`Analysis`, `?`). */
const playerOf = (tree: GameTree, key: "White" | "Black"): string | undefined => {
  const name = gameTag(tree.headers, key);
  return name === SAVED_ANALYSIS_PLAYER ? undefined : name;
};

/** The verdicts a report's counts step through, in the order the reader steps: after the move on the board, then round again. */
const nextOfKind = (points: readonly EvalPoint[], side: Turn, kind: MoveVerdictKind, afterPly: number): EvalPoint | undefined => {
  const ofKind = points.filter((point) => point.side === side && point.kind === kind);
  return ofKind.find((point) => point.ply > afterPly) ?? ofKind[0];
};

/**
 * **The report and the eval graph at the top of the Moves tab** (CTA-177 —
 * the Computer analysis tab's, CTA-174, before), whenever the tree on screen
 * carries `[%eval]`s: an output of a computer analysis, a lichess export, the
 * evaluations the Engine tab wrote (CTA-167) — `evalSeriesOf` /
 * `reportFromTree` over the tree as it stands, so an edit shows at once.
 * Nothing at all for a tree with none.
 *
 * The graph (`EvalGraph`) marks the move on the board and moves it on a click
 * or Enter — the start position's point to the start; under it the report
 * (`ComputerAnalysisReport`, players from the tags), behind a toggle open by
 * default, makes each count above 0 a button to **that side's next move of
 * that kind** after the mainline move on the board, round again from the
 * first (`onStep`, lichess's).
 */
function AnalysisEvalReport({ tree, mainlinePly, currentNodeId, onGoToNode }: AnalysisEvalReportProps) {
  const { t } = useTranslation();
  const [reportOpen, setReportOpen] = useState(true);
  const reportId = useId();
  const read = useMemo(() => {
    const points = evalSeriesOf(tree);
    return points.length === 0 ? undefined : { points, report: reportFromTree(tree) };
  }, [tree]);
  if (read === undefined) return null;

  const moveLabel = (point: EvalPoint) => {
    const { number, isWhiteMove } = plyLabel(tree.startFen, point.ply);
    return `${number}${isWhiteMove ? "." : "..."} ${point.san ?? ""}`;
  };

  return (
    <Box
      component="section"
      aria-label={t("computerAnalysis.report.title")}
      data-testid="analysis-computer"
      sx={{ display: "grid", gap: 1, px: 1, pt: 1, pb: 1.5, borderBottom: 1, borderColor: "divider" }}
    >
      <EvalGraph
        points={read.points}
        currentNodeId={currentNodeId}
        onSelect={(point) => onGoToNode(point.nodeId)}
        labelOf={moveLabel}
        label={t("computerAnalysis.graph.title")}
        height={96}
        testId="analysis-computer-graph"
      />
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <ExpandToggle
            expanded={reportOpen}
            onToggle={() => setReportOpen((open) => !open)}
            label={t("computerAnalysis.board.reportToggle")}
            controls={reportId}
            testId="analysis-computer-report-toggle"
          />
          <Typography variant="subtitle2" component="span" aria-hidden="true" sx={{ fontWeight: 700 }}>
            {t("computerAnalysis.board.reportTitle")}
          </Typography>
        </Box>
        <Collapse in={reportOpen} unmountOnExit id={reportId}>
          <ComputerAnalysisReport
            report={read.report}
            players={{ w: playerOf(tree, "White"), b: playerOf(tree, "Black") }}
            onStep={(side, kind) => {
              const next = nextOfKind(read.points, side, kind, mainlinePly);
              if (next !== undefined) onGoToNode(next.nodeId);
            }}
            testId="analysis-computer-report"
          />
        </Collapse>
      </Box>
    </Box>
  );
}

export default AnalysisEvalReport;
