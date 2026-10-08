import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveAsRoundedIcon from "@mui/icons-material/SaveAsRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SyncProblemRoundedIcon from "@mui/icons-material/SyncProblemRounded";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import VerticalSplitRoundedIcon from "@mui/icons-material/VerticalSplitRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import WidgetsRoundedIcon from "@mui/icons-material/WidgetsRounded";

import { ConfirmDialog } from "../../design-system/components/dialogs";
import { AnchoredMenu } from "../../design-system/components/menus";
import { ActionBar, IconAction, ViewToggle } from "../../design-system/components/toolbars";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { SwitchField } from "../../design-system/components/forms";
import { PanelTabs, tabPanelProps } from "../../design-system/components/tabs";
import { articleFileName, joinFrontmatter, parseFrontmatterYaml, splitFrontmatter } from "../../lib/articleFrontmatter";
import { downloadTextFile } from "../../lib/pgnExport";
import { ArticleHeader } from "../../views/blog/ArticleHeader";
import { findBlogArticle } from "../../views/blog/articles";
import { ARTICLE_MAX_WIDTH_PX } from "../../views/main/routeHandle";
import { folderOf, loadArticleSource } from "./articleSources";
import { MetadataPane } from "./MetadataPane";
import { PreviewBoundary } from "./mdxPreview";
import { PREVIEW_COMPONENTS, useCompiled, whereOf } from "./useCompiled";
import ComponentsDialog from "./ComponentsDialog";
import ImagesDialog, { type ImageToAdd } from "./ImagesDialog";
import { elementOf, elementsIn } from "./componentSettings";
import PgnsDialog, { type PgnToAdd } from "./PgnsDialog";
import { componentOf, insertedBlock } from "./componentCatalog";
import { withoutElement } from "./contentElements";
import { articleAssetsOf, articlePgnsOf, usesOf, withImageImport, withInlinePgn, withInlinePgnText, withoutPgn, withPgnImports, withRenamedPgn } from "./pgnImports";
import { BIG_PGN_BYTES, pgnBytesOf, sizeOf } from "./pgnPages";
import { starterFrontmatter, todayIso } from "./metadataYaml";
import DeleteArticleDialog from "./DeleteArticleDialog";
import GitStatusDialog from "./GitStatusDialog";
import SaveArticleDialog from "./SaveArticleDialog";
import { STARTER_DOCUMENT } from "./starterDocument";
import { ARTICLES_DIR, base64Of, deleteStorageFiles, GIT_STATE_WORDS, listStorageFolders, STORAGE_COMMAND, STORAGE_URL, unsyncedFoldersOf, writeStorageFile, type StorageFolder } from "./storageClient";
import { useGitStatus } from "./useGitStatus";
import { useScrollSync } from "./useScrollSync";

