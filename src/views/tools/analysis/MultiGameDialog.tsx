import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CallMergeRoundedIcon from "@mui/icons-material/CallMergeRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import { useTranslation } from "react-i18next";

import { BaseDialog, FormDialog, ProgressDialog, useCancellableJob } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { DEFAULT_ANALYSIS_SETTINGS } from "../../../lib/analysisSettings";
import { addCollection } from "../../../lib/libraryCollectionStore";
import { collectionNameOfStem, readCollectionText } from "../../../lib/libraryCollections";
import { analysisGamesOfText, batchAnalysesOf, newSavedAnalysisId } from "../../../lib/savedAnalyses";
import {
  createAnalysisFolder,
  MAX_ANALYSIS_FOLDER_NAME,
  MAX_ANALYSIS_FOLDERS,
  removeAnalysisFolder,
} from "../../../lib/savedAnalysisFolderStore";
import { addAnalyses, MAX_SAVED_ANALYSES } from "../../../lib/savedAnalysisStore";
import { normaliseRepertoireText } from "../../../lib/savedRepertoires";
import { indexCollection } from "../../library/indexCollection";
import type { MultiGameChoice } from "./useAnalysisLoad";

/**
 * What went wrong — `analysis.load.popup.problem.*`: keeping the collection
 * (the check, `index`, told from the write, `write` / `storage` — CTA-141), or
 * keeping the analyses (`folder`, `tooMany`, `analysesStorage`).
 */
type Problem =
  | "unreadable"
  | "index"
  | "write"
  | "storage"
  | "folder"
  | "tooMany"
  | "analysesStorage";

/** The analyses step: the games that read, how many did not, the folder's name. */
type FolderStep = { games: { name: string; pgn: string }[]; skipped: number; name: string };

/**
 * **The popup a PGN of several games opens in the Analysis module** (CTA-101)
 * — the Analysis Board's Load tab and the analyses Lobby's form. Three choices,
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
 * - **Save to Saved analyses** (CTA-141) — always offered. The popup asks for
 *   a folder's name (the file name's words, else the `Event` a paste's games
 *   share, else "Analysed games"), then — the Library's Analyse, all or
 *   nothing — makes that folder at Saved analyses' top level and an analysis
 *   per game that reads, in file order, each PGN as the text holds it and
 *   named by its chapter (`analysisGamesOfText`); a game that is only a
 *   position is kept. A failed write takes the folder back. `onAnalysesSaved`
 *   takes the reader to the folder.
 *
 * Since CTA-113 the design system's: the choice a `BaseDialog`, the job a
 * `ProgressDialog` in its place over `useCancellableJob` (the abort, the
 * progress and the write-lock the Library's import popup shares).
 *
 * Cancel, Escape, the backdrop or the popup going away stop the index pass and
 * write nothing. The one moment nothing can be stopped is the write itself,
 * so the popup does not close while it runs. A failed pass or write is said in
 * the popup — which of the two it was — and its cause logged (`console.error`).
 */
