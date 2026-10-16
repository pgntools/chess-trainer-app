import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { ProjectCaseLimitDialog } from "../../blocks/dialogs";
import { ProgressDialog, useCancellableJob } from "../../design-system/components/dialogs";
import { passesProjectCaseLimit } from "../../lib/analysisProjects";
import { addCollection } from "../../lib/libraryCollectionStore";
import { MAX_COLLECTION_NAME_CHARS } from "../../lib/libraryCollections";
import { indexCollection } from "../library/indexCollection";

/** An interactive add of Cases, checked against its Project's limit. */
export type CaseLimitRequest = {
  /** The Cases the Project holds already — `0` for a Project made for these games. */
  existing: number;
  /** The Cases the add would make. */
  count: number;
  /** The collection's name, where the reader takes one instead. */
  collectionName: string;
  /** The games as PGN, one each — read only when the collection is chosen. */
  games: () => readonly string[];
  /** The games come out of the Library (its picks): the dialog says so. */
  inLibrary?: boolean;
  /** Under the limit, or **Create anyway**: the add goes on, as the caller writes it. */
  proceed: () => void;
  /** The collection was made instead — close what the add was asked from; the collection opens next. */
  onCollection?: () => void;
};

/**
 * **A Project's soft limit of Cases, asked about** (CTA-225) — what New
 * project, New case and Send to Analysis call before any work: `check(request)`
 * goes straight on (`proceed`) while the add keeps the Project at or under
 * `MAX_CASES_PER_PROJECT`; past it the `ProjectCaseLimitDialog` opens, and
 *
 * - **Create a Library collection instead** indexes the same games as the
 *   Library's import does (`indexCollection`, a `ProgressDialog` over the
 *   dialog, Cancel on until the write), keeps them as one collection at the
 *   Library's top level (`addCollection`) and opens it — no Case made; a
 *   refusal is said in the dialog;
 * - **Create anyway** calls `proceed` — the store never refuses for the count;
 * - Cancel makes nothing.
 *
 * Render `dialog` once in the screen. `testId` prefixes the dialog's ids
 * (`<testId>`, `<testId>-progress`).
 */
export const useProjectCaseLimit = (testId: string): { check: (request: CaseLimitRequest) => void; dialog: ReactNode } => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const job = useCancellableJob();
  const [pending, setPending] = useState<CaseLimitRequest | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const check = (request: CaseLimitRequest) => {
    if (!passesProjectCaseLimit(request.existing, request.count)) {
      request.proceed();
      return;
    }
    setProblem(null);
    setPending(request);
  };

  const makeCollection = async (request: CaseLimitRequest) => {
    setProblem(null);
    const games = request.games();
    const outcome = await job.run({
      work: (signal, report) => indexCollection(games, (done, total) => report({ done, total }), signal),
      write: async (rows) => {
        const made = await addCollection(request.collectionName.trim().slice(0, MAX_COLLECTION_NAME_CHARS), games, rows);
        return "problem" in made ? undefined : made.collection.id;
      },
    });
    if (outcome.status === "cancelled") return;
    if (outcome.status === "failed") {
      console.error("useProjectCaseLimit: the games could not be indexed for a collection.", outcome.error);
      setProblem(t("analysisV2.caseLimit.problem.index"));
      return;
    }
    if (outcome.value === undefined) {
      setProblem(t("analysisV2.caseLimit.problem.storage"));
      return;
    }
    setPending(null);
    request.onCollection?.();
    navigate(`/library/${encodeURIComponent(outcome.value)}`);
  };

  const number = (value: number) => value.toLocaleString(i18n.language);
  const dialog = (
    <>
      <ProjectCaseLimitDialog
        open={pending !== null}
        count={pending?.count ?? 0}
        existing={pending?.existing ?? 0}
        inLibrary={pending?.inLibrary}
        busy={job.busy}
        error={problem ?? undefined}
        onCollection={() => {
          if (pending !== null) void makeCollection(pending);
        }}
        onCreateAnyway={() => {
          if (pending === null) return;
          setPending(null);
          pending.proceed();
        }}
        onClose={() => setPending(null)}
        testId={testId}
      />
      {/* The collection's index pass, over the dialog it came from. */}
      <ProgressDialog
        open={job.busy}
        title={t("analysisV2.caseLimit.progress.title")}
        progress={job.phase === "writing" ? null : job.progress}
        caption={
          job.phase === "writing"
            ? t("analysisV2.caseLimit.progress.save")
            : t("analysisV2.caseLimit.progress.index", {
                done: number(job.progress?.done ?? 0),
                total: number(job.progress?.total ?? 0),
              })
        }
        cancelLabel={t("analysisV2.cancel")}
        onCancel={() => void job.cancel()}
        cancelDisabled={job.phase === "writing"}
        testId={`${testId}-progress`}
      />
    </>
  );

  return { check, dialog };
};
