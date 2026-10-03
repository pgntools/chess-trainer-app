import { useState } from "react";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { CollectionImportDialog } from "../../blocks/dialogs";
import { ProgressDialog, useCancellableJob } from "../../design-system/components/dialogs";
import type { IndexedRow } from "../../lib/collectionIndex";
import { addCollection, appendCollectionGames, removeCollection } from "../../lib/libraryCollectionStore";
import { createLibraryFolder, removeLibraryFolder } from "../../lib/libraryFolderStore";
import {
  collectionNameOfStem,
  eventGroupsOf,
  MAX_COLLECTION_NAME_CHARS,
  sharedEventOf,
  type CollectionImportFile,
  type CollectionImportSource,
  type CollectionRow,
  type CollectionSummary,
} from "../../lib/libraryCollections";
import { indexCollection } from "./indexCollection";

/** A file's kept games, ready to write. */
type Batch = { file: CollectionImportFile; rows: CollectionRow[]; games: string[] };

/**
 * **The import-options popup's job** (CTA-103; on the design system since
 * CTA-113) — what `/library/new` opens once a picked `.pgn` or `.zip`, a
 * paste, or *Add games* (`?into=`) has been read. The choice is the
 * `CollectionImportDialog` block (what came in, the filters, the count,
 * *Split by event*); this is the rest:
 *
 * - **Import** indexes the kept games only (`indexCollection`, one pass over
 *   every file, in a worker), shown by a `ProgressDialog` in the choice's
 *   place over `useCancellableJob` — the abort, the progress and the
 *   write-lock `MultiGameDialog` shares — then writes: `?into=` appends every
 *   file's games to that collection in one write; otherwise **one collection
 *   per file** holding any game, filed in `folderId` — a single text named as
 *   typed, else the `Event` its games share, else its file name's words, else
 *   "Pasted collection"; several files by their `Event`, else their names.
 *   **Split by event** (CTA-127) puts each file's games in **one folder per
 *   file** instead, named the same way, holding one collection per event
 *   (the games with no `Event` in one "Unknown" collection, each name within
 *   the collection-name cap) — a folder the picker already offered files them
 *   all. A failed write takes back the collections **and the folders** it had
 *   already added, so it is all or nothing, and the choice comes back saying
 *   why.
 *
 * Cancel, Escape, the backdrop or the popup going away stop the index pass
 * and write nothing. The one moment nothing can be stopped is the write
 * itself, so the popup does not close while it runs.
 */
