import { createElement, useCallback, useState, type ReactNode } from "react";
import type { EntityRef } from "@pgntools/jobs-runtime";

import NewJobHost, { type NewJobRequest } from "./NewJobHost";

/**
 * **New job, for an entity** (CTA-221) — the one way a job is started: the
 * kinds whose `appliesTo` holds the entity's type (`runtime.kindsFor`), each
 * named and described in the reader's language, then the chosen kind's form
 * (its `NewJob` view, `kindViews.ts`), which queues it. Start's job queued,
 * the dialog closes and a snackbar's **Open job** leads to `/jobs/<id>`.
 *
 * `open(subjects, context?)` — one entity or several (the collections
 * picked), and what the screen knows that the store does not (a Case's tree
 * as its board holds it). Render `dialog` once.
 */
export const useNewJob = (testId: string): { open: (subjects: EntityRef | readonly EntityRef[], context?: unknown) => void; dialog: ReactNode } => {
  const [request, setRequest] = useState<NewJobRequest | null>(null);
  const open = useCallback(
    (subjects: EntityRef | readonly EntityRef[], context?: unknown) =>
      setRequest({ subjects: Array.isArray(subjects) ? subjects : [subjects as EntityRef], context }),
    [],
  );
  const close = useCallback(() => setRequest(null), []);
  return { open, dialog: createElement(NewJobHost, { request, onClose: close, testId }) };
};