/**
 * **The MDX editor** (`/dev/mdx-editor/edit`; its lobby, the articles, is
 * `/dev/mdx-editor`) — an article's MDX on the
 * left, rendered on the right as the Blog renders it: the same components
 * (`views/home/frontPage/index.ts`), named with no `import`, reading the same
 * Library, repertoires and stored games. It is compiled in the browser
 * (`compileMdx.ts`) a moment after typing stops.
 *
 * - **A document that will not compile** keeps the last one that did on the
 *   right, under the error and where it is. **A component that throws** (a
 *   prop it cannot read) is caught there, and the next compile tries again.
 * - **An article** is opened from the lobby's Edit (`?article=<file>`,
 *   which `Main` hands in as `arrivingArticle`); its
 *   `import games from "./x.pgn?raw"` reads the file beside it.
 * - **Content and Metadata** (CTA-135): a file opens split in two — its
 *   body in the Content tab, its frontmatter in the Metadata tab
 *   (`MetadataPane`: a form, or the YAML, checked as the build checks it) —
 *   and Copy and Download join them back into one `.mdx`. The preview draws
 *   the article's header from the metadata, as the article's page does. A
 *   new article starts as a draft, dated today.
 * - **What it shows** (CTA-137): a toggle at the end of the header's
 *   second row — the code alone, both side by side (the default), or the
 *   preview alone, a lone pane centred as wide as a Blog article
 *   (`ARTICLE_MAX_WIDTH_PX`); a pane out of view is hidden, not unmounted.
 * - **The panes scroll together** (`useScrollSync.ts`) while "Scroll
 *   together" is on, both are shown and the Content tab is open: scrolling
 *   either brings the other to the same block.
 * - **The header** (CTA-137): the title, and the actions in one toolbar at
 *   its inline end — what goes into the content, a section each (PGNs,
 *   Components, Images — below), then where it goes (Save as…, Save), the
 *   rest under More (New article,
 *   Copy MDX, Download .mdx, Delete article… — `DeleteArticleDialog`: the
 *   file, its translations with it, the PGN files only it imports if
 *   chosen, and whether git can bring them back); under it, the file being edited, whether it
 *   has unsaved changes, whether git has it as it is, how many article
 *   files git has not got (`GitStatusDialog`, the service's read-only
 *   `git status`, refreshed on focus and after every write), and where its
 *   imports resolve from.
 * - **Saving** (CTA-137) goes through a local storage service,
 *   `yarn mdx-editor:start` (`../server/storageServer.ts`, called through
 *   `storageClient.ts`), which writes into `src/views/blog/articles/`. Save
 *   writes an opened article over its own file; a new article, or Save as,
 *   asks where (`SaveArticleDialog`: a folder, or a new sub-folder, and a
 *   name), and Save as somewhere else writes a new file, leaving the first
 *   alone. Writing over another file asks first; a service that is not
 *   running is a dialog naming the command. Nothing is moved or deleted.
 *   The **Save** button is enabled only while the document changed, never
 *   while a save is in flight (CTA-161) — and **Ctrl+S / ⌘S** takes the same
 *   step, but never while a dialog is open, which owns what happens next.
 * - **The sections — PGNs, Components, Images** (CTA-137, CTA-139): a
 *   dialog each (`SectionDialog`), the article's items of that kind listed
 *   at the inline start (the one the caret is in chosen first; none, and it
 *   opens on Add), the chosen one's editor beside it — edit it in place,
 *   remove it (asked first), **show it in the content** (the dialog closes,
 *   the caret goes to it in the MDX source, scrolled into view) — and an
 *   Add entry last, without leaving the dialog. A PGN and the components
 *   that show it are apart, as one PGN can feed several components.
 *   **PGNs** (`PgnsDialog`) reads the article's PGNs from the content
 *   (`articlePgnsOf`): one is renamed (its definition and every `pgn={…}`
 *   reading it, `withRenamedPgn`), its text edited when it is inline (up to
 *   100 KB; a file's is shown, read only), handed to Components; one is
 *   added — uploaded or pasted — as a file beside the article, written by
 *   the service and imported (`import <name> from "./<file>.pgn?raw"`; an
 *   article with no folder yet is saved first), or inline, written into
 *   the content as `export const <name> = \`…\`` (up to 100 KB).
 *   **Components** (`ComponentsDialog`) lists the catalog's components in
 *   the content (`componentsIn`), each edited as a form beside its code
 *   over the component rendered; Add takes one of the PGNs, or a Library
 *   game by its address, then a component that fits it
 *   (`componentCatalog.ts`), inserted at the caret. **Images**
 *   (`ImagesDialog`) lists the `<ArticleImage>`s, each its settings as a
 *   form, removed with its import once nothing reads it (the file stays);
 *   Add writes an image beside the article, its alt text asked for, and
 *   shows it where the caret is. The preview reads a PGN or an image just
 *   written at once.
 *   Copy and Download still give the text without the service. The draft is
 *   kept for the tab's session, so a reload or a visit to another screen
 *   keeps it.
 */


const DRAFT_KEY = "chessapp.dev.mdxEditor.draft";
const SOURCE_ID = "mdx-editor-source";

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
  /** An image beside the article, shown where the caret is — Images' Add an image. */
  | { kind: "image"; image: ImageToAdd; overwrite: boolean }
  /** The article being edited, its translations and the PGN files chosen, deleted — Delete article. */
  | { kind: "delete"; paths: string[] }
  /**
   * PGNs into `folder`, beside the article, which imports them at once;
   * `overwrite` names the ones the reader agreed to replace.
   */
  | { kind: "pgn"; folder: string; files: PgnFile[]; overwrite: readonly string[] };

/** A PGN to write: its file's name, its text, and — from PGNs' Add a PGN — the name the article binds it to. */
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

/** What the notice says was done, as an icon — by the words it starts with, an info icon for anything else (a refusal, a file not found). */
const NOTICE_ICONS: readonly [RegExp, typeof InfoOutlinedIcon][] = [
  [/^Opened /, FolderOpenRoundedIcon],
  [/^Saved /, CheckCircleOutlineRoundedIcon],
  [/^Started a new article/, NoteAddOutlinedIcon],
  [/^Copied /, ContentCopyRoundedIcon],
  [/^Downloaded /, DownloadRoundedIcon],
  [/^Inserted /, WidgetsRoundedIcon],
  [/^Added \S+\.(?:png|jpe?g|webp|gif) /i, AddPhotoAlternateOutlinedIcon],
  [/^Updated /, TuneRoundedIcon],
  [/^Renamed /, DriveFileRenameOutlineRoundedIcon],
  [/^(Added |Wrote the PGN)/, UploadFileRoundedIcon],
  [/^(Removed|Deleted) /, DeleteOutlineRoundedIcon],
  [/^Moved the /, DriveFileMoveOutlinedIcon],
];

function NoticeIcon({ notice }: { notice: string }) {
  const Icon = NOTICE_ICONS.find(([words]) => words.test(notice))?.[1] ?? InfoOutlinedIcon;
  return <Icon fontSize="small" aria-hidden />;
}

