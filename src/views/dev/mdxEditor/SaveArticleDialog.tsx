import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

import { FormDialog } from "../../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { FileInputButton, TextInputField } from "../../../design-system/components/forms";
import { TreeView, ancestorsOf, type TreeNode } from "../../../design-system/patterns/trees";
import { ARTICLES_DIR, type StorageFolder } from "./storageClient";

/** An article's file name: a slug (or `index`), a language's two letters optional — no `.mdx`. */
const FILE_NAME = /^[a-z0-9][a-z0-9-]*(?:\.[a-z]{2})?$/;
/** A folder's name: a Blog path segment. */
const FOLDER_NAME = /^[a-z0-9][a-z0-9-]*$/;

const nodeIdOf = (path: string) => `folder:${path}`;
const join = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);
const parentOf = (path: string) => path.split("/").slice(0, -1).join("/");

/** The service's folders as one tree under the Blog's root — each a branch the reader can pick. */
const folderTree = (folders: readonly StorageFolder[]): TreeNode[] => {
  const nodeOf = (folder: StorageFolder): TreeNode => ({
    id: nodeIdOf(folder.path),
    label: folder.path === "" ? "articles/ — the Blog's root" : `${folder.title ?? folder.path.split("/").at(-1)} (${folder.path.split("/").at(-1)}/)`,
    icon: <FolderRoundedIcon fontSize="small" />,
    selectable: true,
    children: folders.filter((child) => child.path !== "" && child.path !== folder.path && parentOf(child.path) === folder.path).map(nodeOf),
  });
  const root = folders.find((folder) => folder.path === "") ?? { path: "", files: [] };
  return [nodeOf(root)];
};

type SaveArticleDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The Blog's folders, as the service found them. */
  folders: readonly StorageFolder[];
  /** The folder it opens on — the draft's own. */
  initialFolder: string;
  /** The name it opens with — the draft's own, or none for a new article. */
  initialName: string;
  /** Save the draft as `<folder>/<name>.mdx`. */
  onSave: (file: string) => void;
  /** Put a PGN file into `folder`, beside the article. */
  onAddPgn: (folder: string, file: File) => void;
  /** A write is under way. */
  busy: boolean;
  /** What the last PGN write came to. */
  pgnNotice?: string;
  /** Why the last write was refused. */
  error?: string;
};

/**
 * **Where to save an article** (CTA-137): a folder of the Blog's — or a new
 * sub-folder of it, which the service makes with a stub `index.mdx` — and a
 * file name (a slug; `.he` for a translation), the path it comes to shown as
 * it is typed. A `.pgn` the article imports goes into the same folder from
 * here. Writing over another file is asked about after the service reports
 * it, by the editor.
 */
function SaveArticleDialog({ open, onClose, folders, initialFolder, initialName, onSave, onAddPgn, busy, pgnNotice, error }: SaveArticleDialogProps) {
  const known = folders.some((folder) => folder.path === initialFolder) ? initialFolder : "";
  const [folder, setFolder] = useState(known);
  const [newFolder, setNewFolder] = useState("");
  const [name, setName] = useState(initialName);
  const nodes = folderTree(folders);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set([nodeIdOf(""), ...ancestorsOf(nodes, nodeIdOf(known))]));

  const target = newFolder.trim() === "" ? folder : join(folder, newFolder.trim());
  const files = folders.find((candidate) => candidate.path === target)?.files ?? [];
  const translation = /\.([a-z]{2})$/.exec(name);
  const stem = name.replace(/\.[a-z]{2}$/, "");

  const folderProblem =
    newFolder.trim() !== "" && !FOLDER_NAME.test(newFolder.trim()) ? "A folder's name is lower-case words and dashes — it is part of the address." : undefined;
  // One already there (a PGN put into it a moment ago) is simply where the file goes.
  const folderThere = newFolder.trim() !== "" && folders.some((candidate) => candidate.path === target);
  const nameProblem =
    name === ""
      ? undefined
      : !FILE_NAME.test(name)
        ? "Lower-case words and dashes, .he after it for a translation — no .mdx."
        : translation !== null && stem !== "index" && !files.includes(`${stem}.mdx`)
          ? `A translation goes beside its English file, and ${join(target, `${stem}.mdx`)} is not there.`
          : folders.some((candidate) => candidate.path === join(target, stem))
            ? `${join(target, stem)}/ is a folder — an article may not share its address.`
            : undefined;
  const path = `${ARTICLES_DIR}/${join(target, `${name === "" ? "…" : name}.mdx`)}`;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => onSave(join(target, name))}
      title="Save the article"
      submitLabel="Save"
      cancelLabel="Cancel"
      submitDisabled={name === "" || nameProblem !== undefined || folderProblem !== undefined}
      busy={busy}
      width="sm"
      testId="mdx-editor-save-dialog"
    >
      <Box>
        <Typography variant="subtitle2" component="p" id="mdx-editor-save-folder-label">
          Folder
        </Typography>
        <Box sx={{ maxHeight: 240, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1, py: 0.5 }}>
          <TreeView
            nodes={nodes}
            open={openIds}
            onToggle={(id) =>
              setOpenIds((before) => {
                const next = new Set(before);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            activeId={nodeIdOf(folder)}
            onSelect={(node) => setFolder(node.id.slice("folder:".length))}
            ariaLabel="Folder"
            hint="Arrow keys to move, right and left to open and close, Enter to pick a folder"
            testId="mdx-editor-save-folders"
          />
        </Box>
      </Box>
      <TextInputField
        label="New sub-folder (optional)"
        value={newFolder}
        onChange={setNewFolder}
        placeholder="club-nights"
        dir="ltr"
        error={folderProblem !== undefined}
        helperText={
          folderProblem ??
          (folderThere ? `${target}/ is there already — the file goes into it.` : `Made under ${folder === "" ? "articles/" : `${folder}/`} with an index.mdx titled from its name, so the Blog lists it.`)
        }
        testId="mdx-editor-save-new-folder"
      />
      <TextInputField
        label="File name"
        value={name}
        onChange={setName}
        placeholder="my-article"
        dir="ltr"
        error={nameProblem !== undefined}
        helperText={nameProblem ?? "Lower-case words and dashes; add .he for the Hebrew translation of an article beside it."}
        testId="mdx-editor-save-name"
      />
      <StatusText tone="neutral" testId="mdx-editor-save-path">
        <span dir="ltr">{path}</span>
      </StatusText>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
        <FileInputButton
          label="Add a .pgn to this folder"
          accept=".pgn"
          onFiles={(picked) => onAddPgn(target, picked[0])}
          variant="outlined"
          size="small"
          disabled={busy || folderProblem !== undefined}
          testId="mdx-editor-save-pgn"
        />
        {pgnNotice !== undefined && (
          <StatusText tone="info" testId="mdx-editor-save-pgn-notice">
            {pgnNotice}
          </StatusText>
        )}
      </Box>
      {error !== undefined && (
        <InlineAlert severity="error" title="The service would not write it" testId="mdx-editor-save-error">
          {error}
        </InlineAlert>
      )}
    </FormDialog>
  );
}

export default SaveArticleDialog;
