import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { ComputerAnalysisReport, EvalGraph, evalText } from "../../blocks/panels";
import { gameTag } from "../../lib/gameModel";
import { plyLabel, type GameTree } from "../../lib/gameTree";
import { jobLiveAnalysis } from "../../lib/jobLiveAnalysis";
import type { Job } from "../../lib/jobs";
import { atParamOf, REPERTOIRE_AT_PARAM } from "../../lib/repertoireLink";
import { SAVED_ANALYSIS_PLAYER } from "../../lib/savedAnalyses";

/** A player's name from the tags — none for the placeholder a board's own analysis is written with. */
const playerOf = (tree: GameTree, key: "White" | "Black"): string | undefined => {
  const name = gameTag(tree.headers, key);
  return name === SAVED_ANALYSIS_PLAYER ? undefined : name;
};

/**
 * **A job's results so far** (CTA-178, `jobLiveAnalysis`) — what the Jobs
 * screen's panel shows of a job not done: queued or running, filling in as
 * the store changes, and paused, interrupted, failed or cancelled, what its
 * checkpoint holds. Lichess's server analysis, filling in:
 *
 * - **the eval graph** spanning the whole run (`span`), the line growing from
 *   the left as positions finish — a point opening the source on the Analysis
 *   Board at its move (`?at=`) where the source is a saved analysis, else
 *   only read;
 * - **the latest finished position**: its eval, depth and numbered best line;
 * - **the report** over the moves judged so far.
 *
 * Nothing here is a live region: the summary's status line is what says the
 * job moved on. Nothing at all before the first position is finished, or
 * when the source no longer reads.
 */
function JobLiveReport({ job, testId }: { job: Job; testId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const live = useMemo(() => jobLiveAnalysis(job), [job]);
  if (live === undefined || live.points.length === 0) return null;
  const { tree, points, latest } = live;
  const { analysisId } = job.source;

  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("jobs.liveTitle")}
      </Typography>
      <EvalGraph
        points={points}
        span={job.positions.length}
        label={t("computerAnalysis.board.liveGraph")}
        labelOf={(point) => {
          const { number, isWhiteMove } = plyLabel(tree.startFen, point.ply);
          return `${number}${isWhiteMove ? "." : "..."} ${point.san ?? ""}`;
        }}
        onSelect={
          analysisId === null
            ? undefined
            : (point) => {
                const params = new URLSearchParams({ analysis: analysisId });
                if (point.nodeId !== null) params.set(REPERTOIRE_AT_PARAM, atParamOf(tree, point.nodeId));
                void navigate(`/tools/analysis?${params.toString()}`);
              }
        }
        testId={`${testId}-graph`}
      />
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
          players={{ w: playerOf(tree, "White"), b: playerOf(tree, "Black") }}
          testId={`${testId}-table`}
        />
      )}
    </Box>
  );
}

export default JobLiveReport;