function MultiGameDialog({
  testIdPrefix,
  choice,
  onMerge,
  onClose,
  onSaved,
  onAnalysesSaved,
}: {
  /** The root of every test id — each host keeps its own. */
  testIdPrefix: string;
  choice: MultiGameChoice;
  onMerge: () => void;
  /** Cancelled: the index pass, if any, is already stopped. */
  onClose: () => void;
  /** The new collection's id. */
  onSaved: (collectionId: string) => void;
  /** The new Saved analyses folder's id. */
  onAnalysesSaved: (folderId: string) => void;
}) {
  const { t } = useTranslation();
  const { reading } = choice;
  const count = reading.games.length;
  const job = useCancellableJob();
  const [problem, setProblem] = useState<Problem | null>(null);
  /** The analyses step, once chosen — `null` while the three choices show. */
  const [folder, setFolder] = useState<FolderStep | null>(null);
  const [savingAnalyses, setSavingAnalyses] = useState(false);

  const saveCollection = async () => {
    const collection = readCollectionText(choice.text);
    if (!collection.ok) {
      setProblem("unreadable");
      return;
    }
    const name =
      collection.name ?? (choice.fileStem === undefined ? t("library.upload.pastedName") : collectionNameOfStem(choice.fileStem));
    setProblem(null);
    let writing = false;
    const outcome = await job.run({
      // The index pass: stoppable, in a worker, reporting as it goes.
      work: (signal, report) => indexCollection(collection.games, (done, total) => report({ done, total }), signal),
      // The write: once begun, never cut short.
      write: (rows) => {
        writing = true;
        return addCollection(name, collection.games, rows);
      },
    });
    if (outcome.status === "cancelled") return;
    if (outcome.status === "failed") {
      console.error(`MultiGameDialog: the collection's ${writing ? "write" : "check"} failed.`, outcome.error);
      setProblem(writing ? "write" : "index");
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

  /** The analyses chosen: the games read once, the folder's name proposed. */
  const chooseAnalyses = () => {
    const shared = choice.fileStem === undefined ? readCollectionText(choice.text) : undefined;
    const proposed =
      choice.fileStem !== undefined
        ? collectionNameOfStem(choice.fileStem)
        : ((shared?.ok ? shared.name : undefined) ?? t("analysis.load.popup.folderDefault"));
    setProblem(null);
    setFolder({
      ...analysisGamesOfText(normaliseRepertoireText(choice.text)),
      name: proposed.slice(0, MAX_ANALYSIS_FOLDER_NAME),
    });
  };

  /** The folder, then every analysis in it — or nothing: a failed write takes the folder back. */
  const saveAnalyses = async (step: FolderStep) => {
    if (step.games.length === 0) return setProblem("unreadable");
    setProblem(null);
    setSavingAnalyses(true);
    try {
      const made = await createAnalysisFolder(step.name, null);
      if (made === undefined) return setProblem("folder");
      const failed = await addAnalyses(batchAnalysesOf(newSavedAnalysisId, step.games, made.id, DEFAULT_ANALYSIS_SETTINGS));
      if (failed !== undefined) {
        await removeAnalysisFolder(made.id);
        return setProblem(failed === "too-many" ? "tooMany" : "analysesStorage");
      }
      onAnalysesSaved(made.id);
    } finally {
      setSavingAnalyses(false);
    }
  };

  const problemAlert = (testId: string) =>
    problem !== null && (
      <InlineAlert severity="error" testId={testId}>
        {t(`analysis.load.popup.problem.${problem}`, {
          max: problem === "folder" ? MAX_ANALYSIS_FOLDERS : MAX_SAVED_ANALYSES,
        })}
      </InlineAlert>
    );

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

  // The analyses chosen: the folder's name in the choice's place, Back to the choices.
  if (folder !== null) {
    return (
      <FormDialog
        open
        onClose={() => {
          setProblem(null);
          setFolder(null);
        }}
        onSubmit={() => void saveAnalyses(folder)}
        title={t("analysis.load.popup.folderTitle")}
        submitLabel={t("analysis.load.popup.folderSave")}
        cancelLabel={t("analysis.load.popup.folderBack")}
        submitDisabled={folder.name.trim() === "" || folder.games.length === 0}
        busy={savingAnalyses}
        testId={`${testIdPrefix}-folder`}
      >
        <TextField
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's field takes the focus as the dialog opens, as WAI-ARIA's dialog pattern asks (ACCESSIBILITY.md)
          autoFocus
          fullWidth
          disabled={savingAnalyses}
          label={t("analysis.load.popup.folderName")}
          value={folder.name}
          onChange={(event) => setFolder({ ...folder, name: event.target.value })}
          slotProps={{
            htmlInput: { "data-testid": `${testIdPrefix}-folder-input`, maxLength: MAX_ANALYSIS_FOLDER_NAME, dir: "auto" },
          }}
        />
        <Box>
          <Typography variant="body2" data-testid={`${testIdPrefix}-folder-count`} sx={{ color: "text.secondary" }}>
            {t("analysis.load.popup.folderCount", { count: folder.games.length })}
          </Typography>
          {folder.skipped > 0 && (
            <Typography variant="body2" data-testid={`${testIdPrefix}-folder-skipped`} sx={{ color: "text.secondary" }}>
              {t("analysis.load.popup.folderSkipped", { count: folder.skipped })}
            </Typography>
          )}
        </Box>
        {problemAlert(`${testIdPrefix}-folder-problem`)}
      </FormDialog>
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

        <Box>
          <Button
            variant="outlined"
            startIcon={<CreateNewFolderRoundedIcon />}
            onClick={chooseAnalyses}
            aria-describedby={`${testIdPrefix}-analyses-help`}
            data-testid={`${testIdPrefix}-analyses`}
          >
            {t("analysis.load.popup.analyses")}
          </Button>
          <Typography id={`${testIdPrefix}-analyses-help`} variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
            {t("analysis.load.popup.analysesHelp")}
          </Typography>
        </Box>

        {problemAlert(`${testIdPrefix}-problem`)}
      </Box>
    </BaseDialog>
  );
}

export default MultiGameDialog;