function ImportOptionsDialog({
  source,
  into,
  typedName,
  folderId,
  onClose,
  onDone,
}: {
  source: CollectionImportSource;
  /** Add games: every kept game goes to the end of this collection. */
  into?: CollectionSummary;
  /** The name field's text — a single text's collection name when not blank. */
  typedName: string;
  folderId: string | null;
  /** Cancelled: the index pass, if any, is already stopped. */
  onClose: () => void;
  /** Kept: where the reader goes now. */
  onDone: (path: string) => void;
}) {
  const { t } = useTranslation();
  const job = useCancellableJob();
  /** What went wrong — a `library.upload.problem.*` key's last part. */
  const [problem, setProblem] = useState<string | null>(null);

  const nameOf = (file: CollectionImportFile, rows: readonly CollectionRow[]): string =>
    (source.files.length === 1 ? typedName.trim() : "") ||
    sharedEventOf(rows) ||
    (file.stem === undefined ? t("library.upload.pastedName") : collectionNameOfStem(file.stem));

  /** The kept games' write: one append, or a collection per file — all or nothing. */
  const write = async (
    batches: Batch[],
    indexed: IndexedRow[],
    splitByEvent: boolean,
  ): Promise<{ path: string } | { problem: string }> => {
    if (into !== undefined) {
      const failed = await appendCollectionGames(
        into.id,
        batches.flatMap((batch) => batch.games),
        indexed,
      );
      return failed === undefined ? { path: `/library/${encodeURIComponent(into.id)}` } : { problem: failed };
    }
    const added: string[] = [];
    /** The folders a split import had already made — a failed write takes these back too. */
    const addedFolders: string[] = [];
    const undo = async () => {
      // All or nothing: what this import had already made goes again —
      // collections first, then their folders (deleting a folder keeps
      // its contents, so the order matters).
      for (const id of added) await removeCollection(id);
      for (const id of addedFolders) await removeLibraryFolder(id);
    };
    let offset = 0;
    for (const batch of batches) {
      const rows = indexed.slice(offset, offset + batch.games.length);
      offset += batch.games.length;
      if (!splitByEvent) {
        const result = await addCollection(nameOf(batch.file, batch.rows), batch.games, rows, undefined, undefined, folderId);
        if ("problem" in result) {
          await undo();
          return { problem: result.problem };
        }
        added.push(result.collection.id);
        continue;
      }
      // The split: one folder per file, one collection per event inside it.
      const folder = await createLibraryFolder(nameOf(batch.file, batch.rows), folderId);
      if (folder === undefined) {
        await undo();
        return { problem: "folder" };
      }
      addedFolders.push(folder.id);
      // The file's kept games by event — each group's games in file order,
      // its rows the same games' slice of the one index pass.
      for (const group of eventGroupsOf(
        batch.rows.map((row, index) => ({ event: row.event, row, indexed: rows[index] as IndexedRow })),
      )) {
        const groupGames = group.rows.map(({ row }) => batch.file.games[row.number - 1] as string);
        const result = await addCollection(
          (group.event === undefined ? t("library.upload.unknown") : group.event).slice(0, MAX_COLLECTION_NAME_CHARS),
          groupGames,
          group.rows.map((entry) => entry.indexed),
          undefined,
          undefined,
          folder.id,
        );
        if ("problem" in result) {
          await undo();
          return { problem: result.problem };
        }
        added.push(result.collection.id);
      }
    }
    return { path: added.length === 1 ? `/library/${encodeURIComponent(added[0] as string)}` : "/library" };
  };

  const confirm = async (kept: CollectionRow[][], splitByEvent: boolean) => {
    // Each file's kept games, in file order; a file that keeps none makes nothing.
    const batches = source.files
      .map((file, index): Batch => {
        const rows = kept[index] ?? [];
        return { file, rows, games: rows.map((row) => file.games[row.number - 1] as string) };
      })
      .filter((batch) => batch.games.length > 0);
    const games = batches.flatMap((batch) => batch.games);
    if (games.length === 0) return;
    setProblem(null);
    const outcome = await job.run({
      // The index pass: stoppable, in a worker, reporting as it goes.
      work: (signal, report) => indexCollection(games, (done, total) => report({ done, total }), signal),
      // The write: once begun, never cut short.
      write: (indexed) => write(batches, indexed, into === undefined && splitByEvent),
    });
    if (outcome.status === "cancelled") return;
    if (outcome.status === "failed") {
      setProblem("index");
      return;
    }
    if ("problem" in outcome.value) {
      setProblem(outcome.value.problem);
      return;
    }
    onDone(outcome.value.path);
  };

  const cancel = () => {
    if (job.cancel()) onClose();
  };

  // The job under way: a progress dialog in the choice's place, Cancel off while it writes.
  if (job.busy) {
    const done = job.progress?.done ?? 0;
    const total = job.progress?.total ?? 0;
    return (
      <ProgressDialog
        open
        title={into === undefined ? t("library.upload.options.title") : t("library.upload.options.intoTitle", { name: into.name })}
        progress={job.progress}
        caption={t("library.upload.indexing", { done, total })}
        cancelLabel={t("library.upload.cancel")}
        onCancel={cancel}
        cancelDisabled={job.phase === "writing"}
        testId="library-import"
        barTestId="library-import-bar"
        captionTestId="library-import-progress"
      >
        <Typography variant="body2" data-testid="library-import-indexing" sx={{ color: "text.secondary" }}>
          {t("library.upload.options.count", {
            kept: total,
            count: source.files.reduce((sum, file) => sum + file.games.length, 0),
          })}
        </Typography>
      </ProgressDialog>
    );
  }

  return (
    <CollectionImportDialog
      source={source}
      intoName={into?.name}
      problem={problem === null ? undefined : t(`library.upload.problem.${problem}`)}
      onCancel={cancel}
      onImport={(kept, splitByEvent) => void confirm(kept, splitByEvent)}
      testId="library-import"
    />
  );
}

export default ImportOptionsDialog;
