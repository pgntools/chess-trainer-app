import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { Link as RouterLink, useNavigate } from "react-router";

import { ConfirmDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { SearchField } from "../../design-system/components/forms";
import { LabelChip } from "../../design-system/components/tables";
import { IconAction, ListScreenHeader, SelectionBar } from "../../design-system/components/toolbars";
import { DataTable, type DataTableColumn } from "../../design-system/patterns/tables";
import { APP_PAGES_FOLDER, isAppPagePath } from "../../lib/articleFrontmatter";
import { loadArticleSource } from "./articleSources";
import DeleteArticleDialog from "./DeleteArticleDialog";
import DeletePicksDialog from "./DeletePicksDialog";
import { deletionPlanOf } from "./deletionPlan";
import { sizeOf } from "./pgnPages";
import {
  ARTICLES_DIR,
  deleteStorageFiles,
  GIT_STATE_WORDS,
  listStorageFolders,
  readImporters,
  STORAGE_COMMAND,
  type ArticleFacts,
  type GitFile,
  type StorageFolder,
} from "./storageClient";
import { useGitStatus } from "./useGitStatus";

const ID = "mdx-lobby";
/** An image beside an article. */
const IMAGE = /\.(?:png|jpe?g|webp|gif)$/i;

/** One row of the lobby: a folder, an article file (an English article, a translation or a folder's index), or a PGN file. */
type LobbyRow =
  | { kind: "folder"; path: string; title: string; depth: number; open: boolean; articles: number }
  | { kind: "article"; path: string; file: string; name: string; facts: ArticleFacts; translation: boolean; index: boolean; depth: number }
  | { kind: "pgn"; path: string; name: string; depth: number }
  | { kind: "image"; path: string; name: string; depth: number };

type LobbyColumn = "name" | "title" | "date" | "git";

const parentOf = (path: string) => path.split("/").slice(0, -1).join("/");
const join = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);
/** `tournaments/olympiad-2026.he` → `tournaments/olympiad-2026`; `tournaments/index` → `tournaments`. */
const blogPathOf = (file: string) => file.replace(/\.[a-z]{2}$/, "").replace(/(^|\/)index$/, "");
/** Where a row opens in the app: an in-app page (CTA-159) at its own address — `app-pages/privacy` → `/privacy` — the rest on the Blog. */
const appAddressOf = (path: string): string =>
  path === APP_PAGES_FOLDER ? "/blog" : path.startsWith(`${APP_PAGES_FOLDER}/`) ? `/${path.slice(APP_PAGES_FOLDER.length + 1)}` : path === "" ? "/blog" : `/blog/${path}`;

/**
 * The folders and files as rows — a folder's sub-folders, then its index,
 * its articles (each followed by its translations), then its PGN files —
 * a folder's contents present only while it is open, or, filtered, every
 * row that matches and the folders on the way down to it.
 */
