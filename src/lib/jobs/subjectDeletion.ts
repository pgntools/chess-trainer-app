import type { EntityRef } from "@pgntools/jobs-runtime";

/**
 * **An entity deleted, its unfinished jobs with it** (CTA-221, the Jobs
 * module's one deletion rule — `.claude/rules/jobs.md`): a Case, a Project, a
 * repertoire or a Library collection deleted removes every job not yet
 * finished whose subjects name it, a running one aborted first
 * (`runtime.removeUnfinishedOf`). Finished jobs are kept: their outputs stand
 * on their own, and a deleted subject reads as "deleted".
 *
 * The stores call {@link removeUnfinishedJobsOf}; the page's runtime
 * (`lib/jobs/runtime.ts`) registers itself here when it is made. So no store
 * imports the runtime — whose kinds import the stores — and a delete made
 * before the runtime exists is held until it registers.
 */

type Remover = (subjects: readonly EntityRef[]) => Promise<void>;

let remover: Remover | undefined;
let pending: EntityRef[] = [];

/** **The runtime's hook** — `undefined` unregisters it (a test's teardown). A delete held until now is made at once. */
export const registerSubjectRemover = (next: Remover | undefined): Promise<void> => {
  remover = next;
  if (next === undefined || pending.length === 0) return Promise.resolve();
  const held = pending;
  pending = [];
  return next(held).catch(() => undefined);
};

/**
 * **The deletion rule**: every unfinished job of these entities removed — a
 * running one aborted. Never rejects: a store's delete has already happened.
 */
export const removeUnfinishedJobsOf = async (subjects: readonly EntityRef[]): Promise<void> => {
  if (subjects.length === 0) return;
  if (remover === undefined) {
    pending.push(...subjects);
    return;
  }
  await remover(subjects).catch(() => undefined);
};
