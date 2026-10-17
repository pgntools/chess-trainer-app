import { useMemo, useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { CollectionMergeDialog, type CollectionMergeDone } from "../../blocks/dialogs";
import type { CollectionMergeFormCandidate, CollectionMergeFormSource } from "../../blocks/forms";
import { ProgressDialog, useCancellableJob } from "../../design-system/components/dialogs";
import {
  DEFAULT_COLLECTION_MERGE_SETTINGS,
  mergeCollectionGames,
  mergeNameOf,
  type CollectionMergeSettings,
} from "../../lib/collectionMerge";
import { addCollection } from "../../lib/libraryCollectionStore";
import { MAX_COLLECTION_CHARS, type CollectionSummary } from "../../lib/libraryCollections";
import { downloadPgn } from "../../lib/pgnExport";
import { slugify } from "../../lib/pgnText";
import { shippedCollections } from "../../lib/shippedCollections";
import { indexCollection } from "./indexCollection";
import { loadCollectionGames, useUploadedCollections } from "./useLibraryCollections";

/** Why a merge made nothing before its write. */
class MergeRefused extends Error {
  readonly reason: "read" | "too-large";
  constructor(reason: "read" | "too-large") {
    super(reason);
    this.name = "MergeRefused";
    this.reason = reason;
  }
}

/** A merge done, with its games kept for Download PGN. */
type Done = CollectionMergeDone & { pgns: readonly string[] };

/**
 * **Library collections merged — a direct action** (CTA-232; a job of the
 * Jobs module before, CTA-220 / CTA-221). `open(ids)` opens the
 * `CollectionMergeDialog` on those collections, in that order — the
 * Library's picks (*Merge collections…*, two or more) or a collection page's
 * *Merge with…* (that collection alone, the picker to add the rest). Merge:
 *
 * 1. reads each source's games as the Library holds them (a shipped
 *    collection's PGN fetched and cut once, an upload's record —
 *    `loadCollectionGames`), and merges them (`mergeCollectionGames`: joined
 *    in order, duplicates left out as the reader chose — hashing, no
 *    `chess.js`, a few milliseconds a thousand games);
 * 2. refuses a merge over `MAX_COLLECTION_CHARS` with the upload's own words;
 * 3. **keeps it as an upload is kept**: the Library's indexer in its worker
 *    (`indexCollection` — the one real cost, the same as an upload of the
 *    same size), a `ProgressDialog` over the dialog with Cancel until the
 *    write, then `addCollection` — a new collection at the Library's top
 *    level, always.
 *
 * Done, the dialog says what was made, with **Open collection** and
 * **Download PGN** (the merged games as one `.pgn`). Render `dialog` once
 * in the screen; `testId` prefixes its ids (`<testId>`, `<testId>-progress`).
 */
export const useCollectionMerge = (testId: string): { open: (ids: readonly string[]) => void; dialog: ReactNode } => {
  const { t, i18n } = useTranslation();
  const job = useCancellableJob();
  const uploaded = useUploadedCollections();
  const [opened, setOpened] = useState(false);
  const [sources, setSources] = useState<CollectionMergeFormSource[]>([]);
  const [settings, setSettings] = useState<CollectionMergeSettings>(DEFAULT_COLLECTION_MERGE_SETTINGS);
  const [problem, setProblem] = useState<string | undefined>();
  const [done, setDone] = useState<Done | undefined>();

  // The Library as the picker offers it: Built-in, then the reader's own.
  const summaries = useMemo<readonly CollectionSummary[]>(() => [...shippedCollections, ...(uploaded ?? [])], [uploaded]);
  const candidates = useMemo<CollectionMergeFormCandidate[]>(
    () => summaries.map((summary) => ({ id: summary.id, name: summary.name, count: summary.count, builtIn: summary.source === "shipped" })),
    [summaries],
  );

  const open = (ids: readonly string[]) => {
    const picked = ids.flatMap((id) => {
      const found = summaries.find((summary) => summary.id === id);
      return found === undefined ? [] : [{ id: found.id, name: found.name, count: found.count }];
    });
    setSources(picked);
    setSettings(DEFAULT_COLLECTION_MERGE_SETTINGS);
    setProblem(undefined);
    setDone(undefined);
    setOpened(true);
  };

  const close = () => {
    if (job.busy) return;
    setOpened(false);
    // The merged games go with the dialog.
    setDone(undefined);
  };

  const more = (count: number) => t("library.merge.more", { count });

  const merge = async () => {
    setProblem(undefined);
    const name = mergeNameOf(settings.name, sources, more);
    const picked = sources.flatMap((source) => {
      const found = summaries.find((summary) => summary.id === source.id);
      return found === undefined ? [] : [found];
    });
    const outcome = await job.run({
      work: async (signal, report) => {
        if (picked.length !== sources.length) throw new MergeRefused("read");
        const games: (readonly string[])[] = [];
        for (const summary of picked) {
          const read = await loadCollectionGames(summary);
          if (read === null) throw new MergeRefused("read");
          signal.throwIfAborted();
          games.push(read);
        }
        const merged = mergeCollectionGames(games, settings.dedupe);
        if (merged.chars > MAX_COLLECTION_CHARS) throw new MergeRefused("too-large");
        const rows = await indexCollection(merged.games, (indexed, total) => report({ done: indexed, total }), signal);
        return { merged, rows };
      },
      write: async ({ merged, rows }) => {
        const made = await addCollection(name, merged.games, rows);
        return { merged, id: "problem" in made ? undefined : made.collection.id };
      },
    });
    if (outcome.status === "cancelled") return;
    if (outcome.status === "failed") {
      const refused = outcome.error instanceof MergeRefused ? outcome.error.reason : undefined;
      if (refused === undefined) console.error("useCollectionMerge: the merged games could not be indexed.", outcome.error);
      setProblem(
        refused === "too-large"
          ? t("library.upload.problem.too-large")
          : refused === "read"
            ? t("library.merge.problem.read")
            : t("library.merge.problem.index"),
      );
      return;
    }
    const { merged, id } = outcome.value;
    if (id === undefined) {
      setProblem(t("library.merge.problem.storage"));
      return;
    }
    setDone({
      name,
      games: merged.games.length,
      duplicates: merged.totals.duplicates,
      link: { component: RouterLink, to: `/library/${encodeURIComponent(id)}` },
      pgns: merged.games,
    });
  };

  const number = (value: number) => value.toLocaleString(i18n.language);
  const dialog = (
    <>
      <CollectionMergeDialog
        open={opened}
        onClose={close}
        sources={sources}
        onSourcesChange={(next) => {
          setProblem(undefined);
          setSources(next);
        }}
        candidates={candidates}
        settings={settings}
        onChange={(patch) => {
          setProblem(undefined);
          setSettings((current) => ({ ...current, ...patch }));
        }}
        onMerge={() => void merge()}
        busy={job.busy}
        error={problem}
        done={done}
        onDownload={() => {
          if (done !== undefined) downloadPgn(slugify(done.name) || "merged", done.pgns);
        }}
        testId={testId}
      />
      {/* The read, the merge and the index pass, over the dialog. */}
      <ProgressDialog
        open={job.busy}
        title={t("library.merge.progress.title")}
        progress={job.phase === "writing" ? null : job.progress}
        caption={
          job.phase === "writing"
            ? t("library.merge.progress.save")
            : job.progress === null
              ? t("library.merge.progress.read")
              : t("library.merge.progress.index", { done: number(job.progress.done), total: number(job.progress.total) })
        }
        cancelLabel={t("library.merge.cancel")}
        onCancel={() => void job.cancel()}
        cancelDisabled={job.phase === "writing"}
        testId={`${testId}-progress`}
      />
    </>
  );

  return { open, dialog };
};
