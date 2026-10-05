import { Suspense, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveAsRoundedIcon from "@mui/icons-material/SaveAsRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import { SelectAutocomplete } from "../../../design-system/components/autocompletes";
import { ConfirmDialog } from "../../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { SwitchField } from "../../../design-system/components/forms";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { articleFileName, joinFrontmatter, parseFrontmatterYaml, splitFrontmatter } from "../../../lib/articleFrontmatter";
import { downloadTextFile } from "../../../lib/pgnExport";
import { ArticleHeader } from "../../blog/ArticleHeader";
import { findBlogArticle } from "../../blog/articles";
import { articleOptions, folderOf, loadArticleSource } from "./articleSources";
import { MetadataPane } from "./MetadataPane";
import { PreviewBoundary } from "./mdxPreview";
import { PREVIEW_COMPONENTS, useCompiled, whereOf } from "./useCompiled";
import AddPgnDialog, { type PgnToAdd } from "./AddPgnDialog";
import { insertBlock } from "./componentCatalog";
import { withInlinePgn, withPgnImports } from "./pgnImports";
import { BIG_PGN_BYTES, pgnBytesOf, sizeOf } from "./pgnPages";
import { starterFrontmatter, todayIso } from "./metadataYaml";
import SaveArticleDialog from "./SaveArticleDialog";
import { STARTER_DOCUMENT } from "./starterDocument";
import { ARTICLES_DIR, listStorageFolders, STORAGE_COMMAND, STORAGE_URL, writeStorageFile, type StorageFolder } from "./storageClient";
import { useScrollSync } from "./useScrollSync";

/**
 * **The MDX editor** (dev-only, `/dev/mdx-editor`) — an article's MDX on the
 * left, rendered on the right as the Blog renders it: the same components
 * (`views/home/frontPage/index.ts`), named with no `import`, reading the same
 * Library, repertoires and stored games. It is compiled in the browser
 * (`compileMdx.ts`) a moment after typing stops.
 *
 * - **A document that will not compile** keeps the last one that did on the
 *   right, under the error and where it is. **A component that throws** (a
 *   prop it cannot read) is caught there, and the next compile tries again.
 * - **An article** can be opened as a starting point — typed to find in the
 *   autocomplete beside the toolbar (the Blog's folders as its groups), or
 *   from the edit icon beside an article's title (`?article=<file>`, which
 *   `Main` hands in as `arrivingArticle`); its
 *   `import games from "./x.pgn?raw"` reads the file beside it.
 * - **Content and Metadata** (CTA-135): a file opens split in two — its
 *   body in the Content tab, its frontmatter in the Metadata tab
 *   (`MetadataPane`: a form, or the YAML, checked as the build checks it) —
 *   and Copy and Download join them back into one `.mdx`. The preview draws
 *   the article's header from the metadata, as the article's page does. A
 *   new article starts as a draft, dated today.
 * - **The panes scroll together** (`useScrollSync.ts`) while "Scroll
 *   together" is on and the Content tab is open: scrolling either brings the
 *   other to the same block.
 * - **Saving** (CTA-137) goes through a local storage service,
 *   `yarn mdx-editor:start` (`scripts/mdx-editor-server.ts`, called through
 *   `storageClient.ts`), which writes into `src/views/blog/articles/`. Save
 *   writes an opened article over its own file; a new article, or Save as,
 *   asks where (`SaveArticleDialog`: a folder, or a new sub-folder, and a
 *   name), and Save as somewhere else writes a new file, leaving the first
 *   alone. Writing over another file asks first; a service that is not
 *   running is a dialog naming the command. Nothing is moved or deleted.
 *   **Add PGN** (`AddPgnDialog`) takes a PGN — uploaded or pasted — as a
 *   file beside the article, written by the service and imported
 *   (`import <name> from "./<file>.pgn?raw"`), or inline, written into the
 *   content as `export const <name> = \`…\`` (`pgnImports.ts`); the preview
 *   reads either at once. Its Output element tab gives each component's
 *   markup reading that PGN (`componentCatalog.ts`), to copy or insert at
 *   the caret. The save dialog also takes a PGN, which the article imports
 *   when it is saved there.
 *   Copy and Download still give the text without the service. The draft is
 *   kept for the tab's session, so a reload or a visit to another screen
 *   keeps it.
 */


const DRAFT_KEY = "chessapp.dev.mdxEditor.draft";
const SOURCE_ID = "mdx-editor-source";
/** The articles it can open, typed to find — fixed for the build, as the files are. */
const ARTICLE_OPTIONS = articleOptions();

/** What is being edited: the frontmatter's YAML (`undefined` for a file with none), the body, and the file it came from. */
type Draft = { yaml: string | undefined; body: string; file: string };
/** What the tab keeps: the draft, and the file's text as it was opened — so a kept draft still counts as changed. */
type Kept = Draft & { opened: string };

/** A file's text as a draft — split into its frontmatter and its body. */
const draftOf = (source: string, file: string): Draft => ({ ...splitFrontmatter(source), file });
/** The draft as one file again. */
const textOf = (draft: Draft): string => joinFrontmatter(draft.yaml, draft.body);
/** A new article: the starter document, a draft dated today. */
const starterDraft = (): Draft => ({ yaml: starterFrontmatter(todayIso()), body: STARTER_DOCUMENT, file: "" });

const readKept = (): Kept | undefined => {
  try {
    const value = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as (Partial<Kept> & { source?: unknown }) | null;
    if (value === null) return undefined;
    const file = typeof value.file === "string" ? value.file : "";
    // Kept before the editor split a file in two: one text.
    const draft = typeof value.body === "string" ? { yaml: typeof value.yaml === "string" ? value.yaml : undefined, body: value.body, file } : typeof value.source === "string" ? draftOf(value.source, file) : undefined;
    if (draft === undefined) return undefined;
    return { ...draft, opened: typeof value.opened === "string" ? value.opened : textOf(draft) };
  } catch {
    return undefined;
  }
};

const writeKept = (kept: Kept) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(kept));
  } catch {
    // A private window or full storage: the draft is simply not kept.
  }
};


