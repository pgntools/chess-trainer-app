import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { KeyValueList } from "../../../design-system/components/lists";
import { formatEngineCount, formatScore } from "../../../lib/engineAnalysis";
import type { EngineSessionLive } from "../../../lib/jobs/engineSession";
import { useEnginePulse } from "./enginePulse";

/** How many depths apart the screen reader hears the search again — never every update. */
const ANNOUNCE_EVERY_DEPTHS = 10;

/** `fixed` where given (the gallery, a test); else the time now, again every second. */
function useClock(fixed: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (fixed !== undefined) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [fixed]);
  return fixed ?? now;
}

/**
 * **What the engine is doing on a running job's position, live** (CTA-190) —
 * an engine job's page's live section, under its progress bar: the move
 * being searched, depth / selective depth, nodes and nodes per second
 * ("2.4M"), the time on this position, how full the hash is where the engine
 * says, and the best line so far with its score — every number from the
 * engine's own `info` lines (the engine session's live payload, `lib/jobs/engineSession.ts`), a few updates a second.
 *
 * **That the engine is alive** (CTA-194): deep in a search the engine says
 * nothing for minutes, its engine server sending a heartbeat instead — so a
 * mark beats once each time it is heard, a line or a heartbeat
 * (`useEnginePulse`, opacity only, still under reduced motion), and the words
 * beside it say how long ago ("Engine alive · heard 3 s ago"): a long quiet
 * stretch reads as working, not stuck.
 *
 * **Announced politely and sparingly**: its status region speaks when a new
 * position is searched and every {@link ANNOUNCE_EVERY_DEPTHS} depths — the
 * numbers themselves, the beat and the time since are not live.
 * Presentational: the snapshot is a prop; the screen shows it only while the
 * job runs.
 */
function JobEngineProgress({
  live,
  now,
  testId,
}: {
  live: EngineSessionLive;
  /** The time "heard … ago" is measured to (ms since the epoch) — absent, the time now, every second. */
  now?: number;
  /**
   * The root; the parts are `-move`, `-alive` (its mark `-pulse`), `-status` (the announcement), `-facts` (each
   * `-facts-<depth|nodes|nps|time|hash>`) and `-line`.
   */
  testId: string;
}) {
  const { t } = useTranslation();
  const clock = useClock(now);
  const pulse = useEnginePulse(live.heardAt);
  const since = Math.max(0, clock - live.heardAt);
  const heard =
    since < 1_000
      ? t("jobs.live.heardNow")
      : since < 60_000
        ? t("jobs.live.heardSeconds", { seconds: Math.floor(since / 1_000) })
        : t("jobs.live.heardMinutes", { minutes: Math.floor(since / 60_000) });
  const move = live.move ?? t("jobs.live.finalPosition");
  const milestone = Math.floor(live.depth / ANNOUNCE_EVERY_DEPTHS) * ANNOUNCE_EVERY_DEPTHS;
  const announcement =
    milestone > 0 ? t("jobs.live.announceDepth", { move, depth: milestone }) : t("jobs.live.announce", { move });
  const number = (text: string) => <bdi dir="ltr">{text}</bdi>;

  const rows = [
    {
      id: "depth",
      label: t("jobs.live.depth"),
      value: number(live.seldepth === undefined ? String(live.depth) : `${live.depth}/${live.seldepth}`),
    },
    ...(live.nodes === undefined ? [] : [{ id: "nodes", label: t("jobs.live.nodes"), value: number(formatEngineCount(live.nodes)) }]),
    ...(live.nps === undefined
      ? []
      : [{ id: "nps", label: t("jobs.live.nps"), value: t("jobs.live.npsValue", { value: formatEngineCount(live.nps) }) }]),
    {
      id: "time",
      label: t("jobs.live.time"),
      value: t("jobs.facts.seconds", { count: Math.round(live.elapsedMs / 100) / 10 }),
    },
    ...(live.hashfull === undefined
      ? []
      : [{ id: "hash", label: t("jobs.live.hash"), value: t("jobs.live.hashValue", { value: Math.round(live.hashfull / 10) }) }]),
  ];

  return (
    <Box
      component="section"
      aria-label={t("jobs.live.title")}
      data-testid={testId}
      sx={{ display: "grid", gap: 1, p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}
    >
      <Typography variant="body2" data-testid={`${testId}-move`} sx={{ fontWeight: 600 }}>
        {t("jobs.live.searching")} {live.move === undefined ? move : <bdi dir="ltr">{move}</bdi>}
      </Typography>
      <Box data-testid={`${testId}-alive`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
              component="span"
          aria-hidden="true"
          data-testid={`${testId}-pulse`}
          data-pulse={pulse.pulse}
          data-beating={pulse.beating}
          sx={{ flexShrink: 0, inlineSize: 8, blockSize: 8, borderRadius: "50%", bgcolor: "success.main", animation: pulse.animation }}
        />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("jobs.live.alive")} · {heard}
        </Typography>
      </Box>
      <Box role="status" data-testid={`${testId}-status`} sx={visuallyHidden}>
        {announcement}
      </Box>
      <KeyValueList rows={rows} ariaLabel={t("jobs.live.facts")} testId={`${testId}-facts`} />
      <Typography variant="body2" data-testid={`${testId}-line`} sx={{ overflowWrap: "anywhere" }}>
        <Box component="span" sx={{ color: "text.secondary" }}>
          {t("jobs.live.line")}
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
