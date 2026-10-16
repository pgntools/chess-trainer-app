import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { ComputerAnalysisReport, EvalGraph, evalText } from "../../../blocks/panels";
import { LoadingLine } from "../../../design-system/components/states";
import { caseTree } from "../../../lib/analysisProjects";
import { evalSeriesOf, reportFromTree } from "../../../lib/computerAnalysisTree";
import { gameTag } from "../../../lib/gameModel";
import { plyLabel, type GameTree } from "../../../lib/gameTree";
import type { ComputerAnalysisInput } from "../../../lib/jobs/kinds/computerAnalysis/core";
import type { ComputerAnalysisJobState } from "../../../lib/jobs/kinds/computerAnalysis/kind";
import { liveAnalysisOf } from "../../../lib/jobs/kinds/computerAnalysis/liveAnalysis";
import { useAnalysisCases } from "../../analysisV2/useAnalysisProjects";

/** A graph point's move, as a reader numbers it. */
const pointLabel = (tree: GameTree) => (point: { ply: number; san?: string }) => {
  const { number, isWhiteMove } = plyLabel(tree.startFen, point.ply);
  return `${number}${isWhiteMove ? "." : "..."} ${point.san ?? ""}`;
};

/**
 * **A finished computer analysis's report and eval graph** (CTA-188, the
 * Jobs module's since CTA-221), read back from its first output Case — a new
 * Case, or the source Case merged into — through `reportFromTree` and
 * `evalSeriesOf`, so nothing about the run is kept twice. The graph is read
 * only; the outputs' links open the Cases. An output gone says so.
 */
export function ComputerAnalysisDoneReport({ caseId, testId }: { caseId: string; testId: string }) {
  const { t } = useTranslation();
  const cases = useAnalysisCases();
  const pgn = cases?.find((record) => record.id === caseId)?.pgn;
  const tree = useMemo(() => (pgn === undefined ? undefined : caseTree({ pgn })), [pgn]);
  const read = useMemo(() => (tree === undefined ? undefined : { report: reportFromTree(tree), points: evalSeriesOf(tree) }), [tree]);

  if (cases === undefined) return <LoadingLine testId={`${testId}-loading`}>{t("jobs.reportReading")}</LoadingLine>;
  if (tree === undefined || read === undefined) {
    return (
      <Typography variant="body2" data-testid={`${testId}-missing`} sx={{ color: "text.secondary" }}>
        {t("jobs.kinds.computerAnalysis.reportMissing")}
      </Typography>
    );
  }
  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("jobs.reportTitle")}
      </Typography>
      <EvalGraph points={read.points} label={t("computerAnalysis.graph.title")} labelOf={pointLabel(tree)} testId={`${testId}-graph`} />
      <ComputerAnalysisReport report={read.report} players={{ w: tree.headers.White, b: tree.headers.Black }} testId={`${testId}-table`} />
    </Box>
  );
}

/**
 * **A computer analysis's results so far** (CTA-178, CTA-188):
 * `liveAnalysisOf` over the job as the store holds it, filling in with every
 * checkpoint — the eval graph spanning the run (read only), the latest
 * finished position and the report over the moves judged. Nothing in it is a
 * live region. Before the first position, "No results yet".
 */
export function ComputerAnalysisLiveReport({
  input,
  state,
  testId,
}: {
  input: ComputerAnalysisInput;
  state: ComputerAnalysisJobState | null;
  testId: string;
}) {
  const { t } = useTranslation();
  const live = useMemo(
    () => (state === null ? undefined : liveAnalysisOf({ source: input.source, options: input.options, positions: state.positions, checkpoint: state.checkpoint })),
    [input, state],
  );
  if (live === undefined || live.points.length === 0 || state === null) {
    return (
      <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary" }}>
        {t("jobs.liveEmpty")}
      </Typography>
    );
  }
  const { tree, points, latest } = live;
  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("jobs.liveTitle")}
      </Typography>
      <EvalGraph points={points} span={state.positions.length} label={t("computerAnalysis.board.liveGraph")} labelOf={pointLabel(tree)} testId={`${testId}-graph`} />
      {latest !== undefined && (
        <Typography variant="body2" data-testid={`${testId}-latest`}>
          {latest.move === undefined ? t("computerAnalysis.board.latestStart") : t("computerAnalysis.board.latest")}{" "}
          {latest.move !== undefined && <bdi dir="ltr">{latest.move}</bdi>}
          {": "}
          <bdi dir="ltr">{evalText(latest.line.score)}</bdi>
          {" · "}
          {t("computerAnalysis.board.depth", { depth: latest.line.depth })}
          {latest.moves !== "" && (
            <>
              {" · "}
              <bdi dir="ltr">{latest.moves}</bdi>
            </>
          )}
        </Typography>
      )}
      {live.verdicts.length > 0 && (
        <ComputerAnalysisReport
          report={live.report}
          players={{ w: gameTag(tree.headers, "White"), b: gameTag(tree.headers, "Black") }}
          testId={`${testId}-table`}
        />
      )}
    </Box>
  );
}