/**
 * A step of saving, kept as what was asked rather than as a closure — so a
 * retry (the service started, a replacement confirmed) runs against the
 * draft as it is then.
 */
type SaveStep =
  | { kind: "save" }
  | { kind: "save-as" }
  | { kind: "write"; file: string; overwrite: boolean }
  /**
   * PGNs into `folder`; `overwrite` names the ones the reader agreed to
   * replace. `into` the article: its body imports them at once; the save
   * dialog: when the article is saved in that folder.
   */
  | { kind: "pgn"; folder: string; files: PgnFile[]; overwrite: readonly string[]; into: "article" | "dialog" };

/** A PGN to write: its file's name, its text, and — from Add PGN — the name the article binds it to. */
type PgnFile = { file: string; text: string; name?: string };

/** The save dialog's state: the folders the service listed, and what it opened with. */
type SaveDialogState = { folders: StorageFolder[]; folder: string; name: string };

const pathIn = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);

/** A title as a file name: lower-case words and dashes — "" for one with no Latin letters. */
const slugOf = (title: unknown): string =>
  typeof title === "string"
    ? title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";

type MdxEditorProps = {
  /** An article file to open on arrival — `tournaments/olympiad-2026`, `get-started.he` — replacing the draft. */
  arrivingArticle?: string;
  /** Called once that file is open (or found missing), so the address can drop it. */
  onArrived?: () => void;
};

