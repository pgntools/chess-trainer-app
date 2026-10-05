import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { ConfirmDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { CheckboxField } from "../../design-system/components/forms";
import { folderOf } from "./articleSources";
import { articleAssetsOf } from "./pgnImports";
import { ARTICLES_DIR, listStorageFolders, readImporters, type GitFile } from "./storageClient";

const ID = "mdx-editor-delete";

/** A PGN the article imports: its path under `articles/`, and the other articles importing it — `undefined` while not known. */
type ImportedPgn = { path: string; others: string[] | undefined };

type DeleteArticleDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The article's file under `articles/`, without `.mdx` — `tournaments/olympiad-2026`, `get-started.he`. */
  file: string;
  /** Its content — the PGN files it imports. */
  body: string;
  /** What git has not got of the articles — whether these files can be got back. `undefined` when not known. */
  gitFiles: readonly GitFile[] | undefined;
  /** Delete these files (paths under `articles/`). */
  onDelete: (paths: string[]) => void;
  busy: boolean;
};

/** `./x.pgn` read from `folder` → its path under `articles/`, or `undefined` for one that leaves it. */
const pathFrom = (folder: string, specifier: string): string | undefined => {
  const parts = folder === "" ? [] : folder.split("/");
  for (const part of specifier.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (parts.length === 0) return undefined;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
};

/**
 * **Delete an article** (CTA-137) — the file being edited, asked about
 * first. Its **translations** go with it (a translation without its English
 * file fails the build), listed; the **PGN files and images it imports** are offered
 * one by one, off to begin with, and one another article imports too is
 * kept, saying which. Whether git can bring them back is said: a file git
 * has never had is gone for good.
 */
function DeleteArticleDialog({ open, onClose, file, body, gitFiles, onDelete, busy }: DeleteArticleDialogProps) {
  const folder = folderOf(file);
  const name = file.split("/").at(-1) ?? file;
  const english = !/\.[a-z]{2}$/.test(name);
  const [translations, setTranslations] = useState<string[]>();
  const [pgns, setPgns] = useState<ImportedPgn[]>(() =>
    articleAssetsOf(body).flatMap((asset) => {
      const path = pathFrom(folder, asset.file);
      return path === undefined ? [] : [{ path, others: undefined }];
    }),
  );
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());

  // What sits beside it — its translations — and who else imports its PGNs, asked of the service once.
  useEffect(() => {
    let live = true;
    void listStorageFolders().then((listed) => {
      if (!live) return;
      const files = listed.kind === "folders" ? (listed.folders.find((candidate) => candidate.path === folder)?.files ?? []) : [];
      setTranslations(english ? files.filter((candidate) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[a-z]{2}\\.mdx$`).test(candidate)).map((candidate) => (folder === "" ? candidate : `${folder}/${candidate}`)) : []);
    });
    for (const pgn of pgns) {
      void readImporters(pgn.path).then((importers) => {
        if (!live) return;
        const others = (importers ?? []).filter((importer) => importer.replace(/(\.[a-z]{2})?\.mdx$/, "") !== file.replace(/\.[a-z]{2}$/, ""));
        setPgns((before) => before.map((candidate) => (candidate.path === pgn.path ? { ...candidate, others } : candidate)));
      });
    }
    return () => {
      live = false;
    };
    // Once, for the file the dialog opened on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paths = [`${file}.mdx`, ...(translations ?? []), ...pgns.filter((pgn) => chosen.has(pgn.path)).map((pgn) => pgn.path)];
  const notInGit = gitFiles === undefined ? [] : paths.filter((path) => gitFiles.some((candidate) => candidate.path === path && candidate.state === "new"));
  const loading = translations === undefined || pgns.some((pgn) => pgn.others === undefined);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => onDelete(paths)}
      title="Delete the article?"
      message={
        <>
          {"This deletes "}
          <Box component="code" dir="ltr">{`${ARTICLES_DIR}/${file}.mdx`}</Box>
          {" from the disk."}
        </>
      }
      confirmLabel={paths.length === 1 ? "Delete" : `Delete ${paths.length} files`}
      cancelLabel="Cancel"
      tone="destructive"
      busy={busy}
      confirmDisabled={loading}
      width="sm"
      testId={ID}
    >
      <Box sx={{ display: "grid", gap: 2, mt: 2 }}>
        {loading && (
          <Typography role="status" variant="body2" color="text.secondary">
            Looking at what goes with it…
          </Typography>
        )}
        {translations !== undefined && translations.length > 0 && (
          <Box data-testid={`${ID}-translations`}>
            <Typography variant="subtitle2" component="h3">
              Its translations, deleted with it
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              The build refuses a translation whose English file is gone.
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {translations.map((path) => (
                <li key={path}>
                  <Box component="code" dir="ltr">
                    {path}
                  </Box>
                </li>
              ))}
            </Box>
          </Box>
        )}
        {pgns.length > 0 && (
          <Box data-testid={`${ID}-pgns`} sx={{ display: "grid", gap: 0.5 }}>
            <Typography variant="subtitle2" component="h3">
              The PGN files and images it imports
            </Typography>
            {pgns.map((pgn) => (
              <CheckboxField
                key={pgn.path}
                label={<span dir="ltr">{`Delete ${pgn.path} too`}</span>}
                checked={chosen.has(pgn.path)}
                onChange={(checked) =>
                  setChosen((before) => {
                    const next = new Set(before);
                    if (checked) next.add(pgn.path);
                    else next.delete(pgn.path);
                    return next;
                  })
                }
                disabled={pgn.others === undefined || pgn.others.length > 0}
                help={
                  pgn.others === undefined
                    ? "Asking which articles import it…"
                    : pgn.others.length > 0
                      ? `Kept — ${pgn.others.join(", ")} imports it too.`
                      : "Only this article imports it."
                }
                size="small"
                testId={`${ID}-pgn-${pgn.path}`}
              />
            ))}
          </Box>
        )}
        {gitFiles === undefined ? (
          <StatusText tone="neutral" testId={`${ID}-git-unknown`}>
            Whether git has these files is not known — the storage service could not ask it.
          </StatusText>
        ) : notInGit.length > 0 ? (
          <InlineAlert severity="warning" title="Not in git — gone for good" testId={`${ID}-not-in-git`}>
            {`${notInGit.join(", ")} ${notInGit.length === 1 ? "has" : "have"} never been committed: once deleted, nothing can bring ${notInGit.length === 1 ? "it" : "them"} back.`}
          </InlineAlert>
        ) : (
          <StatusText tone="neutral" testId={`${ID}-in-git`}>
            Git has these files: until the deletion is committed, git restore brings them back.
          </StatusText>
        )}
      </Box>
    </ConfirmDialog>
  );
}

export default DeleteArticleDialog;
