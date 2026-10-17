import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { useTranslation } from "react-i18next";

import { BaseDialog, FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { MIN_MERGE_SOURCES, type CollectionMergeSettings } from "../../../lib/collectionMerge";
import { CollectionMergeForm, type CollectionMergeFormCandidate, type CollectionMergeFormSource } from "../../forms";

/** **A merge done** — the new collection, what it holds, and how many games were left out as duplicates. */
export type CollectionMergeDone = {
  name: string;
  games: number;
  duplicates: number;
  /** The new collection's page. */
  link: LinkTarget;
};

export type CollectionMergeDialogProps = {
  open: boolean;
  /** Cancel, Close, Escape or the backdrop — never while `busy`. */
  onClose: () => void;
  /** The collections picked, in order — fewer than two keeps Merge off, with a note. */
  sources: readonly CollectionMergeFormSource[];
  onSourcesChange: (sources: CollectionMergeFormSource[]) => void;
  /** The Library's other collections, to add (`CollectionMergeForm`'s). */
  candidates: readonly CollectionMergeFormCandidate[];
  settings: CollectionMergeSettings;
  onChange: (patch: Partial<CollectionMergeSettings>) => void;
  /** Merge: the screen reads, merges, indexes and keeps it (its progress its own, over this dialog). */
  onMerge: () => void;
  /** The merge is under way: nothing changes, nothing closes. */
  busy?: boolean;
  /** Why the merge made nothing — too large, unreadable, refused — said in the dialog. */
  error?: ReactNode;
  /** **Done**: the dialog says what was made, with Open collection and Download PGN, and Close. */
  done?: CollectionMergeDone;
  /** Download PGN — the merged games as one `.pgn`, the screen's. */
  onDownload: () => void;
  /**
   * The root. The form `-form` (its parts `CollectionMergeForm`'s), the
   * problem `-error`, Merge `-submit`, Cancel `-cancel`, the note `-submit-note`;
   * done, the root `-done` — its summary `-done-summary`, `-done-open`,
   * `-done-download`, `-done-close`.
   */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/**
 * **Library collections merged** (CTA-232 — the Jobs module's merge kind
 * before) — the dialog the Library's picks (*Merge collections…*, two or
 * more ticked) and a collection page's *Merge with…* (that collection
 * first) open: the `CollectionMergeForm` — the collections in order, a
 * picker to add more, the dedupe mode, the name — and Merge, off below two
 * collections with a note saying so. A merge that made nothing says why in
 * the dialog. **Done**, the dialog becomes its result: the new collection's
 * name and size and the duplicates left out (announced, `role="status"`),
 * **Open collection** (a link, closing the dialog as it goes), **Download
 * PGN** and Close.
 *
 * Presentational: the collections, the settings, the result and every
 * action are the screen's (`views/library/useCollectionMerge.tsx`). Its
 * words are `library.merge.*`.
 */
function CollectionMergeDialog({
  open,
  onClose,
  sources,
  onSourcesChange,
  candidates,
  settings,
  onChange,
  onMerge,
  busy = false,
  error,
  done,
  onDownload,
  testId,
  dialogProps,
}: CollectionMergeDialogProps) {
  const { t, i18n } = useTranslation();
  const count = (value: number) => value.toLocaleString(i18n.language);

  if (done !== undefined) {
    return (
      <BaseDialog
        open={open}
        onClose={onClose}
        title={t("library.merge.done.title")}
        width="xs"
        testId={`${testId}-done`}
        dialogProps={dialogProps}
        actions={
          <>
            <Button onClick={onClose} data-testid={`${testId}-done-close`}>
              {t("library.merge.close")}
            </Button>
            <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={onDownload} data-testid={`${testId}-done-download`}>
              {t("library.merge.done.download")}
            </Button>
            <Button variant="contained" {...linkProps(done.link)} onClick={onClose} data-testid={`${testId}-done-open`}>
              {t("library.merge.done.open")}
            </Button>
          </>
        }
      >
        <Box role="status" data-testid={`${testId}-done-summary`} sx={{ display: "grid", gap: 0.5 }}>
          <Typography variant="body2">
            <bdi>{t("library.merge.done.summary", { name: done.name, count: done.games, formatted: count(done.games) })}</bdi>
          </Typography>
          {done.duplicates > 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("library.merge.done.duplicates", { count: done.duplicates, formatted: count(done.duplicates) })}
            </Typography>
          )}
        </Box>
      </BaseDialog>
    );
  }

  const tooFew = sources.length < MIN_MERGE_SOURCES;
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={onMerge}
      title={t("library.merge.title")}
      submitLabel={t("library.merge.submit")}
      cancelLabel={t("library.merge.cancel")}
      submitDisabled={tooFew}
      submitNote={tooFew ? t("library.merge.pickTwo") : undefined}
      busy={busy}
      width="sm"
      testId={testId}
      dialogProps={dialogProps}
    >
      <CollectionMergeForm
        sources={sources}
        onSourcesChange={onSourcesChange}
        candidates={candidates}
        settings={settings}
        onChange={onChange}
        disabled={busy}
        testId={`${testId}-form`}
      />
      {error !== undefined && error !== null && error !== false && (
        <InlineAlert severity="error" dense testId={`${testId}-error`}>
          {error}
        </InlineAlert>
      )}
    </FormDialog>
  );
}

export default CollectionMergeDialog;