function MdxEditor({ arrivingArticle, onArrived }: MdxEditorProps = {}) {
  const [kept] = useState(readKept);
  const [draft, setDraft] = useState<Draft>(() => (kept === undefined ? starterDraft() : { yaml: kept.yaml, body: kept.body, file: kept.file }));
  const [opened, setOpened] = useState(() => kept?.opened ?? textOf(draft));
  const [notice, setNotice] = useState<string>();
  const [scrollTogether, setScrollTogether] = useState(true);
  const [tab, setTab] = useState<"content" | "metadata">("content");
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useScrollSync({ enabled: scrollTogether && tab === "content", source: sourceRef, preview: previewRef });
  const folder = folderOf(draft.file);
  /** PGNs written this session, by path under `articles/` — the preview reads them before the glob catches up with the files. */
  const [attached, setAttached] = useState<Readonly<Record<string, string>>>({});
  const compiled = useCompiled(draft.body, folder, attached);
  const source = textOf(draft);

  // What the file is, by its name — which keys its frontmatter takes; a new one is an article in English.
  const fileName = articleFileName(`${draft.file === "" ? "new-article" : draft.file}.mdx`);
  const metadata = parseFrontmatterYaml(draft.yaml ?? "");
  const header = metadata.ok && metadata.data !== null && typeof metadata.data === "object" ? (metadata.data as Record<string, unknown>) : {};
  const english = fileName.kind === "article" ? findBlogArticle(fileName.path) : undefined;
  // A body that starts with a `---` block — a whole file pasted into Content.
  const pastedFrontmatter = splitFrontmatter(draft.body).yaml !== undefined;

  useEffect(() => writeKept({ ...draft, opened }), [draft, opened]);

  /** A file's text opened: split in two, and "changed" measured from it as the editor would write it back. */
  const open = (text: string, file: string) => {
    const next = draftOf(text, file);
    setDraft(next);
    setOpened(textOf(next));
  };

  // Arriving from an article's edit icon: that article replaces the draft — the reader asked for it.
  useEffect(() => {
    if (arrivingArticle === undefined) return;
    let live = true;
    void loadArticleSource(arrivingArticle).then((source) => {
      if (!live) return;
      if (source === undefined) setNotice(`No article file ${arrivingArticle}.mdx.`);
      else {
        open(source, arrivingArticle);
        setNotice(`Opened ${arrivingArticle}.mdx.`);
      }
      onArrived?.();
    });
    return () => {
      live = false;
    };
  }, [arrivingArticle, onArrived]);

  const dirty = source !== opened;
  const replace = (text: string, file: string, message: string) => {
    if (dirty && !window.confirm("Replace the text in the editor? Its changes will be lost.")) return;
    open(text, file);
    setNotice(message);
  };

  const openArticle = async (file: string) => {
    const text = await loadArticleSource(file);
    if (text === undefined) setNotice(`No article file ${file}.mdx.`);
    else replace(text, file, `Opened ${file}.mdx.`);
  };

  /** A `---` block pasted at the top of Content moves to Metadata, over what is there. */
  const moveFrontmatter = () => {
    const moved = splitFrontmatter(draft.body);
    if ((draft.yaml ?? "").trim() !== "" && !window.confirm("Replace the metadata with the block from the content?")) return;
    setDraft({ ...draft, yaml: moved.yaml, body: moved.body });
    setNotice("Moved the --- block into Metadata.");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setNotice("Copied the MDX.");
    } catch {
      setNotice("The browser refused to copy — select the text and copy it by hand.");
    }
  };

  const downloadName = `${draft.file === "" ? "article" : draft.file.split("/").at(-1)}.mdx`;
  const download = () => setNotice(downloadTextFile(downloadName, source, "text/markdown") ? `Downloaded ${downloadName}.` : "The browser refused the download.");
  const starter = starterDraft();

  // Saving through the storage service (CTA-137).
  const [saveDialog, setSaveDialog] = useState<SaveDialogState>();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [pgnNotice, setPgnNotice] = useState<string>();
  /** PGNs the save dialog put into a folder — imported by the article when it is saved there. */
  const [dialogPgns, setDialogPgns] = useState<{ folder: string; file: string }[]>([]);
  /** The step the service was down for — retried from its dialog. */
  const [down, setDown] = useState<SaveStep>();
  /** A file already there, and the step that writes over it. */
  const [conflict, setConflict] = useState<{ path: string; step: SaveStep }>();

  // Add PGN (CTA-137): the dialog, and what its last add came to.
  const [addPgnOpen, setAddPgnOpen] = useState(false);
  const [pgnAdded, setPgnAdded] = useState<{ seq: number; name: string; message: string }>();
  const [addPgnError, setAddPgnError] = useState<string>();

  const refused = (message: string) => (addPgnOpen ? setAddPgnError(message) : saveDialog === undefined ? setNotice(message) : setSaveError(message));

  const openSaveDialog = async () => {
    const listed = await listStorageFolders();
    if (listed.kind === "down") return setDown({ kind: "save-as" });
    if (listed.kind === "refused") return setNotice(listed.message);
    setSaveError(undefined);
    setPgnNotice(undefined);
    setDialogPgns([]);
    setSaveDialog({
      folders: listed.folders,
      folder: folderOf(draft.file),
      name: draft.file === "" ? slugOf(header.title) : (draft.file.split("/").at(-1) ?? ""),
    });
  };

  const write = async (file: string, overwrite: boolean) => {
    // A PGN the dialog put where the article is going is imported by it.
    const pgns = dialogPgns.filter((pgn) => pgn.folder === folderOf(file)).map((pgn) => pgn.file);
    const { body, imports } = withPgnImports(draft.body, pgns);
    const text = textOf({ ...draft, body });
    setBusy(true);
    const result = await writeStorageFile(`${file}.mdx`, text, overwrite);
    setBusy(false);
    if (result.kind === "down") return setDown({ kind: "write", file, overwrite });
    if (result.kind === "exists") return setConflict({ path: result.path, step: { kind: "write", file, overwrite: true } });
    if (result.kind === "refused") return refused(result.message);
    // The draft is now that file's: "changed" counts from what was written.
    setDraft((current) => ({ ...current, file, body: pgns.length === 0 ? current.body : body }));
    setOpened(text);
    setSaveDialog(undefined);
    setDialogPgns([]);
    const made = result.foldersCreated.length === 0 ? "" : ` — and made ${result.foldersCreated.map((folder) => `${folder}/`).join(", ")} with an index.mdx`;
    const imported = imports.length === 0 ? "" : ` It imports ${imports.map((pgn) => `${pgn.file} as ${pgn.name}`).join(", ")}.`;
    setNotice(`Saved ${ARTICLES_DIR}/${result.path}${made}.${imported}`);
  };

  /** PGNs into `folder`, one by one — stopping at the first the service will not take, to go on from there. */
  const addPgns = async (step: Extract<SaveStep, { kind: "pgn" }>) => {
    const { folder, files, overwrite, into } = step;
    const added: (PgnFile & { path: string })[] = [];
    setBusy(true);
    for (const [index, pgn] of files.entries()) {
      const path = pathIn(folder, pgn.file);
      const result = await writeStorageFile(path, pgn.text, overwrite.includes(pgn.file));
      if (result.kind === "written") {
        added.push({ ...pgn, path });
        continue;
      }
      const rest = files.slice(index);
      if (result.kind === "down") setDown({ ...step, files: rest });
      else if (result.kind === "exists") setConflict({ path, step: { ...step, files: rest, overwrite: [...overwrite, pgn.file] } });
      else refused(result.message);
      break;
    }
    setBusy(false);
    if (added.length === 0) return;
    setAttached((before) => ({ ...before, ...Object.fromEntries(added.map((pgn) => [pgn.path, pgn.text])) }));
    const paths = added.map((pgn) => pgn.path).join(", ");
    if (into === "article") {
      // The article imports what was attached to it, at once.
      const entries = added.map((pgn) => (pgn.name === undefined ? pgn.file : { file: pgn.file, name: pgn.name }));
      const { imports } = withPgnImports(draft.body, entries);
      setDraft((current) => ({ ...current, body: withPgnImports(current.body, entries).body }));
      const message = `Added ${paths} — imported as ${imports.map((pgn) => pgn.name).join(", ")}: give it to a component as pgn={${imports[0].name}}.`;
      setNotice(message);
      setAddPgnError(undefined);
      setPgnAdded((before) => ({ seq: (before?.seq ?? 0) + 1, name: imports[0].name, message }));
      return;
    }
    setSaveError(undefined);
    setDialogPgns((before) => [...before, ...added.map((pgn) => ({ folder, file: pgn.file }))]);
    setPgnNotice(`Added ${paths} — the article imports it when it is saved in ${folder === "" ? "articles" : folder}/.`);
    // A folder the write made is one the picker should now show.
    const listed = await listStorageFolders();
    if (listed.kind === "folders") setSaveDialog((before) => (before === undefined ? before : { ...before, folders: listed.folders }));
  };

  /** A PGN from the Add PGN dialog: written beside the article and imported, or written into the content. */
  const addPgn = ({ how, name, fileName, text }: PgnToAdd) => {
    if (how === "file") return void run({ kind: "pgn", folder, files: [{ file: fileName, text, name }], overwrite: [], into: "article" });
    // Never a big PGN inline: the dialog offers none, and this holds it whatever asks.
    if (pgnBytesOf(text) > BIG_PGN_BYTES) return setNotice(`A PGN over ${sizeOf(BIG_PGN_BYTES)} goes in as a file beside the article, not inline.`);
    setDraft((current) => ({ ...current, body: withInlinePgn(current.body, name, text) }));
    const message = `Wrote the PGN into the content as ${name}: give it to a component as pgn={${name}}.`;
    setNotice(message);
    setPgnAdded((before) => ({ seq: (before?.seq ?? 0) + 1, name, message }));
  };

  /** An example from the dialog, put into the content where the caret is (at its end with no caret). */
  const insertExample = (code: string) => {
    const caret = sourceRef.current?.selectionStart ?? draft.body.length;
    setDraft((current) => ({ ...current, body: insertBlock(current.body, caret, code) }));
    setAddPgnOpen(false);
    setTab("content");
    setNotice(`Inserted ${code.split(/[\s>]/)[0]}> into the content.`);
  };

  const run = (step: SaveStep) => {
    if (step.kind === "save") return draft.file === "" ? openSaveDialog() : write(draft.file, true);
    if (step.kind === "save-as") return openSaveDialog();
    if (step.kind === "write") return write(step.file, step.overwrite);
    return addPgns(step);
  };

  const { Content, error, pending, version } = compiled;
  return (
    <Box data-testid="mdx-editor" sx={{ height: { md: "100%" }, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            MDX editor
          </Typography>
          <Typography variant="body2" color="text.secondary" data-testid="mdx-editor-editing">
            {`${draft.file === "" ? "A new article" : `Editing ${draft.file}.mdx`}${dirty ? " — changed" : ""} · imports resolve from articles/${folder === "" ? "" : `${folder}/`}`}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 280 }}>
          <SelectAutocomplete
            label="Open an article"
            value={null}
            onChange={(file) => file !== null && void openArticle(file)}
            options={ARTICLE_OPTIONS}
            placeholder="Type to find an article…"
            clearable={false}
            testId="mdx-editor-open"
          />
        </Box>
        <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => void run({ kind: "save" })} disabled={busy} data-testid="mdx-editor-save">
          Save
        </Button>
        <Button size="small" startIcon={<SaveAsRoundedIcon />} onClick={() => void run({ kind: "save-as" })} disabled={busy} data-testid="mdx-editor-save-as">
          Save as…
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<UploadFileRoundedIcon />}
          onClick={() => {
            // A fresh dialog: step 1 again, nothing added yet.
            setAddPgnError(undefined);
            setPgnAdded(undefined);
            setAddPgnOpen(true);
          }}
          disabled={busy}
          data-testid="mdx-editor-add-pgn"
        >
          Add PGN
        </Button>
        <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => void copy()} data-testid="mdx-editor-copy">
          Copy MDX
        </Button>
        <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={download} data-testid="mdx-editor-download">
          Download .mdx
        </Button>
        <Button
          size="small"
          startIcon={<RestartAltRoundedIcon />}
          onClick={() => replace(textOf(starter), "", "Started a new article.")}
          disabled={draft.file === "" && source === textOf(starter)}
          data-testid="mdx-editor-reset"
        >
          New article
        </Button>
      </Box>
      {notice !== undefined && (
        <StatusText tone="info" testId="mdx-editor-notice">
          {notice}
        </StatusText>
      )}

      {saveDialog !== undefined && (
        <SaveArticleDialog
          open
          onClose={() => setSaveDialog(undefined)}
          folders={saveDialog.folders}
          initialFolder={saveDialog.folder}
          initialName={saveDialog.name}
          onSave={(file) => void run({ kind: "write", file, overwrite: file === draft.file })}
          onAddPgn={(folder, files) =>
            void Promise.all(files.map(async (file) => ({ file: file.name, text: await file.text() }))).then((pgns) =>
              run({ kind: "pgn", folder, files: pgns, overwrite: [], into: "dialog" }),
            )
          }
          busy={busy}
          pgnNotice={pgnNotice}
          error={saveError}
        />
      )}
      {addPgnOpen && (
        <AddPgnDialog
          open
          onClose={() => setAddPgnOpen(false)}
          hasFile={draft.file !== ""}
          folder={folder}
          body={draft.body}
          attached={attached}
          onAdd={addPgn}
          onInsert={insertExample}
          busy={busy}
          added={pgnAdded}
          error={addPgnError}
        />
      )}
      <ConfirmDialog
        open={down !== undefined}
        onClose={() => setDown(undefined)}
        onConfirm={() => {
          const step = down;
          setDown(undefined);
          if (step !== undefined) void run(step);
        }}
        title="The storage service is not running"
        message={
          <>
            {`The MDX editor saves through a small local service, and nothing answers at ${STORAGE_URL}. Start it in a terminal at the checkout's root with `}
            <Box component="code" dir="ltr">
              {STORAGE_COMMAND}
            </Box>
            {", then retry."}
          </>
        }
        confirmLabel="Retry"
        cancelLabel="Close"
        testId="mdx-editor-service-down"
      />
      <ConfirmDialog
        open={conflict !== undefined}
        onClose={() => setConflict(undefined)}
        onConfirm={() => {
          const step = conflict?.step;
          setConflict(undefined);
          if (step !== undefined) void run(step);
        }}
        title="Replace a file that is there?"
        message={conflict === undefined ? undefined : `${ARTICLES_DIR}/${conflict.path} is already there. Replace it with this one?`}
        confirmLabel="Replace"
        cancelLabel="Cancel"
        tone="destructive"
        testId="mdx-editor-conflict"
      />

      <Box
        sx={{
          flex: { md: 1 },
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr)" },
          gridTemplateRows: { md: "minmax(0, 1fr)" },
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
          <PanelTabs
            tabs={[
              { id: "content", label: "Content" },
              { id: "metadata", label: "Metadata" },
            ]}
            value={tab}
            onChange={(id) => setTab(id === "metadata" ? "metadata" : "content")}
            size="compact"
            fullWidth={false}
            ariaLabel="What to edit"
            idPrefix="mdx-editor-pane"
            testId="mdx-editor-tabs"
          />
          <Box {...tabPanelProps("mdx-editor-pane", tab)} sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1, minHeight: 0, pt: 1 }}>
            {tab === "content" ? (
              <>
                <Typography component="label" htmlFor={SOURCE_ID} variant="subtitle2">
                  MDX source
                </Typography>
                {pastedFrontmatter && (
                  <InlineAlert severity="info" title="This text starts with a --- block" testId="mdx-editor-pasted-frontmatter">
                    {"That is the file's metadata, which the Metadata tab keeps. "}
                    <Button size="small" onClick={moveFrontmatter} data-testid="mdx-editor-move-frontmatter">
                      Move it to Metadata
                    </Button>
                  </InlineAlert>
                )}
                <Box
                  component="textarea"
                  ref={sourceRef}
                  id={SOURCE_ID}
                  data-testid="mdx-editor-source"
                  dir="ltr"
                  spellCheck={false}
                  value={draft.body}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft({ ...draft, body: event.target.value })}
                  sx={{
                    flex: 1,
                    minHeight: { xs: "50vh", md: 0 },
                    resize: "none",
                    p: 1.5,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                    fontSize: 13,
                    lineHeight: 1.5,
                    tabSize: 2,
                    color: "text.primary",
                    bgcolor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    "&:focus-visible": { outline: 2, outlineStyle: "solid", outlineColor: "primary.main", outlineOffset: 1 },
                  }}
                />
              </>
            ) : (
              <MetadataPane
                yaml={draft.yaml ?? ""}
                onChange={(yaml) => setDraft({ ...draft, yaml })}
                kind={fileName.kind}
                language={fileName.language}
                english={english}
                path={fileName.path}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
            <Typography variant="subtitle2" id="mdx-editor-preview-label">
              Preview
            </Typography>
            <StatusText tone="neutral" testId="mdx-editor-state">
              {pending ? "Compiling…" : error !== undefined ? "Not compiled" : "Up to date"}
            </StatusText>
            <Box sx={{ marginInlineStart: "auto" }}>
              <SwitchField label="Scroll together" checked={scrollTogether} onChange={setScrollTogether} size="small" testId="mdx-editor-scroll-together" />
            </Box>
          </Box>
          <Box
            role="region"
            ref={previewRef}
            aria-labelledby="mdx-editor-preview-label"
            data-testid="mdx-editor-preview"
            sx={{ flex: 1, minHeight: 0, overflowY: { md: "auto" }, p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}
          >
            {error !== undefined && (
              <Box sx={{ mb: 2 }}>
                <InlineAlert severity="error" title="The MDX does not compile" testId="mdx-editor-compile-error">
                  {`${whereOf(error)}${error.message}`}
                  {Content !== undefined && " — showing the last version that did."}
                </InlineAlert>
              </Box>
            )}
            {typeof header.title === "string" && (
              <Box sx={{ mb: 2 }} data-testid="mdx-editor-preview-header">
                <ArticleHeader
                  title={header.title}
                  draft={header.draft === true}
                  date={typeof header.date === "string" ? header.date : undefined}
                  updated={typeof header.updated === "string" ? header.updated : undefined}
                />
              </Box>
            )}
            {Content !== undefined && (
              <PreviewBoundary key={version}>
                <Suspense
                  fallback={
                    <Typography role="status" color="text.secondary">
                      Loading…
                    </Typography>
                  }
                >
                  <Content components={PREVIEW_COMPONENTS} />
                </Suspense>
              </PreviewBoundary>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default MdxEditor;
