import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { ComputerAnalysisReport, EvalGraph } from "../../blocks/panels";
import { LoadingLine } from "../../design-system/components/states";
import { evalSeriesOf, reportFromTree } from "../../lib/computerAnalysisTree";
import { plyLabel } from "../../lib/gameTree";
import type { Job } from "../../lib/jobs";
import { atParamOf, REPERTOIRE_AT_PARAM } from "../../lib/repertoireLink";
import { savedAnalysisToTree } from "../../lib/savedAnalyses";
import { useSavedAnalyses } from "../tools/analysis/saved/useSavedAnalyses";

/**
 * **A finished job's report and eval graph** (CTA-173), read back from its
 * first output — a Saved analysis like any other, through `reportFromTree`
 * and `evalSeriesOf` (`lib/computerAnalysisTree.ts`), so nothing about the
 * run is kept twice. A point of the graph opens that output on the Analysis
 * Board at its move (`?at=`). An output deleted since says so.
 */
function JobReport({ job, testId }: { job: Job; testId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const analyses = useSavedAnalyses();
  const output = job.outputs[0];
  const record = output === undefined ? undefined : analyses?.find((row) => row.id === output.analysisId);
  const tree = useMemo(() => (record === undefined ? undefined : savedAnalysisToTree(record)), [record]);
  const read = useMemo(
    () => (tree === undefined ? undefined : { report: reportFromTree(tree), points: evalSeriesOf(tree) }),
    [tree],
  );

  if (output === undefined) return null;
  if (analyses === undefined) return <LoadingLine testId={`${testId}-loading`}>{t("jobs.reportReading")}</LoadingLine>;
  if (tree === undefined || read === undefined) {
    return (
      <Typography variant="body2" data-testid={`${testId}-missing`} sx={{ color: "text.secondary" }}>
        {t("jobs.reportMissing")}
      </Typography>
    );
  }

  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("jobs.reportTitle")}
      </Typography>
      <EvalGraph
        points={read.points}
        label={t("computerAnalysis.graph.title")}
        labelOf={(point) => {
          const { number, isWhiteMove } = plyLabel(tree.startFen, point.ply);
          return `${number}${isWhiteMove ? "." : "..."} ${point.san ?? ""}`;
        }}
        onSelect={(point) => {
          const params = new URLSearchParams({ analysis: output.analysisId });
          if (point.nodeId !== null) params.set(REPERTOIRE_AT_PARAM, atParamOf(tree, point.nodeId));
          void navigate(`/tools/analysis?${params.toString()}`);
        }}
        testId={`${testId}-graph`}
      />
      <ComputerAnalysisReport report={read.report} players={{ w: tree.headers.White, b: tree.headers.Black }} testId={`${testId}-table`} />
    </Box>
  );
}

export default JobReport;
