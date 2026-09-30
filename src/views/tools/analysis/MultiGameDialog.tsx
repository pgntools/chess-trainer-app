import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CallMergeRoundedIcon from "@mui/icons-material/CallMergeRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import { useTranslation } from "react-i18next";

import { BaseDialog, ProgressDialog, useCancellableJob } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { addCollection } from "../../../lib/libraryCollectionStore";
import { collectionNameOfStem, readCollectionText } from "../../../lib/libraryCollections";
import { indexCollection } from "../../library/indexCollection";
import type { MultiGameChoice } from "./useAnalysisLoad";

/** What went wrong keeping the collection — `analysis.load.popup.problem.*`. */
type CollectionProblem = "unreadable" | "index" | "storage";

/**
 * **The popup a PGN of several games opens in the Analysis module** (CTA-101)
 * — the Analysis Board's Load tab and the analyses Lobby's form. Two choices,
 * and Cancel:
 *
 * - **Merge games** — `onMerge`: one tree onto the board, unsaved, with
 *   `[%games N]` at every branch (`mergeTrees`' counting). Off, saying why,
 *   while the games do not share a start position.
 * - **Save as games collection** — always offered. The popup keeps the text as
 *   a new Library collection itself, the way `/library/new` does: the same
 *   reading (`readCollectionText`), the same index pass (`indexCollection`,
 *   in a worker, a progress bar), then `addCollection` at the Library's top
 *   level, named by the same rule — the `Event` every game shares, else the
 *   file name's words, else "Pasted collection". `onSaved` takes the reader to
 *   its table.
 *
 * Since CTA-113 the design system's: the choice a `BaseDialog`, the job a
 * `ProgressDialog` in its place over `useCancellableJob` (the abort, the
 * progress and the write-lock the Library's import popup shares).
 *
 * Cancel, Escape, the backdrop or the popup going away stop the index pass and
 * write nothing. The one moment nothing can be stopped is the write itself,
 * so the popup does not close while it runs. A failed pass or write is said in
 * the popup.
 */
function MultiGameDialog({
  testIdPrefix,
  choice,
  onMerge,
  onClose,
  onSaved,
}: {
  /** The root of every test id — each host keeps its own. */
  testIdPrefix: string;
  choice: MultiGameChoice;
  onMerge: () => void;
  /** Cancelled: the index pass, if any, is already stopped. */
  onClose: () => void;
  /** The new collection's id. */
  onSaved: (collectionId: string) => void;
}) {
  const { t } = useTranslation();
  const { reading } = choice;
  const count = reading.games.length;
  const job = useCancellableJob();
  const [problem, setProblem] = useState<CollectionProblem | null>(null);

  const saveCollection = async () => {
    const collection = readCollectionText(choice.text);
    if (!collection.ok) {
      setProblem("unreadable");
      return;
    }
    const name =
      collection.name ?? (choice.fileStem === undefined ? t("library.upload.pastedName") : collectionNameOfStem(choice.fileStem));
    setProblem(null);
    const outcome = await job.run({
      // The index pass: stoppable, in a worker, reporting as it goes.
      work: (signal, report) => indexCollection(collection.games, (done, total) => report({ done, total }), signal),
      // The write: once begun, never cut short.
      write: (rows) => addCollection(name, collection.games, rows),
    });
    if (outcome.status === "cancelled") return;
    if (outcome.status === "failed") {
      setProblem("index");
      return;
    }
    if ("problem" in outcome.value) {
      setProblem("storage");
      return;
    }
    onSaved(outcome.value.collection.id);
  };

  const cancel = () => {
    if (job.cancel()) onClose();
  };

  // The job under way: a progress dialog in the choice's place, Cancel off while it writes.
  if (job.busy) {
    return (
      <ProgressDialog
        open
        title={t("analysis.load.popup.title", { count })}
        progress={job.progress ?? { done: 0, total: count }}
        caption={t("analysis.load.popup.indexing", { done: job.progress?.done ?? 0, total: job.progress?.total ?? count })}
        cancelLabel={t("analysis.load.popup.cancel")}
        onCancel={cancel}
        cancelDisabled={job.phase === "writing"}
        testId={testIdPrefix}
      >
        <Box data-testid={`${testIdPrefix}-indexing`}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("analysis.load.popup.collectionHelp")}
          </Typography>
        </Box>
      </ProgressDialog>
    );
  }

  return (
    <BaseDialog
      open
      onClose={cancel}
      title={t("analysis.load.popup.title", { count })}
      testId={testIdPrefix}
      actions={
        <Button onClick={cancel} data-testid={`${testIdPrefix}-cancel`}>
          {t("analysis.load.popup.cancel")}
        </Button>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("analysis.load.popup.explain")}
          </Typography>
          {reading.skipped > 0 && (
            <Typography variant="caption" data-testid={`${testIdPrefix}-skipped`} sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
              {t("analysis.load.popup.skipped", { count: reading.skipped })}
            </Typography>
          )}
        </Box>

        <Box>
          <Button
            variant="contained"
            startIcon={<CallMergeRoundedIcon />}
            disabled={!reading.mergeable}
            onClick={onMerge}
            aria-describedby={`${testIdPrefix}-merge-help`}
            data-testid={`${testIdPrefix}-merge`}
          >
            {t("analysis.load.popup.merge")}
          </Button>
          <Typography id={`${testIdPrefix}-merge-help`} variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
            {t(reading.mergeable ? "analysis.load.popup.mergeHelp" : "analysis.load.popup.mergeUnavailable")}
          </Typography>
        </Box>

        <Box>
          <Button
            variant="outlined"
            startIcon={<LibraryBooksRoundedIcon />}
            onClick={() => void saveCollection()}
            aria-describedby={`${testIdPrefix}-collection-help`}
            data-testid={`${testIdPrefix}-collection`}
          >
            {t("analysis.load.popup.collection")}
          </Button>
          <Typography id={`${testIdPrefix}-collection-help`} variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
            {t("analysis.load.popup.collectionHelp")}
          </Typography>
        </Box>

        {problem !== null && (
          <InlineAlert severity="error" testId={`${testIdPrefix}-problem`}>
            {t(`analysis.load.popup.problem.${problem}`)}
          </InlineAlert>
        )}
      </Box>
    </BaseDialog>
  );
}

export default MultiGameDialog;
