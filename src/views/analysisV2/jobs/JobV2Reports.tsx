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
import { jobV2LiveAnalysis } from "../../../lib/jobV2LiveAnalysis";
import type { JobV2 } from "../../../lib/jobsV2";
import { useAnalysisCases } from "../useAnalysisProjects";

/** A graph point's move, as a reader numbers it. */
const pointLabel = (tree: GameTree) => (point: { ply: number; san?: string }) => {
  const { number, isWhiteMove } = plyLabel(tree.startFen, point.ply);
  return `${number}${isWhiteMove ? "." : "..."} ${point.san ?? ""}`;
};

/**
 * **A finished Jobs V2 job's report and eval graph** (CTA-188), read back
 * from its first output — a new Case, or the source Case merged into — through
 * `reportFromTree` and `evalSeriesOf`, so nothing about the run is kept twice
 * (V1's `JobReport`, cloned: Analysis V2 imports nothing from `views/jobs/`).
 * The graph is read only; the summary's links open the Cases. An output gone
 * says so.
 */
export function JobV2Report({ job, testId }: { job: JobV2; testId: string }) {
  const { t } = useTranslation();
  const cases = useAnalysisCases();
  const output = job.outputs[0];
  const pgn = output === undefined ? undefined : cases?.find((record) => record.id === output.caseId)?.pgn;
  const tree = useMemo(() => (pgn === undefined ? undefined : caseTree({ pgn })), [pgn]);
  const read = useMemo(() => (tree === undefined ? undefined : { report: reportFromTree(tree), points: evalSeriesOf(tree) }), [tree]);

  if (output === undefined) return null;
  if (cases === undefined) return <LoadingLine testId={`${testId}-loading`}>{t("jobs.reportReading")}</LoadingLine>;
  if (tree === undefined || read === undefined) {
    return (
      <Typography variant="body2" data-testid={`${testId}-missing`} sx={{ color: "text.secondary" }}>
        {t("analysisV2.jobs.reportMissing")}
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
 * **A Jobs V2 job's results so far** (CTA-188) — V1's `JobLiveReport`, cloned:
 * `jobV2LiveAnalysis` over the job as the store holds it, filling in with every
 * checkpoint — the eval graph spanning the run (read only), the latest
 * finished position and the report over the moves judged. Nothing in it is a
 * live region. Before the first position, "No results yet".
 */
export function JobV2LiveReport({ job, testId }: { job: JobV2; testId: string }) {
  const { t } = useTranslation();
  const live = useMemo(() => jobV2LiveAnalysis(job), [job]);
  if (live === undefined || live.points.length === 0) {
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
      <EvalGraph points={points} span={job.positions.length} label={t("computerAnalysis.board.liveGraph")} labelOf={pointLabel(tree)} testId={`${testId}-graph`} />
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
