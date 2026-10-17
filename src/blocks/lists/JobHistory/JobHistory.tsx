import { useId, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { useTranslation } from "react-i18next";

import { JobStamp } from "../../tables";

/** How an attempt ended — the runtime's `JobAttempt.outcome`. */
export type JobAttemptOutcome = "done" | "failed" | "retry-scheduled" | "paused" | "cancelled" | "interrupted";

/** One attempt at a job — the runtime's `JobAttempt`. */
export type JobAttemptView = {
  n: number;
  startedAt: string;
  endedAt?: string;
  /** Absent while it is under way. */
  outcome?: JobAttemptOutcome;
  error?: { code: string; message?: string };
};

/** One event of a job's history — the runtime's `JobEvent`. */
export type JobEventView = { at: string; type: string; data?: unknown };

export type JobHistoryProps = {
  attempts: readonly JobAttemptView[];
  events: readonly JobEventView[];
  /** An event in words ("Paused by the reader", "Checkpoint 12 of 80") — the screen's, from its type and data. */
  describe: (event: JobEventView) => string;
  /** Open on mount. Default closed: the history is the audit log, read when wanted. */
  defaultOpen?: boolean;
  /** The heading's level — `3` under a job's own page's `h2`s (the default), `2` beside them. */
  headingLevel?: 2 | 3;
  /**
   * The root; the toggle is `-toggle`, the attempts `-attempts` (each
   * `-attempt-<n>`), the events `-events` (each `-event-<index>`, newest
   * first).
   */
  testId: string;
};

/**
 * **A job's history** (CTA-217) — its **attempts** (each numbered, when it
 * started and ended, how it ended — or under way — and the error that ended
 * it) and its **events** (a timeline: when, and what, in words through
 * `describe`), both **newest first**, under one heading whose button opens
 * and closes it (a disclosure, `aria-expanded`). Closed by default.
 *
 * Presentational: the attempts, events and their words are props. Its words
 * are `jobs.history.*`.
 */
function JobHistory({ attempts, events, describe, defaultOpen = false, headingLevel = 3, testId }: JobHistoryProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();
  const id = (part: string) => `${testId}-${part}`;
  const sub = headingLevel === 2 ? "h3" : "h4";

  const newestAttempts = useMemo(() => [...attempts].sort((a, b) => b.n - a.n), [attempts]);
  // Newest first; events at the same time keep the order they were written in, last first.
  const newestEvents = useMemo(
    () =>
      events
        .map((event, index) => ({ event, index }))
        .sort((a, b) => (a.event.at === b.event.at ? b.index - a.index : a.event.at < b.event.at ? 1 : -1))
        .map(({ event }) => event),
    [events],
  );

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1 }}>
      <Typography variant="subtitle2" component={headingLevel === 2 ? "h2" : "h3"} sx={{ fontWeight: 700 }}>
        <Button
          size="small"
          color="inherit"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-controls={regionId}
          endIcon={
            <ExpandMoreRoundedIcon
              sx={(theme) => ({
                transform: open ? "rotate(180deg)" : "none",
                transition: theme.transitions.create("transform", { duration: theme.transitions.duration.shortest }),
              })}
            />
          }
          data-testid={id("toggle")}
          sx={{ fontWeight: 700, textTransform: "none", px: 0.5 }}
        >
          {t("jobs.history.title")}
        </Button>
      </Typography>

      <Box id={regionId} hidden={!open} sx={{ display: open ? "grid" : "none", gap: 2 }}>
        {open && (
          <>
            <Box sx={{ display: "grid", gap: 0.5 }}>
              <Typography variant="body2" component={sub} sx={{ fontWeight: 600 }}>
                {t("jobs.history.attempts")}
              </Typography>
              {newestAttempts.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }} data-testid={id("attempts")}>
                  {t("jobs.history.noAttempts")}
                </Typography>
              ) : (
                <Box component="ol" aria-label={t("jobs.history.attempts")} data-testid={id("attempts")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1 }}>
                  {newestAttempts.map((attempt) => (
                    <Box component="li" key={attempt.n} data-testid={id(`attempt-${attempt.n}`)} sx={{ display: "grid", gap: 0.25 }}>
                      <Typography variant="body2">
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {t("jobs.history.attempt", { n: attempt.n })}
                        </Box>
                        {" · "}
                        {attempt.outcome === undefined ? t("jobs.history.underWay") : t(`jobs.history.outcome.${attempt.outcome}`)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        <JobStamp value={attempt.startedAt} />
                        {attempt.endedAt !== undefined && (
                          <>
                            {" – "}
                            <JobStamp value={attempt.endedAt} />
                          </>
                        )}
                      </Typography>
                      {attempt.error !== undefined && (
                        <Typography variant="caption" sx={{ color: "error.main" }}>
                          <bdi dir="ltr">{attempt.error.code}</bdi>
                          {attempt.error.message !== undefined && (
                            <>
                              {" — "}
                              <bdi dir="auto">{attempt.error.message}</bdi>
                            </>
                          )}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ display: "grid", gap: 0.5 }}>
              <Typography variant="body2" component={sub} sx={{ fontWeight: 600 }}>
                {t("jobs.history.events")}
              </Typography>
              {newestEvents.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }} data-testid={id("events")}>
                  {t("jobs.history.noEvents")}
                </Typography>
              ) : (
                <Box component="ol" aria-label={t("jobs.history.events")} data-testid={id("events")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
                  {newestEvents.map((event, index) => (
                    <Box
                      component="li"
                      key={`${event.at}-${index}`}
                      data-testid={id(`event-${index}`)}
                      sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, alignItems: "baseline" }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                        <JobStamp value={event.at} />
                      </Typography>
                      <Typography variant="body2" dir="auto">
                        {describe(event)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

export default JobHistory;
