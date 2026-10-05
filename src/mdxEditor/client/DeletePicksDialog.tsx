import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { ConfirmDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { deletedFilesOf, type DeletionPlan } from "./deletionPlan";
import { ARTICLES_DIR, readImporters, type GitFile } from "./storageClient";

const ID = "mdx-lobby-delete-picks";

type DeletePicksDialogProps = {
  open: boolean;
  onClose: () => void;
  plan: DeletionPlan;
  /** What git has not got of the articles — whether these can be got back. `undefined` when not known. */
  gitFiles: readonly GitFile[] | undefined;
  onConfirm: () => void;
  busy: boolean;
  /** Why the service would not delete them. */
  error?: string;
};

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** A list of paths, as code, left to right. */
function Paths({ paths }: { paths: readonly string[] }) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 3, maxHeight: 160, overflowY: "auto" }}>
      {paths.map((path) => (
        <li key={path}>
          <Box component="code" dir="ltr">
            {path}
          </Box>
        </li>
      ))}
    </Box>
  );
}

/**
 * **Delete the lobby's picks** (CTA-137) — the confirmation names every
 * file that goes (`deletionPlanOf`): each folder with everything under it,
 * each article with its translations, each PGN; warns where an article that
 * stays imports a PGN that goes (it would no longer build), and where a
 * file has never been committed (gone for good).
 */
function DeletePicksDialog({ open, onClose, plan, gitFiles, onConfirm, busy, error }: DeletePicksDialogProps) {
  const deleted = deletedFilesOf(plan);
  const pgnsGoing = deleted.filter((path) => path.endsWith(".pgn"));
  /** Each PGN that goes, and the articles that stay and import it — `undefined` while asked. */
  const [broken, setBroken] = useState<{ pgn: string; importers: string[] }[]>();
  useEffect(() => {
    let live = true;
    void Promise.all(pgnsGoing.map(async (pgn) => ({ pgn, importers: ((await readImporters(pgn)) ?? []).filter((importer) => !deleted.includes(importer)) }))).then(
      (found) => live && setBroken(found.filter((entry) => entry.importers.length > 0)),
    );
    return () => {
      live = false;
    };
    // Once, for the plan the dialog opened on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const notInGit = gitFiles === undefined ? [] : deleted.filter((path) => gitFiles.some((file) => file.path === path && file.state === "new"));
  const count = plan.folders.length + plan.articles.length + plan.pgns.length;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${plural(count, "item")}?`}
      message={`This deletes ${plural(deleted.length, "file")} from ${ARTICLES_DIR}/${plan.folders.length > 0 ? `, and ${plural(plan.folders.length, "folder")}` : ""}.`}
      confirmLabel={`Delete ${plural(deleted.length, "file")}`}
      cancelLabel="Cancel"
      tone="destructive"
      busy={busy}
      confirmDisabled={broken === undefined}
      width="sm"
      testId={ID}
    >
      <Box sx={{ display: "grid", gap: 1.5, mt: 1 }}>
        {error !== undefined && (
          <InlineAlert severity="error" title="The service would not delete them" testId={`${ID}-error`}>
            {error}
          </InlineAlert>
        )}
        {plan.folders.length > 0 && (
          <Box data-testid={`${ID}-folders`}>
            <Typography variant="subtitle2" component="h3">
              {`${plural(plan.folders.length, "folder")}, with everything under ${plan.folders.length === 1 ? "it" : "them"}`}
            </Typography>
            <Paths paths={plan.folders.map((folder) => `${folder}/`)} />
            <Typography variant="body2" color="text.secondary">
              {[
                plural(plan.inFolders.articles.length, "article file"),
                plural(plan.inFolders.pgns.length, "PGN file"),
                ...(plan.inFolders.others.length > 0 ? [`${plural(plan.inFolders.others.length, "other file")} (${plan.inFolders.others.map((path) => path.split("/").at(-1)).join(", ")})`] : []),
              ].join(", ")}
            </Typography>
          </Box>
        )}
        {plan.articles.length > 0 && (
          <Box data-testid={`${ID}-articles`}>
            <Typography variant="subtitle2" component="h3">
              {plural(plan.articles.length, "article")}
            </Typography>
            <Paths paths={plan.articles} />
          </Box>
        )}
        {plan.translations.length > 0 && (
          <Box data-testid={`${ID}-translations`}>
            <Typography variant="subtitle2" component="h3">
              Their translations, deleted with them
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The build refuses a translation whose English file is gone.
            </Typography>
            <Paths paths={plan.translations} />
          </Box>
        )}
        {plan.pgns.length > 0 && (
          <Box data-testid={`${ID}-pgns`}>
            <Typography variant="subtitle2" component="h3">
              {plural(plan.pgns.length, "PGN file")}
            </Typography>
            <Paths paths={plan.pgns} />
          </Box>
        )}
        {broken === undefined ? (
          <Typography role="status" variant="body2" color="text.secondary">
            Asking which articles import the PGN files…
          </Typography>
        ) : (
          broken.length > 0 && (
            <InlineAlert severity="warning" title="Articles that stay import them" testId={`${ID}-broken`}>
              {broken.map(({ pgn, importers }) => `${importers.join(", ")} ${importers.length === 1 ? "imports" : "import"} ${pgn}`).join("; ")} — without it, they no longer build.
            </InlineAlert>
          )
        )}
        {gitFiles === undefined ? (
          <StatusText tone="neutral" testId={`${ID}-git-unknown`}>
            Whether git has these files is not known.
          </StatusText>
        ) : notInGit.length > 0 ? (
          <InlineAlert severity="warning" title="Not in git — gone for good" testId={`${ID}-not-in-git`}>
            {`${plural(notInGit.length, "file")} ${notInGit.length === 1 ? "has" : "have"} never been committed: once deleted, nothing can bring ${notInGit.length === 1 ? "it" : "them"} back.`}
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

export default DeletePicksDialog;