type MdxEditorProps = {
  /** An article file to open on arrival — `tournaments/olympiad-2026`, `get-started.he` — replacing the draft. */
  arrivingArticle?: string;
  /** Start a new article on arrival — the lobby's New article (`?new`); a draft with changes is asked about first. */
  arrivingNew?: boolean;
  /** Called once that file is open (or found missing), or the new article started, so the address can drop it. */
  onArrived?: () => void;
};

function MdxEditor({ arrivingArticle, arrivingNew = false, onArrived }: MdxEditorProps = {}) {
  const [kept] = useState(readKept);
  const [draft, setDraft] = useState<Draft>(() => (kept === undefined ? starterDraft() : { yaml: kept.yaml, body: kept.body, file: kept.file }));
  const [opened, setOpened] = useState(() => kept?.opened ?? textOf(draft));
  const [notice, setNotice] = useState<string>();
  /** What git has not got of the articles — read by the service, refreshed after every write. */
  const git = useGitStatus();
  const [gitOpen, setGitOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  /**
   * The section open — PGNs, Components or Images — and where the caret was
   * when it opened: the item it sits in is chosen first, and what is added
   * goes there (then after what was added). `add` opens it on Add, with
   * `pgn` chosen for a component (PGNs' "Add a component with it").
   */
  const [section, setSection] = useState<{ kind: "pgns" | "components" | "images"; caret: number; add?: boolean; pgn?: string }>();
  /** What the last action in the open section came to — said in it, as the notice says it. */
  const [sectionMessage, setSectionMessage] = useState<string>();
  /** A component or an image just put in, by where it starts — its section's list moves to it. */
  const [picked, setPicked] = useState<{ seq: number; start: number }>();
  const [imageError, setImageError] = useState<string>();
  const gitFiles = git.status?.kind === "status" ? git.status.files : undefined;
  const fileInGit = draft.file === "" || gitFiles === undefined ? undefined : (gitFiles.find((candidate) => candidate.path === `${draft.file}.mdx`)?.state ?? "committed");
  /** The header's More menu — the button it hangs from while open. */
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [scrollTogether, setScrollTogether] = useState(true);
  const [tab, setTab] = useState<"content" | "metadata">("content");
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  /** Show in the content: where the caret goes, and the line it is on — done once the source is on screen. */
  const [reveal, setReveal] = useState<{ start: number; line: number }>();
  const previewRef = useRef<HTMLDivElement>(null);
  /** What the panes show: the code alone, both side by side, or the preview alone. */
  const [view, setView] = useState<"code" | "split" | "preview">("split");
  useScrollSync({ enabled: scrollTogether && tab === "content" && view === "split", source: sourceRef, preview: previewRef });
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

  // Show in the content: the caret on the item, its line scrolled to a third of the way down (the preview follows, scrolling together).
  useEffect(() => {
    const textarea = sourceRef.current;
    if (reveal === undefined || textarea === null) return;
    textarea.focus();
    textarea.setSelectionRange(reveal.start, reveal.start);
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight);
    textarea.scrollTop = Math.max(0, reveal.line * (Number.isNaN(lineHeight) ? 19.5 : lineHeight) - textarea.clientHeight / 3);
  }, [reveal]);

  /** A file's text opened: split in two, and "changed" measured from it as the editor would write it back. */
  const open = (text: string, file: string) => {
    const next = draftOf(text, file);
    setDraft(next);
    setOpened(textOf(next));
  };

  // Arriving from the lobby's Edit: that article replaces the draft — the reader asked for it.
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

  // Arriving from the lobby's New article: the starter replaces the draft — asked about first if the draft has changes.
  useEffect(() => {
    if (!arrivingNew) return;
    let live = true;
    void Promise.resolve().then(() => {
      if (!live) return;
      if (textOf(draft) === opened || window.confirm("Start a new article? The changes in the editor will be lost.")) {
        open(textOf(starterDraft()), "");
        setNotice("Started a new article.");
      }
      onArrived?.();
    });
    return () => {
      live = false;
    };
    // Once, on arrival: the draft as it is then is what is asked about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivingNew, onArrived]);

  const dirty = source !== opened;
  const replace = (text: string, file: string, message: string) => {
    if (dirty && !window.confirm("Replace the text in the editor? Its changes will be lost.")) return;
    open(text, file);
    setNotice(message);
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
  /** The step the service was down for — retried from its dialog. */
  const [down, setDown] = useState<SaveStep>();
  /** A file already there, and the step that writes over it. */
  const [conflict, setConflict] = useState<{ path: string; step: SaveStep }>();

  // PGNs (CTA-137, CTA-139): what its last add came to.
  const [pgnAdded, setPgnAdded] = useState<{ seq: number; name: string; message: string }>();
  const [addPgnError, setAddPgnError] = useState<string>();
  /** A PGN file PGNs' Add holds while an article with no folder yet is saved — then written beside it, and imported. */
  const [heldPgn, setHeldPgn] = useState<{ name: string; fileName: string; text: string; overwrite: boolean }>();

  const refused = (message: string) => (section?.kind === "pgns" ? setAddPgnError(message) : saveDialog === undefined ? setNotice(message) : setSaveError(message));

  /** What was done, said in the header's notice and in the open section. */
  const report = (message: string) => {
    setNotice(message);
    setSectionMessage(message);
  };

  /** A section opened fresh — nothing said in it yet — on the caret as it is now. */
  const openSection = (kind: "pgns" | "components" | "images", extra: { add?: boolean; pgn?: string } = {}) => {
    setSectionMessage(undefined);
    setAddPgnError(undefined);
    setImageError(undefined);
    setSection((before) => ({ kind, caret: before?.caret ?? sourceRef.current?.selectionStart ?? draft.body.length, ...extra }));
  };

  /** Show in the content: the section closed, the source on screen with the caret on `start`. */
  const show = (start: number) => {
    setSection(undefined);
    setTab("content");
    setView((before) => (before === "preview" ? "split" : before));
    setReveal({ start, line: draft.body.slice(0, start).split("\n").length - 1 });
  };

  const openSaveDialog = async () => {
    const listed = await listStorageFolders();
    if (listed.kind === "down") return setDown({ kind: "save-as" });
    if (listed.kind === "refused") return setNotice(listed.message);
    setSaveError(undefined);
    setSaveDialog({
      folders: listed.folders,
      folder: folderOf(draft.file),
      name: draft.file === "" ? slugOf(header.title) : (draft.file.split("/").at(-1) ?? ""),
    });
  };

  const write = async (file: string, overwrite: boolean) => {
    setBusy(true);
    // A PGN file PGNs' Add holds for an article with no folder yet: beside it, now that it has one.
    let held: { file: string; name: string } | undefined;
    if (heldPgn !== undefined) {
      const path = pathIn(folderOf(file), heldPgn.fileName);
      const written = await writeStorageFile(path, heldPgn.text, heldPgn.overwrite);
      if (written.kind !== "written") {
        setBusy(false);
        if (written.kind === "down") return setDown({ kind: "write", file, overwrite });
        if (written.kind === "refused") return refused(written.message);
        // There already: asked about, and on Replace the whole save goes again, writing over it.
        setHeldPgn({ ...heldPgn, overwrite: true });
        return setConflict({ path, step: { kind: "write", file, overwrite } });
      }
      setAttached((before) => ({ ...before, [path]: heldPgn.text }));
      // Written: a retry of the save (the article's own file asked about) writes it again without asking.
      setHeldPgn({ ...heldPgn, overwrite: true });
      held = { file: heldPgn.fileName, name: heldPgn.name };
    }
    // A PGN put where the article is going is imported by it.
    const pgns = held === undefined ? [] : [held];
    const { body, imports } = withPgnImports(draft.body, pgns);
    const text = textOf({ ...draft, body });
    const result = await writeStorageFile(`${file}.mdx`, text, overwrite);
    setBusy(false);
    if (result.kind === "down") return setDown({ kind: "write", file, overwrite });
    if (result.kind === "exists") return setConflict({ path: result.path, step: { kind: "write", file, overwrite: true } });
    if (result.kind === "refused") return refused(result.message);
    // The draft is now that file's: "changed" counts from what was written.
    setDraft((current) => ({ ...current, file, body: pgns.length === 0 ? current.body : body }));
    setOpened(text);
    setSaveDialog(undefined);
    git.refresh();
    const made = result.foldersCreated.length === 0 ? "" : ` — and made ${result.foldersCreated.map((folder) => `${folder}/`).join(", ")} with an index.mdx`;
    const imported = imports.length === 0 ? "" : ` It imports ${imports.map((pgn) => `${pgn.file} as ${pgn.name}`).join(", ")}.`;
    setNotice(`Saved ${ARTICLES_DIR}/${result.path}${made}.${imported}`);
    if (held !== undefined) {
      // PGNs' Add, step 2, on the PGN it held.
      const name = imports.find((pgn) => pgn.file === held.file)?.name ?? held.name;
      const message = `Saved the article as ${result.path}, and added ${pathIn(folderOf(file), held.file)} beside it — imported as ${name}.`;
      setHeldPgn(undefined);
      setSectionMessage(message);
      setPgnAdded((before) => ({ seq: (before?.seq ?? 0) + 1, name, message }));
    }
  };

  /** PGNs into `folder`, one by one — stopping at the first the service will not take, to go on from there. */
  const addPgns = async (step: Extract<SaveStep, { kind: "pgn" }>) => {
    const { folder, files, overwrite } = step;
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
    git.refresh();
    const paths = added.map((pgn) => pgn.path).join(", ");
    // The article imports what was attached to it, at once.
    const entries = added.map((pgn) => (pgn.name === undefined ? pgn.file : { file: pgn.file, name: pgn.name }));
    const { imports } = withPgnImports(draft.body, entries);
    setDraft((current) => ({ ...current, body: withPgnImports(current.body, entries).body }));
    const message = `Added ${paths} — imported as ${imports.map((pgn) => pgn.name).join(", ")}: give it to a component as pgn={${imports[0].name}}.`;
    report(message);
    setAddPgnError(undefined);
    setPgnAdded((before) => ({ seq: (before?.seq ?? 0) + 1, name: imports[0].name, message }));
  };

  /** A PGN from PGNs' Add a PGN: written beside the article and imported, or written into the content. */
  const addPgn = ({ how, name, fileName, text }: PgnToAdd) => {
    if (how === "file" && draft.file === "") {
      // No folder for the file yet: the article is saved first, and the PGN goes beside it (`write`).
      setHeldPgn({ name, fileName, text, overwrite: false });
      return void openSaveDialog();
    }
    if (how === "file") return void run({ kind: "pgn", folder, files: [{ file: fileName, text, name }], overwrite: [] });
    // Never a big PGN inline: the dialog offers none, and this holds it whatever asks.
    if (pgnBytesOf(text) > BIG_PGN_BYTES) return setNotice(`A PGN over ${sizeOf(BIG_PGN_BYTES)} goes in as a file beside the article, not inline.`);
    setDraft((current) => ({ ...current, body: withInlinePgn(current.body, name, text) }));
    const message = `Wrote the PGN into the content as ${name}: give it to a component as pgn={${name}}.`;
    report(message);
    setPgnAdded((before) => ({ seq: (before?.seq ?? 0) + 1, name, message }));
  };

  /** A PGN taken out of the content — its import or its inline block. A file stays on disk: nothing is deleted. */
  const removePgn = (name: string) => {
    const pgn = articlePgnsOf(draft.body).find((candidate) => candidate.name === name);
    if (pgn === undefined) return;
    const uses = usesOf(draft.body, name);
    if (uses > 0 && !window.confirm(`The content uses ${name} ${uses === 1 ? "once" : `${uses} times`} — remove the PGN anyway? What reads it will not render.`)) return;
    setDraft((current) => ({ ...current, body: withoutPgn(current.body, name) }));
    report(pgn.kind === "file" ? `Removed ${name} from the content — ${pgn.file} stays beside the article.` : `Removed ${name}, written in, from the content.`);
  };

  /** A PGN bound under another name — its definition and every `pgn={…}` that reads it. */
  const renamePgn = (from: string, to: string) => {
    const uses = usesOf(draft.body, from);
    setDraft((current) => ({ ...current, body: withRenamedPgn(current.body, from, to) }));
    report(`Renamed ${from} to ${to}${uses === 0 ? "" : `, and the ${uses === 1 ? "one use" : `${uses} uses`} of it`}.`);
  };

  /** An inline PGN's new text — never over 100 KB, which goes in as a file. */
  const updatePgnText = (name: string, text: string) => {
    if (pgnBytesOf(text) > BIG_PGN_BYTES) return report(`A PGN over ${sizeOf(BIG_PGN_BYTES)} goes in as a file beside the article, not inline.`);
    setDraft((current) => ({ ...current, body: withInlinePgnText(current.body, name, text) }));
    report(`Updated ${name}'s text.`);
  };

  /** The section's caret moved past what was just put in, so the next goes after it; and the list moved to it. */
  const putIn = (start: number, code: string) => {
    setSection((before) => (before === undefined ? before : { ...before, caret: start + code.length }));
    setPicked((before) => ({ seq: (before?.seq ?? 0) + 1, start }));
  };

  /** An example from Components' Add, put into the content where the caret was. */
  const insertExample = (code: string) => {
    const inserted = insertedBlock(draft.body, section?.caret ?? draft.body.length, code);
    setDraft((current) => ({ ...current, body: inserted.body }));
    putIn(inserted.start, code);
    report(`Inserted ${code.split(/[\s>]/)[0]}> into the content.`);
  };

  /** An element's new markup — a component's, an image's — in place of the old. */
  const applyElement = (start: number, end: number, code: string, message: string) => {
    setDraft((current) => ({ ...current, body: `${current.body.slice(0, start)}${code}${current.body.slice(end)}` }));
    report(message);
  };

  /** An element taken out of the content, asked about first — and `importName`'s import once nothing else reads it. */
  const removeElement = (start: number, end: number, question: string, message: (importGone: boolean) => string, importName?: string) => {
    if (!window.confirm(question)) return;
    const body = withoutElement(draft.body, start, end, importName);
    setDraft((current) => ({ ...current, body }));
    report(message(importName !== undefined && !articleAssetsOf(body).some((asset) => asset.name === importName)));
  };

  /**
   * Files deleted — the article being edited and what goes with it. The
   * text stays in the editor, an article with no file and unsaved, so Save
   * as can put it back.
   */
  const deleteFiles = async (paths: string[]) => {
    setBusy(true);
    const result = await deleteStorageFiles(paths);
    setBusy(false);
    if (result.kind === "down") return setDown({ kind: "delete", paths });
    if (result.kind === "refused") return setNotice(result.message);
    setDeleteOpen(false);
    setDraft((current) => ({ ...current, file: "" }));
    setOpened("");
    git.refresh();
    setNotice(`Deleted ${result.paths.join(", ")} — the text stays in the editor, unsaved, until you start a new article.`);
  };

  /**
   * An image written beside the article, as a PGN file is, and shown where
   * the caret is: its import at the top (`withImageImport`; a file the
   * article imports already keeps its name), its `<ArticleImage>` — as
   * the dialog set it — in place. The preview shows it at once, from the
   * file itself.
   */
  const addImage = async (step: Extract<SaveStep, { kind: "image" }>) => {
    const { image, overwrite } = step;
    const path = pathIn(folder, image.fileName);
    setBusy(true);
    const result = await writeStorageFile(path, await base64Of(image.file), overwrite, "base64");
    setBusy(false);
    if (result.kind === "down") return setDown(step);
    if (result.kind === "exists") return setConflict({ path, step: { ...step, overwrite: true } });
    if (result.kind === "refused") return setImageError(result.message);
    setAttached((before) => ({ ...before, [path]: URL.createObjectURL(image.file) }));
    git.refresh();
    // A file the article imports already keeps the name it has there.
    const name = articleAssetsOf(draft.body).find((asset) => asset.file === `./${image.fileName}`)?.name ?? image.name;
    const code = image.code.replace(`src={${image.name}}`, `src={${name}}`);
    const inserted = insertedBlock(draft.body, section?.caret ?? draft.body.length, code);
    const body = withImageImport(inserted.body, name, image.fileName);
    setDraft((current) => ({ ...current, body }));
    // Its import may have gone in above it: where it starts now.
    putIn(elementsIn(body, "ArticleImage").find((element) => element.start >= inserted.start && element.code === code)?.start ?? inserted.start, code);
    setImageError(undefined);
    report(`Added ${path} and showed it where the cursor was.`);
  };

  const run = (step: SaveStep) => {
    if (step.kind === "save") return draft.file === "" ? openSaveDialog() : write(draft.file, true);
    if (step.kind === "save-as") return openSaveDialog();
    if (step.kind === "write") return write(step.file, step.overwrite);
    if (step.kind === "delete") return deleteFiles(step.paths);
    if (step.kind === "image") return addImage(step);
    return addPgns(step);
  };

  /** A dialog open somewhere in the editor — a section's, the save dialogue, a confirmation. */
  const dialogOpen = saveDialog !== undefined || section !== undefined || deleteOpen || gitOpen || down !== undefined || conflict !== undefined;

  /**
   * **Ctrl+S / ⌘S saves** (CTA-161), as the button does: one document-level
   * keydown listener, added once and removed on unmount, reading the latest
   * editor through a ref (`useBoardKeys`'s pattern) so it is never
   * re-registered. The browser's own save-page behaviour is prevented
   * whatever state the editor is in; the save itself runs only on a changed
   * document with no save in flight, and never while a dialog is open —
   * the dialog owns what happens next, so a key press under one cannot
   * save twice. (Alt is left out: Ctrl+Alt is another layout's AltGr.)
   */
  const saveKey = useRef({ dirty, busy, dialogOpen, run });
  useLayoutEffect(() => {
    saveKey.current = { dirty, busy, dialogOpen, run };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "s" || (!event.ctrlKey && !event.metaKey) || event.altKey) return;
      // Never the browser's save-page dialogue, whether the save runs or not.
      event.preventDefault();
      const { dirty, busy, dialogOpen, run } = saveKey.current;
      if (!dirty || busy || dialogOpen) return;
      void run({ kind: "save" });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const { Content, error, pending, version } = compiled;
  return (
    <Box data-testid="mdx-editor" sx={{ height: { md: "100%" }, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* The header: the title and the actions, then what is being edited. */}
      <Box component="header" data-testid="mdx-editor-header" sx={{ flexShrink: 0, display: "grid", gap: 1, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, letterSpacing: "-0.01em", flexGrow: 1 }}>
            MDX editor
          </Typography>
          <ActionBar justify="end" ariaLabel="The article" testId="mdx-editor-actions">
            {/* What goes into the content — a section each. */}
            <Button size="small" variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => openSection("pgns")} disabled={busy} data-testid="mdx-editor-pgns">
              PGNs
            </Button>
            <Button size="small" variant="outlined" startIcon={<WidgetsRoundedIcon />} onClick={() => openSection("components")} disabled={busy} data-testid="mdx-editor-components">
              Components
            </Button>
            <Button size="small" variant="outlined" startIcon={<PhotoLibraryOutlinedIcon />} onClick={() => openSection("images")} disabled={busy} data-testid="mdx-editor-images">
              Images
            </Button>
            <Box aria-hidden sx={{ alignSelf: "stretch", borderInlineStart: 1, borderColor: "divider", mx: 0.5, my: 0.5 }} />
            {/* Where it goes. */}
            <Button size="small" startIcon={<SaveAsRoundedIcon />} onClick={() => void run({ kind: "save-as" })} disabled={busy} data-testid="mdx-editor-save-as">
              Save as…
            </Button>
            <Button size="small" variant="contained" disableElevation startIcon={<SaveRoundedIcon />} onClick={() => void run({ kind: "save" })} disabled={busy || !dirty} aria-keyshortcuts="Control+S" data-testid="mdx-editor-save">
              Save
            </Button>
            <IconAction label="More" onClick={(event) => setMoreAnchor(event.currentTarget)} popupOpen={moreAnchor !== null} testId="mdx-editor-more">
              <MoreVertRoundedIcon />
            </IconAction>
            <AnchoredMenu
              anchorEl={moreAnchor}
              onClose={() => setMoreAnchor(null)}
              entries={[
                {
                  id: "reset",
                  label: "New article",
                  icon: <RestartAltRoundedIcon fontSize="small" />,
                  onClick: () => replace(textOf(starter), "", "Started a new article."),
                  disabled: draft.file === "" && source === textOf(starter),
                },
                { id: "copy", label: "Copy MDX", icon: <ContentCopyRoundedIcon fontSize="small" />, onClick: () => void copy() },
                { id: "download", label: "Download .mdx", icon: <DownloadRoundedIcon fontSize="small" />, onClick: download },
                // Only an article with a file of its own; asked about first.
                { id: "delete", label: "Delete article…", icon: <DeleteOutlineRoundedIcon fontSize="small" />, onClick: () => setDeleteOpen(true), disabled: draft.file === "" || busy },
              ]}
              testId="mdx-editor-more-menu"
              entryTestIdPrefix="mdx-editor"
            />
          </ActionBar>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1 }}>
          <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "grid", gap: 0.25, justifyItems: "start" }}>
            <Box data-testid="mdx-editor-editing" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5, rowGap: 0.5, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, color: "text.secondary" }}>
                <DescriptionOutlinedIcon fontSize="small" aria-hidden />
                {draft.file === "" ? (
                  <Typography variant="body2">A new article — not saved yet</Typography>
                ) : (
                  <Typography variant="body2" sx={{ minWidth: 0 }}>
                    {"Editing "}
                    <Box component="code" dir="ltr" title={`src/views/blog/articles/${draft.file}.mdx`} sx={{ color: "text.primary", fontWeight: 600 }}>
                      {`${draft.file}.mdx`}
                    </Box>
                  </Typography>
                )}
              </Box>
              <StatusText tone={dirty ? "warning" : "success"} testId="mdx-editor-dirty">
                {dirty ? "● Unsaved changes" : "No changes"}
              </StatusText>
              {fileInGit !== undefined && (
                <StatusText tone={fileInGit === "committed" ? "neutral" : "info"} testId="mdx-editor-git-file">
                  {fileInGit === "committed" ? "In git" : `Git: ${GIT_STATE_WORDS[fileInGit]}`}
                </StatusText>
              )}
              <Typography variant="body2" color="text.secondary">
                {"Imports resolve from "}
                <Box component="code" dir="ltr">{`articles/${folder === "" ? "" : `${folder}/`}`}</Box>
              </Typography>
            </Box>
            {/* Under what is being edited: what git has not got of the articles, and what was done last. */}
            {((gitFiles !== undefined && gitFiles.length > 0) || notice !== undefined) && (
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 0.5, minWidth: 0 }}>
                {gitFiles !== undefined && gitFiles.length > 0 && (
                  <Button size="small" color="warning" startIcon={<SyncProblemRoundedIcon />} onClick={() => setGitOpen(true)} sx={{ px: 0.5, minWidth: 0 }} data-testid="mdx-editor-git">
                    {`${gitFiles.length === 1 ? "1 file" : `${gitFiles.length} files`} not synced`}
                  </Button>
                )}
                {notice !== undefined && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, color: "info.main" }}>
                    <NoticeIcon notice={notice} />
                    <StatusText tone="info" testId="mdx-editor-notice">
                      {notice}
                    </StatusText>
                  </Box>
                )}
              </Box>
            )}
          </Box>
          {/* What the panes show — at the row's end, opposite what is being edited. */}
          <Box sx={{ marginInlineStart: "auto" }}>
            <ViewToggle
              value={view}
              onChange={setView}
              options={[
                { value: "code", label: "Code only", icon: <CodeRoundedIcon fontSize="small" /> },
                { value: "split", label: "Code and preview, side by side", icon: <VerticalSplitRoundedIcon fontSize="small" /> },
                { value: "preview", label: "Preview only", icon: <VisibilityRoundedIcon fontSize="small" /> },
              ]}
              ariaLabel="What the editor shows"
              testId="mdx-editor-view"
            />
          </Box>
        </Box>
      </Box>

      {saveDialog !== undefined && (
        <SaveArticleDialog
          open
          onClose={() => {
            setSaveDialog(undefined);
            // Not saved, so a PGN held for it goes nowhere.
            setHeldPgn(undefined);
          }}
          folders={saveDialog.folders}
          initialFolder={saveDialog.folder}
          initialName={saveDialog.name}
          unsynced={gitFiles === undefined ? undefined : unsyncedFoldersOf(gitFiles)}
          onSave={(file) => void run({ kind: "write", file, overwrite: file === draft.file })}
          busy={busy}
          error={saveError}
        />
      )}
      {section?.kind === "pgns" && (
        <PgnsDialog
          open
          onClose={() => setSection(undefined)}
          hasFile={draft.file !== ""}
          folder={folder}
          body={draft.body}
          attached={attached}
          caret={section.caret}
          startOnAdd={section.add}
          onAdd={addPgn}
          onRemove={removePgn}
          onRename={renamePgn}
          onUpdateText={updatePgnText}
          onShow={show}
          onAddComponent={(pgn) => openSection("components", { add: true, pgn })}
          busy={busy}
          added={pgnAdded}
          error={addPgnError}
          message={sectionMessage}
        />
      )}
      {deleteOpen && draft.file !== "" && (
        <DeleteArticleDialog open onClose={() => setDeleteOpen(false)} file={draft.file} body={draft.body} gitFiles={gitFiles} onDelete={(paths) => void run({ kind: "delete", paths })} busy={busy} />
      )}
      {section?.kind === "images" && (
        <ImagesDialog
          open
          onClose={() => setSection(undefined)}
          hasFile={draft.file !== ""}
          folder={folder}
          body={draft.body}
          attached={attached}
          caret={section.caret}
          onAdd={(image) => void run({ kind: "image", image, overwrite: false })}
          // The section stays open under the save dialog: saved, the image can go in.
          onSaveFirst={() => void run({ kind: "save-as" })}
          onApply={(start, end, code) => applyElement(start, end, code, "Updated the image's settings.")}
          onRemove={({ start, end, src, file }) =>
            removeElement(
              start,
              end,
              `Remove the image ${file} from the content? The file stays beside the article.`,
              (importGone) => `Removed the image ${file} from the content${importGone ? ", and its import" : ""} — the file stays beside the article.`,
              src,
            )
          }
          onShow={show}
          busy={busy}
          error={imageError}
          picked={picked}
          message={sectionMessage}
        />
      )}
      <GitStatusDialog open={gitOpen} onClose={() => setGitOpen(false)} status={git.status} onRefresh={git.refresh} />
      {section?.kind === "components" && (
        <ComponentsDialog
          open
          onClose={() => setSection(undefined)}
          folder={folder}
          body={draft.body}
          attached={attached}
          caret={section.caret}
          startOnAdd={section.add}
          initialPgn={section.pgn}
          onInsert={insertExample}
          onApply={(start, end, code) => applyElement(start, end, code, `Updated <${elementOf(code)?.component ?? componentOf(code) ?? "the component"}> in the content.`)}
          onRemove={({ component, start, end }) => removeElement(start, end, `Remove <${component}> from the content?`, () => `Removed <${component}> from the content.`)}
          onShow={show}
          onAddPgn={() => openSection("pgns", { add: true })}
          picked={picked}
          message={sectionMessage}
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
          // One pane alone: a centred column as wide as a Blog article's.
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: view === "split" ? "minmax(0, 1fr) minmax(0, 1fr)" : `minmax(0, ${ARTICLE_MAX_WIDTH_PX}px)` },
          justifyContent: "center",
          gridTemplateRows: { md: "minmax(0, 1fr)" },
          gap: 2,
        }}
      >
        {/* A pane out of view is hidden, not unmounted: the text keeps its undo and its scroll, the preview its compile. */}
        <Box sx={{ display: view === "preview" ? "none" : "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
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

        <Box sx={{ display: view === "code" ? "none" : "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
            <Typography variant="subtitle2" id="mdx-editor-preview-label">
              Preview
            </Typography>
            <StatusText tone="neutral" testId="mdx-editor-state">
              {pending ? "Compiling…" : error !== undefined ? "Not compiled" : "Up to date"}
            </StatusText>
            {view === "split" && (
              <Box sx={{ marginInlineStart: "auto" }}>
                <SwitchField label="Scroll together" checked={scrollTogether} onChange={setScrollTogether} size="small" testId="mdx-editor-scroll-together" />
              </Box>
            )}
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