const rowsOf = (folders: readonly StorageFolder[], open: ReadonlySet<string>, needle: string): LobbyRow[] => {
  const matches = (text: string) => needle === "" || text.toLowerCase().includes(needle);
  const rows: LobbyRow[] = [];
  const articlesUnder = (path: string): number =>
    folders.filter((folder) => folder.path === path || folder.path.startsWith(`${path}/`) || path === "").reduce((sum, folder) => sum + folder.files.filter((file) => file.endsWith(".mdx")).length, 0);
  /** Whether anything under `path` matches the filter. */
  const holdsMatch = (path: string): boolean =>
    folders.some(
      (folder) =>
        (folder.path === path || folder.path.startsWith(`${path}/`)) &&
        (matches(folder.path) || matches(folder.title ?? "") || folder.files.some((file) => matches(join(folder.path, file)) || matches(folder.articles?.[file]?.title ?? ""))),
    );
  const walk = (path: string, depth: number) => {
    const folder = folders.find((candidate) => candidate.path === path);
    for (const child of folders.filter((candidate) => candidate.path !== "" && parentOf(candidate.path) === path).sort((a, b) => (a.title ?? a.path).localeCompare(b.title ?? b.path))) {
      if (!holdsMatch(child.path)) continue;
      const isOpen = needle !== "" || open.has(child.path);
      rows.push({ kind: "folder", path: child.path, title: child.title ?? child.path.split("/").at(-1) ?? child.path, depth, open: isOpen, articles: articlesUnder(child.path) });
      if (isOpen) walk(child.path, depth + 1);
    }
    if (folder === undefined) return;
    const mdx = folder.files.filter((file) => file.endsWith(".mdx"));
    const english = mdx.filter((file) => !/\.[a-z]{2}\.mdx$/.test(file)).sort((a, b) => (a === "index.mdx" ? -1 : b === "index.mdx" ? 1 : a.localeCompare(b)));
    for (const name of english) {
      const stem = name.replace(/\.mdx$/, "");
      for (const file of [name, ...mdx.filter((candidate) => candidate.startsWith(`${stem}.`) && candidate !== name).sort()]) {
        const path = join(folder.path, file);
        const facts = folder.articles?.[file] ?? {};
        if (!matches(path) && !matches(facts.title ?? "")) continue;
        rows.push({ kind: "article", path, file: path.replace(/\.mdx$/, ""), name: file, facts, translation: file !== name, index: stem === "index", depth });
      }
    }
    for (const name of folder.files.filter((file) => file.endsWith(".pgn")).sort()) {
      const path = join(folder.path, name);
      if (matches(path)) rows.push({ kind: "pgn", path, name, depth });
    }
    for (const name of folder.files.filter((file) => IMAGE.test(file)).sort()) {
      const path = join(folder.path, name);
      if (matches(path)) rows.push({ kind: "image", path, name, depth });
    }
  };
  walk("", 0);
  return rows;
};

/**
 * **The MDX editor's lobby** (CTA-137, `/dev/mdx-editor`) — the Blog's files
 * as they are on disk (the storage service's listing), as the Library lists
 * its collections: a tree of folders that open and shut, each row its
 * article's title and date, a draft marked, and a warning where git has not
 * got it as it is. Each row's actions: an article's Edit (the editor),
 * its page on the Blog and Delete (`DeleteArticleDialog`, as in the
 * editor); a PGN's or an image's Delete, saying which articles import it; a folder's page
 * on the Blog. Rows are ticked to delete several together — folders whole,
 * articles with their translations — one confirmation naming every file
 * (`DeletePicksDialog`, `deletionPlan.ts`). New article starts one in the
 * editor.
 */
