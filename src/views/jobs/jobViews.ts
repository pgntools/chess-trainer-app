import type { TFunction } from "i18next";
import { Link as RouterLink } from "react-router";
import type { EntityRef, JobOutput, JobRecord } from "@pgntools/jobs-runtime";

import type { JobAttemptView, JobEventView, JobOutputView } from "../../blocks/lists";
import type { JobDetailsView } from "../../blocks/panels";
import type { JobRowView, JobSubjectView } from "../../blocks/tables";
import type { LinkTarget } from "../../design-system/components/link";
import type { JobContinuation } from "../../lib/jobs/engineJobSettings";
import { jobEntityOf } from "../../lib/jobs/entities";
import { isRegisteredJobKind, jobKindLocaleKey, RETIRED_JOB_KIND_LOCALE_KEYS } from "../../lib/jobs/kinds";

/*
  **A job record, as the Jobs blocks read it** (CTA-221) — the runtime's
  `JobRecord` mapped onto the generic blocks' view models (CTA-217's
  `JobRowView`, `JobDetailsView`, `JobOutputView`, `JobAttemptView`): the
  title, the kind's name, the subjects through the entity registry (a deleted
  one said so), what may be done to it, why it failed or waits, its outputs
  (applied, and still in the outbox) and its history.
*/

/** A link to an app path. */
export const linkTo = (to: string): LinkTarget => ({ component: RouterLink, to });

/**
 * A kind's name in the reader's language — a retired kind's under its old
 * name, said to be retired (CTA-232), any other kind no longer registered
 * said to be unknown.
 */
export const kindLabelOf = (t: TFunction, kindId: string): string => {
  const key = jobKindLocaleKey(kindId);
  if (key !== undefined) return t(`jobs.kinds.${key}.name`);
  const retired = Object.hasOwn(RETIRED_JOB_KIND_LOCALE_KEYS, kindId) ? RETIRED_JOB_KIND_LOCALE_KEYS[kindId] : undefined;
  return retired === undefined ? t("jobs.kinds.unknown", { id: kindId }) : t(`jobs.retiredKinds.${retired}`);
};

/**
 * **The "Continues" row** of a job queued by *Continue with current
 * settings* (CTA-236): the job it continues — removed since, so named, not
 * linked — when it was asked for, and how many positions it carried over.
 * None for a job started from its form.
 */
export const continuesRowsOf = (
  t: TFunction,
  language: string,
  continues: JobContinuation | undefined,
  carried: number,
): { id: string; label: string; value: string }[] => {
  if (continues === undefined) return [];
  const at = Date.parse(continues.createdAt);
  const date = Number.isNaN(at) ? "–" : new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(at);
  return [
    {
      id: "continues",
      label: t("jobs.facts.continues"),
      value: t("jobs.facts.continuesValue", { title: continues.title.trim() || t("jobs.untitled"), date, count: carried }),
    },
  ];
};

/** A job's title — "Untitled" for none. */
export const jobTitleOf = (t: TFunction, job: Pick<JobRecord, "title">): string => job.title.trim() || t("jobs.untitled");

/** One subject: its name now (else its type's word), its link while it is there, "deleted" once it is not. */
const subjectViewOf = (t: TFunction, ref: EntityRef): JobSubjectView => {
  const entity = jobEntityOf(ref.type);
  const label = entity?.label(ref.id) ?? t(`jobs.entities.${ref.type}`, { defaultValue: ref.type });
  const exists = entity?.exists(ref.id);
  const link = exists === true ? entity?.link(ref.id) : undefined;
  return { label, ...(link === undefined ? {} : { link: linkTo(link) }), ...(exists === false ? { deleted: true } : {}) };
};

/**
 * The runtime's state machine: Pause from queued or running (no request
 * pending), Resume from paused, interrupted or failed. A job of a kind no
 * longer registered (a retired kind's, CTA-232) is never run and the
 * runtime refuses every command but Delete, so none is offered.
 */
const canPause = (job: JobRecord) => isRegisteredJobKind(job.kind) && (job.status === "queued" || job.status === "running") && job.control === undefined;
const canResume = (job: JobRecord) => isRegisteredJobKind(job.kind) && (job.status === "paused" || job.status === "interrupted" || job.status === "failed");
const canCancel = (job: JobRecord) =>
  isRegisteredJobKind(job.kind) &&
  (job.status === "queued" || job.status === "running" || job.status === "paused" || job.status === "interrupted" || job.status === "failed") &&
  job.control !== "cancel";

/** **A job as a queue row.** */
export const jobRowOf = (t: TFunction, job: JobRecord): JobRowView => ({
  id: job.id,
  title: jobTitleOf(t, job),
  kindLabel: kindLabelOf(t, job.kind),
  status: job.status,
  progress: { done: job.progress.done, total: job.progress.total, ...(job.progress.label === undefined ? {} : { label: job.progress.label }) },
  subjects: job.subjects.map((ref) => subjectViewOf(t, ref)),
  createdAt: job.createdAt,
  canPause: canPause(job),
  canResume: canResume(job),
  canCancel: canCancel(job),
});

