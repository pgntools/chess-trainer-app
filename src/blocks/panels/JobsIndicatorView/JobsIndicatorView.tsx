import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { IconAction } from "../../../design-system/components/toolbars";
import { jobPercent, type JobProgressView } from "../../tables";
import { useEnginePulse } from "../JobEngineProgress/enginePulse";

export type JobsIndicatorViewProps = {
  /** The job running now — its title and progress. Absent, none runs. */
  running?: { title: string; progress: JobProgressView };
  /** How many wait in the queue. */
  queuedCount: number;
  /** The Jobs screen (`/jobs`). */
  link: LinkTarget;
  /** An icon alone (under the breakpoint), named in full. */
  compact: boolean;
  /**
   * When the running job's engine was last heard (an `info` line, an engine
   * server's heartbeat — CTA-190, CTA-194): the spinner beats once each time
   * it moves on. Absent, no beat (a kind with no engine).
   */
  heardAt?: number;
  /** The live numbers, joined to its name out of sight ("depth 22, 3.1M nodes") — never announced. */
  liveWords?: string;
  /** What the status region says — a change of status (`useJobStatusAnnouncement`). */
  announcement: string;
  /** The link; the status region `-status`, the spinner `-heartbeat`. */
  testId: string;
};

/**
 * **The header's Jobs indicator** (CTA-217, generalised from Jobs V2's,
 * CTA-173, CTA-188) — while a job runs, a link to the Jobs screen with its
 * progress ("Jobs 12/80", the job's title after it out of sight), or the
 * count queued; an icon alone when `compact`, named in full; nothing while
 * none runs or waits. **Its status region says what `announcement` says** —
 * a change of status, never the progress.
 *
 * **While the engine is heard** (`heardAt`), its spinner beats once each
 * time (`useEnginePulse`: an opacity beat on the theme's durations, still
 * under reduced motion), and the live words join its name.
 *
 * Presentational: what runs, the queue, the link and the words to announce
 * are props. Its words are `jobs.indicator.*`.
 */
function JobsIndicatorView({ running, queuedCount, link, compact, heardAt, liveWords, announcement, testId }: JobsIndicatorViewProps) {
  const { t } = useTranslation();
  const pulse = useEnginePulse(heardAt);
  const extra = liveWords === undefined || liveWords === "" ? "" : `, ${liveWords}`;
  const progress = running?.progress;
  const label =
    running !== undefined
      ? `${t("jobs.indicator.label", { name: running.title, done: running.progress.done, total: running.progress.total })}${extra}`
      : t("jobs.indicator.labelQueued", { count: queuedCount });
  const shown =
    progress !== undefined
      ? t("jobs.indicator.running", { done: progress.done, total: progress.total })
      : t("jobs.indicator.queued", { count: queuedCount });
  const spinner = (
    <Box
      component="span"
      aria-hidden="true"
      data-testid={`${testId}-heartbeat`}
      data-live={heardAt !== undefined}
      data-beating={pulse.beating}
      data-pulse={pulse.pulse}
      // Under reduced motion the theme's durations are 0: no animation, the spinner stays still.
      sx={{ display: "inline-flex", animation: pulse.animation }}
    >
      <CircularProgress
        size={14}
        variant={running === undefined ? "indeterminate" : "determinate"}
        value={running === undefined ? undefined : jobPercent("running", running.progress)}
      />
    </Box>
  );

  return (
    <>
      <Box role="status" data-testid={`${testId}-status`} sx={visuallyHidden}>
        {announcement}
      </Box>
      {(running !== undefined || queuedCount > 0) &&
        (compact ? (
          <IconAction label={label} link={link} testId={testId}>
            {spinner}
          </IconAction>
        ) : (
          <Button
            {...(linkProps(link) as Record<string, unknown>)}
            size="small"
            variant="text"
            startIcon={spinner}
            data-testid={testId}
            sx={{ whiteSpace: "nowrap" }}
          >
            {shown}
            {running !== undefined && (
              <Box component="span" sx={visuallyHidden}>
                {`, ${running.title}${extra}`}
              </Box>
            )}
          </Button>
        ))}
    </>
  );
}

export default JobsIndicatorView;