function ArticlesLobby() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<StorageFolder[]>();
  const [problem, setProblem] = useState<string>();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [needle, setNeedle] = useState("");
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  /** The article being asked about, with its text (what PGN files it imports). */
  const [deletingArticle, setDeletingArticle] = useState<{ file: string; body: string }>();
  /** The PGN file being asked about, with the articles importing it. */
  const [deletingPgn, setDeletingPgn] = useState<{ path: string; importers: string[] | undefined }>();
  /** The picked rows — `folder:<path>`, `article:<path>`, `pgn:<path>` — and the confirmation of deleting them. */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [askingPicks, setAskingPicks] = useState(false);
  const [picksError, setPicksError] = useState<string>();
  const git = useGitStatus();
  const gitFiles = git.status?.kind === "status" ? git.status.files : undefined;
  const gitOf = (path: string): GitFile | undefined => gitFiles?.find((candidate) => candidate.path === path);
  /** A folder holding a file git has not got. */
  const folderUnsynced = (path: string) => gitFiles?.some((candidate) => candidate.path.startsWith(`${path}/`)) === true;

  const load = useCallback(() => {
    void listStorageFolders().then((listed) => {
      if (listed.kind === "folders") {
        setFolders(listed.folders);
        setProblem(undefined);
      } else setProblem(listed.kind === "down" ? `The storage service is not running — start the editor with ${STORAGE_COMMAND}.` : listed.message);
    });
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(() => (folders === undefined ? [] : rowsOf(folders, open, needle.trim().toLowerCase())), [folders, open, needle]);
  const articles = folders?.reduce((sum, folder) => sum + folder.files.filter((file) => file.endsWith(".mdx")).length, 0) ?? 0;
  const toggle = (path: string) =>
    setOpen((before) => {
      const next = new Set(before);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const deleteFiles = async (paths: string[]) => {
    setBusy(true);
    const result = await deleteStorageFiles(paths);
    setBusy(false);
    if (result.kind !== "deleted") {
      setNotice(result.kind === "down" ? `The storage service is not running — start the editor with ${STORAGE_COMMAND}.` : result.message);
      return;
    }
    setDeletingArticle(undefined);
    setDeletingPgn(undefined);
    setNotice(`Deleted ${result.paths.join(", ")}.`);
    load();
    git.refresh();
  };

  /** The picks deleted — folders whole, articles with their translations, PGN files — then the picks cleared. */
  const deletePicks = async () => {
    if (folders === undefined) return;
    const plan = deletionPlanOf(picked, folders);
    setBusy(true);
    const result = await deleteStorageFiles(plan.files, plan.folders);
    setBusy(false);
    if (result.kind !== "deleted") {
      setPicksError(result.kind === "down" ? `The storage service is not running — start the editor with ${STORAGE_COMMAND}.` : result.message);
      return;
    }
    setAskingPicks(false);
    setPicked(new Set());
    const folderWords = result.folders.length === 0 ? "" : ` and ${result.folders.length === 1 ? "1 folder" : `${result.folders.length} folders`} (${result.folders.map((folder) => `${folder}/`).join(", ")})`;
    setNotice(`Deleted ${result.paths.length === 1 ? "1 file" : `${result.paths.length} files`}${folderWords}.`);
    load();
    git.refresh();
  };

  const askDeleteArticle = async (file: string) => setDeletingArticle({ file, body: (await loadArticleSource(file)) ?? "" });
  const askDeletePgn = async (path: string) => {
    setDeletingPgn({ path, importers: undefined });
    const importers = await readImporters(path);
    setDeletingPgn((before) => (before?.path === path ? { path, importers: importers ?? [] } : before));
  };

  const columns: DataTableColumn<LobbyRow, LobbyColumn>[] = [
    {
      id: "name",
      header: "Name",
      render: (row) => {
        const Icon = row.kind === "folder" ? FolderRoundedIcon : row.kind === "pgn" ? TableChartOutlinedIcon : row.kind === "image" ? ImageOutlinedIcon : row.translation ? TranslateRoundedIcon : ArticleOutlinedIcon;
        const unsynced = row.kind === "folder" ? folderUnsynced(row.path) : gitOf(row.path) !== undefined;
        return (
          <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <Box component="span" aria-hidden sx={{ display: "flex", flexShrink: 0, color: "text.secondary" }}>
              <Icon fontSize="small" />
            </Box>
            <Box component="span" dir="ltr" title={row.path} sx={{ fontWeight: row.kind === "folder" ? 600 : 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.kind === "folder" ? `${row.path.split("/").at(-1)}/` : row.name}
            </Box>
            {unsynced && <WarningAmberRounded fontSize="small" titleAccess="Not synced with git" sx={{ color: "warning.main", flexShrink: 0 }} />}
            {row.kind === "article" && row.facts.draft === true && <LabelChip label="Draft" tone="warning" testId={`${ID}-draft-${row.path}`} />}
          </Box>
        );
      },
    },
    {
      id: "title",
      header: "Title",
      render: (row) =>
        row.kind === "folder" ? (
          <Box component="span" dir="auto">{`${row.title} · ${row.articles === 1 ? "1 file" : `${row.articles} files`}`}</Box>
        ) : row.kind === "article" ? (
          <Box component="span" dir="auto" sx={{ color: row.index ? "text.secondary" : undefined }}>
            {row.facts.title ?? "—"}
            {row.index ? " (the folder's page)" : ""}
          </Box>
        ) : (
          <Box component="span" sx={{ color: "text.secondary" }}>
            {row.kind === "pgn" ? "PGN" : "Image"}
          </Box>
        ),
    },
    {
      id: "date",
      header: "Date",
      dir: "ltr",
      render: (row) => (row.kind === "article" && row.facts.date !== undefined ? <time dateTime={row.facts.date}>{row.facts.date}</time> : "—"),
    },
    {
      id: "git",
      header: "Git",
      render: (row) => {
        if (gitFiles === undefined) return "—";
        if (row.kind === "folder") return folderUnsynced(row.path) ? "not synced" : "in git";
        const file = gitOf(row.path);
        return file === undefined ? "in git" : `${GIT_STATE_WORDS[file.state]}${file.bytes !== undefined && row.kind !== "article" ? `, ${sizeOf(file.bytes)}` : ""}`;
      },
    },
  ];

  const rowActions = (row: LobbyRow) => {
    if (row.kind === "folder") {
      return (
        <IconAction label={`Open ${row.title} ${isAppPagePath(row.path) ? "in the app" : "on the Blog"}`} link={{ component: RouterLink, to: appAddressOf(row.path) }} testId={`${ID}-blog-${row.path}`}>
          <OpenInNewRoundedIcon fontSize="small" />
        </IconAction>
      );
    }
    if (row.kind === "pgn" || row.kind === "image") {
      return (
        <IconAction label={`Delete ${row.path}`} onClick={() => void askDeletePgn(row.path)} disabled={busy} testId={`${ID}-delete-${row.path}`}>
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconAction>
      );
    }
    const blogPath = blogPathOf(row.file);
    return (
      <Box sx={{ display: "flex", gap: 0.25 }}>
        <IconAction label={`Edit ${row.path}`} link={{ component: RouterLink, to: `/dev/mdx-editor/edit?article=${encodeURIComponent(row.file)}` }} testId={`${ID}-edit-${row.path}`}>
          <EditNoteRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction label={`Open ${row.path} ${isAppPagePath(row.path) ? "in the app" : "on the Blog"}`} link={{ component: RouterLink, to: appAddressOf(blogPath) }} testId={`${ID}-blog-${row.path}`}>
          <OpenInNewRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction label={`Delete ${row.path}`} onClick={() => void askDeleteArticle(row.file)} disabled={busy} testId={`${ID}-delete-${row.path}`}>
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconAction>
      </Box>
    );
  };

  return (
    <Box data-testid={ID} sx={{ height: { md: "100%" }, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <ListScreenHeader
        title="Articles"
        count={folders === undefined ? undefined : `${articles} article files`}
        actions={
          <Button size="small" variant="contained" disableElevation startIcon={<NoteAddOutlinedIcon />} component={RouterLink} to="/dev/mdx-editor/edit?new" data-testid={`${ID}-new`}>
            New article
          </Button>
        }
        testId={`${ID}-header`}
      />
      <Typography variant="body2" color="text.secondary">
        {"The Blog's files as they are on disk, under "}
        <Box component="code" dir="ltr">{`${ARTICLES_DIR}/`}</Box>
        {" — a warning where git has not got one as it is."}
      </Typography>
      {notice !== undefined && (
        <StatusText tone="info" testId={`${ID}-notice`}>
          {notice}
        </StatusText>
      )}
      {problem !== undefined ? (
        <InlineAlert severity="warning" title="The articles cannot be listed" testId={`${ID}-problem`}>
          {problem}
        </InlineAlert>
      ) : (
        <Box sx={{ flex: { md: 1 }, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
            <Box sx={{ flex: "0 1 360px", minWidth: 220 }}>
              <SearchField value={needle} onChange={setNeedle} placeholder="Find a file or a title" clearLabel="Clear the search" testId={`${ID}-search`} />
            </Box>
            <SelectionBar
              count={picked.size}
              countLabel={`${picked.size} selected`}
              onClear={() => setPicked(new Set())}
              clearLabel="Clear the selection"
              actions={
                <IconAction
                  label="Delete the selected"
                  onClick={() => {
                    setPicksError(undefined);
                    setAskingPicks(true);
                  }}
                  disabled={picked.size === 0 || busy}
                  testId={`${ID}-delete-picked`}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconAction>
              }
              testId={`${ID}-selection`}
            />
          </Box>
          <DataTable<LobbyRow, LobbyColumn>
            columns={columns}
            rows={rows}
            rowId={(row) => `${row.kind}:${row.path}`}
            sorted
            hint="Arrow keys to move between rows, Enter to open a folder or edit an article; tick rows to delete them together"
            picks={{
              picked,
              onChange: setPicked,
              selectAllLabel: "Select all the rows shown",
              pickLabel: (row) => `Select ${row.kind === "folder" ? `the folder ${row.path}/` : row.path}`,
            }}
            tree={{
              depth: (row) => row.depth,
              open: (row) => (row.kind === "folder" ? row.open : undefined),
              onToggle: (row) => {
                if (row.kind === "folder") toggle(row.path);
              },
              toggleLabel: (row, isOpen) => `${isOpen ? "Close" : "Open"} ${row.path}`,
            }}
            onRowClick={(row) => (row.kind === "folder" ? toggle(row.path) : row.kind === "article" ? navigate(`/dev/mdx-editor/edit?article=${encodeURIComponent(row.file)}`) : undefined)}
            rowLink={(row) => (row.kind === "article" ? { component: RouterLink, to: `/dev/mdx-editor/edit?article=${encodeURIComponent(row.file)}` } : undefined)}
            linkColumn="name"
            rowTestId={(row) => `${ID}-row-${row.path}`}
            rowActions={rowActions}
            actionsLabel="Actions"
            loading={folders === undefined}
            loadingLabel="Reading the articles…"
            emptyLabel={needle === "" ? "No article yet." : "Nothing matches."}
            filtered={needle !== ""}
            density="dense"
            stickyHeader
            ariaLabel="The Blog's articles"
            testId={`${ID}-table`}
          />
        </Box>
      )}

      {askingPicks && folders !== undefined && (
        <DeletePicksDialog
          open
          onClose={() => setAskingPicks(false)}
          plan={deletionPlanOf(picked, folders)}
          gitFiles={gitFiles}
          onConfirm={() => void deletePicks()}
          busy={busy}
          error={picksError}
        />
      )}
      {deletingArticle !== undefined && (
        <DeleteArticleDialog
          open
          onClose={() => setDeletingArticle(undefined)}
          file={deletingArticle.file}
          body={deletingArticle.body}
          gitFiles={gitFiles}
          onDelete={(paths) => void deleteFiles(paths)}
          busy={busy}
        />
      )}
      <ConfirmDialog
        open={deletingPgn !== undefined}
        onClose={() => setDeletingPgn(undefined)}
        onConfirm={() => deletingPgn !== undefined && void deleteFiles([deletingPgn.path])}
        title={deletingPgn?.path.endsWith(".pgn") === false ? "Delete the image?" : "Delete the PGN file?"}
        message={
          deletingPgn === undefined ? undefined : (
            <>
              {"This deletes "}
              <Box component="code" dir="ltr">{`${ARTICLES_DIR}/${deletingPgn.path}`}</Box>
              {" from the disk."}
            </>
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="destructive"
        busy={busy}
        confirmDisabled={deletingPgn?.importers === undefined}
        width="sm"
        testId={`${ID}-delete-pgn`}
      >
        {deletingPgn !== undefined && (
          <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
            {deletingPgn.importers === undefined ? (
              <Typography role="status" variant="body2" color="text.secondary">
                Asking which articles import it…
              </Typography>
            ) : deletingPgn.importers.length > 0 ? (
              <InlineAlert severity="warning" title="Articles import it" testId={`${ID}-delete-pgn-importers`}>
                {`${deletingPgn.importers.join(", ")} ${deletingPgn.importers.length === 1 ? "imports" : "import"} it — without it, ${deletingPgn.importers.length === 1 ? "that article fails" : "those articles fail"} to build.`}
              </InlineAlert>
            ) : (
              <StatusText tone="neutral" testId={`${ID}-delete-pgn-unused`}>
                No article imports it.
              </StatusText>
            )}
            {gitOf(deletingPgn.path)?.state === "new" && (
              <InlineAlert severity="warning" title="Not in git — gone for good" testId={`${ID}-delete-pgn-not-in-git`}>
                It has never been committed: once deleted, nothing can bring it back.
              </InlineAlert>
            )}
          </Box>
        )}
      </ConfirmDialog>
    </Box>
  );
}

export default ArticlesLobby;