/** A job's error in the reader's words — its kind's, where it has them, else the runtime's message. */
const errorTextOf = (t: TFunction, job: Pick<JobRecord, "kind" | "error">): string | undefined => {
  if (job.error === undefined) return undefined;
  const key = jobKindLocaleKey(job.kind);
  const fallback = job.error.code === "timeout" ? t("jobs.errors.timeout") : (job.error.message ?? t("jobs.details.failedUnknown"));
  return key === undefined ? fallback : t(`jobs.kinds.${key}.errors.${job.error.code}`, { defaultValue: fallback });
};

/** **A job, whole** — its row, its times, a scheduled retry's countdown, why it failed. */
export const jobDetailsOf = (t: TFunction, job: JobRecord, now: number): JobDetailsView => {
  const runAfter = job.runAfter === undefined ? undefined : Date.parse(job.runAfter);
  const retrying = job.status === "queued" && runAfter !== undefined && !Number.isNaN(runAfter) && job.attempts.length > 0;
  const message = errorTextOf(t, job);
  return {
    ...jobRowOf(t, job),
    ...(job.startedAt === undefined ? {} : { startedAt: job.startedAt }),
    ...(job.finishedAt === undefined ? {} : { finishedAt: job.finishedAt }),
    ...(retrying
      ? { retry: { inSeconds: Math.max(0, (runAfter - now) / 1_000), attempt: job.attempts.length + 1, maxAttempts: job.maxAttempts } }
      : {}),
    ...(job.error === undefined || job.status !== "failed" ? {} : { error: { code: job.error.code, ...(message === undefined ? {} : { message }) } }),
  };
};

/** An applied entity output's view: its link while it is there. */
const entityOutputOf = (t: TFunction, output: Extract<JobOutput, { kind: "entity" }>): JobOutputView => {
  const subject = subjectViewOf(t, output.ref);
  const label = jobEntityOf(output.ref.type)?.label(output.ref.id) ?? output.label;
  return { key: output.key, kind: "entity", label, ...(subject.link === undefined ? {} : { link: subject.link }), ...(subject.deleted ? { deleted: true } : {}) };
};

/** The data outputs' names — `jobs.outputs.data.<key>`, else "Report". */
const dataLabelOf = (t: TFunction, key: string): string => t(`jobs.outputs.data.${key}`, { defaultValue: t("jobs.outputs.kinds.data") });

/**
 * **A job's outputs** — the applied ones, then the outbox's (decided, not yet
 * applied), each pending. A pending plan is read generically: an `artifact`
 * by its name, a `data` by its key, anything else as what it makes.
 */
export const outputViewsOf = (t: TFunction, job: JobRecord): JobOutputView[] => {
  const applied = job.outputs.map((output): JobOutputView => {
    if (output.kind === "entity") return entityOutputOf(t, output);
    if (output.kind === "artifact") return { key: output.key, kind: "artifact", name: output.name, mimeType: output.mimeType, size: output.size };
    return { key: output.key, kind: "data", label: dataLabelOf(t, output.key) };
  });
  const done = new Set(job.outputs.map((output) => output.key));
  const pending = job.pendingOutputs
    .filter((plan) => !done.has(plan.key))
    .map((plan): JobOutputView => {
      if (plan.kind === "artifact") {
        return { key: plan.key, kind: "artifact", name: typeof plan.name === "string" ? plan.name : plan.key, mimeType: String(plan.mimeType ?? ""), pending: true };
      }
      if (plan.kind === "data") return { key: plan.key, kind: "data", label: dataLabelOf(t, plan.key), pending: true };
      return { key: plan.key, kind: "entity", label: typeof plan.name === "string" ? plan.name : plan.key, pending: true };
    });
  return [...applied, ...pending];
};

/** The attempts, as the history block reads them. */
export const attemptViewsOf = (t: TFunction, job: JobRecord): JobAttemptView[] =>
  job.attempts.map((attempt) => ({
    n: attempt.n,
    startedAt: attempt.startedAt,
    ...(attempt.endedAt === undefined ? {} : { endedAt: attempt.endedAt }),
    ...(attempt.outcome === undefined ? {} : { outcome: attempt.outcome }),
    ...(attempt.error === undefined
      ? {}
      : { error: { code: attempt.error.code, message: errorTextOf(t, { kind: job.kind, error: attempt.error }) ?? attempt.error.message } }),
  }));

/** An event in words — `jobs.history.eventTypes.<type>`, its data's counts filled in; an unknown type as it is. */
export const describeEvent = (t: TFunction, event: JobEventView): string => {
  const data = typeof event.data === "object" && event.data !== null ? (event.data as Record<string, unknown>) : {};
  return t(`jobs.history.eventTypes.${event.type}`, { ...data, defaultValue: event.type });
};

/** Whether a job's subjects name this entity. */
export const isJobOf = (job: Pick<JobRecord, "subjects">, ref: EntityRef): boolean =>
  job.subjects.some((subject) => subject.type === ref.type && subject.id === ref.id);

/** Newest first — the runtime lists in its own order. */
export const newestFirst = (jobs: readonly JobRecord[]): JobRecord[] => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
