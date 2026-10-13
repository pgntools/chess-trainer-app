import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { KeyValueList } from "../../../design-system/components/lists";
import { formatEngineCount, formatScore } from "../../../lib/engineAnalysis";
import type { JobV2Live } from "../../../lib/jobV2Live";

/** How many depths apart the screen reader hears the search again — never every update. */
const ANNOUNCE_EVERY_DEPTHS = 10;

/**
 * **What the engine is doing on a running job's position, live** (CTA-190) —
 * a Jobs V2 job's panel's engine section, under its progress bar: the move
 * being searched, depth / selective depth, nodes and nodes per second
 * ("2.4M"), the time on this position, how full the hash is where the engine
 * says, and the best line so far with its score — every number from the
 * engine's own `info` lines (`lib/jobV2Live.ts`), a few updates a second.
 *
 * **Announced politely and sparingly**: its status region speaks when a new
 * position is searched and every {@link ANNOUNCE_EVERY_DEPTHS} depths — the
 * numbers themselves are not live. Presentational: the snapshot is a prop;
 * the screen shows it only while the job runs.
 */
function JobEngineProgress({
  live,
  testId,
}: {
  live: JobV2Live;
  /** The root; the parts are `-move`, `-status` (the announcement), `-facts` (each `-facts-<depth|nodes|nps|time|hash>`) and `-line`. */
  testId: string;
}) {
  const { t } = useTranslation();
  const move = live.move ?? t("analysisV2.jobs.live.finalPosition");
  const milestone = Math.floor(live.depth / ANNOUNCE_EVERY_DEPTHS) * ANNOUNCE_EVERY_DEPTHS;
  const announcement =
    milestone > 0 ? t("analysisV2.jobs.live.announceDepth", { move, depth: milestone }) : t("analysisV2.jobs.live.announce", { move });
  const number = (text: string) => <bdi dir="ltr">{text}</bdi>;

  const rows = [
    {
      id: "depth",
      label: t("analysisV2.jobs.live.depth"),
      value: number(live.seldepth === undefined ? String(live.depth) : `${live.depth}/${live.seldepth}`),
    },
    ...(live.nodes === undefined ? [] : [{ id: "nodes", label: t("analysisV2.jobs.live.nodes"), value: number(formatEngineCount(live.nodes)) }]),
    ...(live.nps === undefined
      ? []
      : [{ id: "nps", label: t("analysisV2.jobs.live.nps"), value: t("analysisV2.jobs.live.npsValue", { value: formatEngineCount(live.nps) }) }]),
    {
      id: "time",
      label: t("analysisV2.jobs.live.time"),
      value: t("jobs.facts.seconds", { count: Math.round(live.elapsedMs / 100) / 10 }),
    },
    ...(live.hashfull === undefined
      ? []
      : [{ id: "hash", label: t("analysisV2.jobs.live.hash"), value: t("analysisV2.jobs.live.hashValue", { value: Math.round(live.hashfull / 10) }) }]),
  ];

  return (
    <Box
      component="section"
      aria-label={t("analysisV2.jobs.live.title")}
      data-testid={testId}
      sx={{ display: "grid", gap: 1, p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}
    >
      <Typography variant="body2" data-testid={`${testId}-move`} sx={{ fontWeight: 600 }}>
        {t("analysisV2.jobs.live.searching")} {live.move === undefined ? move : <bdi dir="ltr">{move}</bdi>}
      </Typography>
      <Box role="status" data-testid={`${testId}-status`} sx={visuallyHidden}>
        {announcement}
      </Box>
      <KeyValueList rows={rows} ariaLabel={t("analysisV2.jobs.live.facts")} testId={`${testId}-facts`} />
      <Typography variant="body2" data-testid={`${testId}-line`} sx={{ overflowWrap: "anywhere" }}>
        <Box component="span" sx={{ color: "text.secondary" }}>
          {t("analysisV2.jobs.live.line")}
        </Box>{" "}
        {live.score === undefined ? (
          "–"
        ) : (
          <bdi dir="ltr">
            <Box component="span" sx={{ fontWeight: 600 }}>
              {formatScore(live.score)}
            </Box>
            {live.line.length > 0 && ` ${live.line.join(" ")}`}
          </bdi>
        )}
      </Typography>
    </Box>
  );
}

export default JobEngineProgress;
