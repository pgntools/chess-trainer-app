import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";
import MergeTypeRoundedIcon from "@mui/icons-material/MergeTypeRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { folderTreeRows, type FolderTreeRow } from "../../lib/folderTreeRows";
import { moveCollection, removeCollection } from "../../lib/libraryCollectionStore";
import { isPotentialTournament, readsAsTournament, type CollectionSummary } from "../../lib/libraryCollections";
import {
  BUILT_IN_FOLDER_ID,
  createLibraryFolder,
  moveLibraryFolder,
  removeLibraryFolder,
  renameLibraryFolder,
} from "../../lib/libraryFolderStore";
import { downloadPgn } from "../../lib/pgnExport";
import { slugify } from "../../lib/pgnText";
import { gameFolderChildren, gameFolderPath, gameFolderSubtree, gamesInFolder, type GameFolder } from "../../lib/savedGameFolders";
import { shippedCollections } from "../../lib/shippedCollections";
import { FolderDeleteDialog, FolderMoveDialog, FolderNameDialog } from "../../blocks/dialogs";
import {
  CollectionsTreeTable,
  LIBRARY_TREE_COLUMNS,
  LIBRARY_TREE_DEFAULT_SORT,
  libraryTreeFirstDirection,
  type LibraryEntry,
  type LibraryTreeColumn,
} from "../../blocks/tables";
import { DeleteManyDialog } from "../../design-system/components/dialogs";
import { SearchField } from "../../design-system/components/forms";
import { IconAction, ListScreenHeader } from "../../design-system/components/toolbars";
import { RightPanel } from "../main/rightPanel";
import { useShellCompact } from "../main/shellCompact";
import { useCollectionMerge } from "./useCollectionMerge";
import { loadCollectionGames, useLibraryFolders, useUploadedCollections } from "./useLibraryCollections";
import { useOwnPageHeading } from "../main/pageTitle";

/**
 * **The Library** (`/library`, CTA-75; folders CTA-88) — a file manager's
 * details view of the collections: a table of folders and collections, the
 * folders opening and closing in place (the `CollectionsTreeTable` block on
 * `DataTable`'s tree rows since CTA-113, rows from `lib/folderTreeRows.ts`),
 * under a `ListScreenHeader` and a `SearchField`.
 *
 * - **Built-in** is a fixed top-level folder, always first and open at the
 *   start, holding the shipped collections (wired by `scripts/wirepgn.js`).
 *   It is read-only: nothing is filed in it, and it is not renamed, moved or
 *   deleted. Its collections only download.
 * - **The reader's folders** (`lib/libraryFolderStore.ts`) nest to any depth,
 *   and hold the reader's uploads; an upload whose folder is gone sits at the
 *   top level. Deleting a folder keeps what is in it: its sub-folders and
 *   collections move up to its parent.
 * - **Columns**: Name, Games (a folder's is its whole subtree's), Added (an
 *   upload's date; a folder's creation; a dash for Built-in), and the row's
 *   actions, always visible (CTA-113, the tables' rule). Name, Games and Added sort (`?sort=`,
 *   `?dir=`, history replace, only what is not the default — Name, A to Z);
 *   folders always come before collections at every level.
 * - **A words box** (`?q=`, history replace) keeps the collections and
 *   folders whose name holds it, with the folders above them opened.
 * - **One New folder**, the header's (CTA-231): its name and its parent —
 *   the reader's folders in a picker, the top level by default. A folder's
 *   row makes no sub-folder and takes no upload (the upload screen picks
 *   the folder), and a collection's row has no New job. Beside them, *Merge
 *   collections…* (two or more ticked) opens the merge on the collections
 *   ticked, in that order (`useCollectionMerge`, CTA-232 — a job of the
 *   picks' bar until then).
 *
 * **Listing fetches nothing.** A shipped collection's name and game count are
 * its manifest entry (`src/data/library/manifest.json`); an upload's are its
 * small IndexedDB summary — no index and no game is read to draw this page.
 * The games are read only when a download asks for them.
 */

/** A collection as the tree files it: its folder resolved. */
type Entry = LibraryEntry;

type SortColumn = LibraryTreeColumn;
type Direction = "asc" | "desc";
const SORT_COLUMNS: readonly SortColumn[] = LIBRARY_TREE_COLUMNS;
const DEFAULT_SORT = LIBRARY_TREE_DEFAULT_SORT;
/** Which way a column sorts until the reader turns it: names A to Z, counts and dates high first. */
const defaultDirection = libraryTreeFirstDirection;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** A comparator on one key, missing values last either way, ties to `tie`. */
const byKey =
  <T,>(key: (value: T) => string | number | undefined, direction: Direction, tie: (a: T, b: T) => number) =>
  (a: T, b: T): number => {
    const x = key(a);
    const y = key(b);
    if (x === undefined || y === undefined) return x === y ? tie(a, b) : x === undefined ? 1 : -1;
    const order = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
    return (direction === "asc" ? order : -order) || tie(a, b);
  };

/** A collection's download stem — its name as a file name. */
const stemOf = (name: string, fallback: string) => slugify(name) || fallback;

function LibraryHome() {
  const { t, i18n } = useTranslation();
  // The header's title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  /*
    The right-hand panel, About the Library, folded to the shell's rail on
    arrival (CTA-230, as a collection's filters fold): the table has the room
    until the reader opens it, for this visit only. Under the shell's
    breakpoint there is no rail — the panel is stacked under the table.
  */
  const compact = useShellCompact();
  const [aboutFolded, setAboutFolded] = useState(true);
  // The button pressed is gone once the panel folds or opens: the focus goes on to the one that undoes it.
  const focusAfterFold = useRef<string | null>(null);
  const foldAbout = (folded: boolean) => {
    focusAfterFold.current = folded ? "library-about-rail-expand" : "library-about-collapse";
    setAboutFolded(folded);
  };
  useEffect(() => {
    const target = focusAfterFold.current;
    if (target === null) return;
    focusAfterFold.current = null;
    document.querySelector<HTMLElement>(`[data-testid="${target}"]`)?.focus();
  }, [aboutFolded]);
  const navigate = useNavigate();
  const uploaded = useUploadedCollections();
  const readerFolders = useLibraryFolders();
  // The uploads are placed once both reads have landed, so none flashes at the top level.
  const ready = uploaded !== undefined && readerFolders !== undefined;
  const folders = useMemo(() => readerFolders ?? [], [readerFolders]);

  const builtIn = useMemo<GameFolder>(
    () => ({ id: BUILT_IN_FOLDER_ID, name: t("library.builtIn"), parentId: null, savedAt: "", updatedAt: "" }),
    [t],
  );
  const allFolders = useMemo(() => [builtIn, ...folders], [builtIn, folders]);
  const entries = useMemo<Entry[]>(() => {
    const known = new Set(folders.map((folder) => folder.id));
    return [
      ...shippedCollections.map((entry) => ({ ...entry, folderId: BUILT_IN_FOLDER_ID })),
      ...(ready ? uploaded : []).map((collection) => ({
        ...collection,
        folderId: collection.folderId != null && known.has(collection.folderId) ? collection.folderId : null,
      })),
    ];
  }, [folders, ready, uploaded]);
  const total = shippedCollections.length + (uploaded?.length ?? 0);

  const [params, setParams] = useSearchParams();
  const text = params.get("q") ?? "";
  const needle = text.trim().toLocaleLowerCase();
  const requestedSort = params.get("sort");
  const sort: SortColumn = SORT_COLUMNS.includes(requestedSort as SortColumn)
    ? (requestedSort as SortColumn)
    : DEFAULT_SORT;
  const requestedDirection = params.get("dir");
  const direction: Direction =
    requestedDirection === "asc" || requestedDirection === "desc" ? requestedDirection : defaultDirection(sort);

  const setState = (patch: Record<string, string | null>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === "") next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  /** A new column opens its own way; a second click turns it. The URL keeps only what is not the default. */
  const sortBy = (column: string) => {
    const chosen = column as SortColumn;
    if (chosen !== sort) {
      setState({ sort: chosen === DEFAULT_SORT ? null : chosen, dir: null });
      return;
    }
    const turned: Direction = direction === "asc" ? "desc" : "asc";
    setState({ dir: turned === defaultDirection(chosen) ? null : turned });
  };

  /** The folders the reader opened. Built-in starts open. */
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set([BUILT_IN_FOLDER_ID]));
  /**
   * While filtering, the folders the reader turned against what the filter
   * opened — forgotten when the words change (adjusted during render).
   */
  const [filterTurns, setFilterTurns] = useState<{ needle: string; turned: ReadonlySet<string> }>({
    needle,
    turned: new Set(),
  });
  if (filterTurns.needle !== needle) setFilterTurns({ needle, turned: new Set() });
  const flip = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const toggle = (id: string) => {
    if (needle === "") setOpen((current) => flip(current, id));
    else setFilterTurns((current) => ({ ...current, turned: flip(current.turned, id) }));
  };

  const folderLabel = (folder: GameFolder) => (folder.name === "" ? t("library.folder.untitled") : folder.name);

  const turned = filterTurns.turned;
  const { rows, shownItems } = useMemo(() => {
    const sizeOfFolder = new Map<string, number>();
    for (const folder of allFolders) {
      sizeOfFolder.set(
        folder.id,
        gamesInFolder(entries, allFolders, folder.id).reduce((sum, entry) => sum + entry.count, 0),
      );
    }
    const nameTie = (a: { name: string; id: string }, b: { name: string; id: string }) =>
      collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
    const compareFolders =
      sort === "name"
        ? byKey<GameFolder>((folder) => folder.name, direction, (a, b) => a.id.localeCompare(b.id))
        : sort === "games"
          ? byKey<GameFolder>((folder) => sizeOfFolder.get(folder.id), direction, nameTie)
          : byKey<GameFolder>((folder) => folder.savedAt || undefined, direction, nameTie);
    const compareItems =
      sort === "name"
        ? byKey<Entry>((entry) => entry.name, direction, (a, b) => a.id.localeCompare(b.id))
        : sort === "games"
          ? byKey<Entry>((entry) => entry.count, direction, nameTie)
          : byKey<Entry>((entry) => entry.addedAt, direction, nameTie);
    const matches = (name: string) => name.toLocaleLowerCase().includes(needle);
    return folderTreeRows<Entry>({
      folders: allFolders,
      items: entries,
      isOpen: (id, auto) => (needle === "" ? open.has(id) : auto !== turned.has(id)),
      compareFolders,
      compareItems,
      sizeOf: (entry) => entry.count,
      pinned: [BUILT_IN_FOLDER_ID],
      match:
        needle === ""
          ? undefined
          : { folder: (folder) => matches(folder.name), item: (entry) => matches(entry.name) },
    });
  }, [allFolders, entries, sort, direction, needle, open, turned]);

  // The name dialog: a new folder (its parent picked in it, CTA-231), or a folder renamed.
  const [naming, setNaming] = useState<"new" | { folder: GameFolder } | null>(null);
  const [movingFolder, setMovingFolder] = useState<GameFolder | null>(null);
  const [movingCollection, setMovingCollection] = useState<Entry | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<GameFolder | null>(null);
  // The picked uploads asked about (CTA-232) — the header's Delete; held past the dialog's close so its closing transition keeps the words.
  const [deletingPicks, setDeletingPicks] = useState(false);
  const [deleteAsked, setDeleteAsked] = useState<{ uploads: readonly CollectionSummary[]; builtIn: number }>({ uploads: [], builtIn: 0 });
  const [deleteProblem, setDeleteProblem] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  // The collections picked (CTA-221) — the header's *Merge collections…* opens on them (a direct action since CTA-232).
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  // The ticked collections are the merge's: no picker in its dialog.
  const merge = useCollectionMerge("library-merge", { picker: false });
  // The picked collections, in the list's order: the uploads may be deleted, Built-in's never.
  const pickedEntries = entries.filter((entry) => picked.has(entry.id));
  const pickedUploads = pickedEntries.filter((entry) => entry.source === "uploaded");
  const askDeletePicks = () => {
    setDeleteAsked({ uploads: pickedUploads, builtIn: pickedEntries.length - pickedUploads.length });
    setDeleteProblem(false);
    setDeletingPicks(true);
  };
  /** Every picked upload deleted, one by one; the gone ones unpicked, a refusal said in the dialog. */
  const deletePicks = async () => {
    setDeleteBusy(true);
    const gone = new Set<string>();
    let refused = false;
    for (const collection of deleteAsked.uploads) {
      if ((await removeCollection(collection.id)) === undefined) gone.add(collection.id);
      else refused = true;
    }
    setPicked((current) => new Set([...current].filter((id) => !gone.has(id))));
    setDeleteBusy(false);
    if (refused) {
      setDeleteAsked((asked) => ({ ...asked, uploads: asked.uploads.filter((each) => !gone.has(each.id)) }));
      setDeleteProblem(true);
      return;
    }
    setDeletingPicks(false);
  };

  const collectionsUnder = (folder: GameFolder) => gamesInFolder(entries, allFolders, folder.id);

  const download = async (collection: CollectionSummary) => {
    const games = await loadCollectionGames(collection);
    if (games !== null) downloadPgn(stemOf(collection.name, "collection"), games);
  };

  /** A folder's whole subtree as one `.pgn`, its collections by name. */
  const downloadFolder = async (folder: GameFolder) => {
    const inside = [...collectionsUnder(folder)].sort((a, b) => collator.compare(a.name, b.name));
    const games: string[] = [];
    for (const collection of inside) {
      const read = await loadCollectionGames(collection);
      // A loop, not a spread: a folder can hold tens of thousands of games.
      if (read !== null) for (const game of read) games.push(game);
    }
    if (games.length > 0) downloadPgn(stemOf(folderLabel(folder), "folder"), games);
  };

  /** An empty folder goes at once; one holding anything asks first, saying its contents stay. */
  const startDeleteFolder = (row: FolderTreeRow<Entry> & { kind: "folder" }) => {
    if (row.empty) void removeLibraryFolder(row.folder.id);
    else setDeletingFolder(row.folder);
  };

  const setText = (value: string) => setState({ q: value });
  const hrefOf = (collection: Entry) => `/library/${encodeURIComponent(collection.id)}`;

  return (
    <>
      <Box data-testid="library-screen" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={t("library.title")}
          count={
            // The count keeps the id the Library's tests have always read it by.
            <span data-testid="library-count">
              {needle === "" ? t("library.count", { count: total }) : t("library.shown", { shown: shownItems, count: total })}
            </span>
          }
          actions={
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CreateNewFolderRoundedIcon />}
                onClick={() => setNaming("new")}
                disabled={readerFolders === undefined}
                data-testid="library-new-folder"
              >
                {t("library.folder.newFolder")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadFileRoundedIcon />}
                component={RouterLink}
                to="/library/new"
                data-testid="library-add"
              >
                {t("library.add")}
              </Button>
              {/* Merge and Delete (CTA-232): the ticked collections' — Merge two or more in the order ticked; Delete only while some are ticked. */}
              <Button
                size="small"
                variant="outlined"
                startIcon={<MergeTypeRoundedIcon />}
                onClick={() => merge.open([...picked])}
                disabled={picked.size < 2}
                data-testid="library-header-merge"
              >
                {t("library.picks.merge")}
              </Button>
              {picked.size > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={askDeletePicks}
                  // Built-in collections are read-only: nothing to delete among them alone.
                  disabled={pickedUploads.length === 0}
                  data-testid="library-header-delete"
                >
                  {t("library.picks.delete")}
                </Button>
              )}
            </>
          }
          testId="library-header"
        >
          <SearchField
            label={t("library.filter")}
            value={text}
            onChange={setText}
            clearLabel={t("library.filterClear")}
            testId="library-filter"
          />
        </ListScreenHeader>
        {/* The one region that scrolls: the shell scrolls nothing in the square. */}
        <CollectionsTreeTable
          rows={rows}
          sort={{ column: sort, direction }}
          onSort={sortBy}
          onToggle={toggle}
          collectionLink={(entry) => ({ component: RouterLink, to: hrefOf(entry) })}
          onOpenCollection={(entry) => navigate(hrefOf(entry))}
          builtInFolderId={BUILT_IN_FOLDER_ID}
          actions={{
            onDownloadFolder: (folder) => void downloadFolder(folder),
            onRenameFolder: (folder) => setNaming({ folder }),
            onMoveFolder: setMovingFolder,
            onDeleteFolder: startDeleteFolder,
            onDownloadCollection: (collection) => void download(collection),
            onMoveCollection: setMovingCollection,
          }}
          picks={{
            picked,
            onChange: setPicked,
          }}
          filtered={needle !== ""}
          // CTA-142: from the summaries alone — the list reads no index.
          isTournament={(entry) => readsAsTournament(entry)}
          isPotentialTournament={(entry) => isPotentialTournament(entry)}
          testId="library-collections"
        />
      </Box>
      <RightPanel
        collapsed={aboutFolded}
        rail={
          // Room above the button, as the collection's filters' rail.
          <Box data-testid="library-about-rail" sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 1 }}>
            <IconAction label={t("library.about.expand")} onClick={() => foldAbout(false)} expanded={false} testId="library-about-rail-expand">
              <InfoOutlinedIcon fontSize="small" />
            </IconAction>
          </Box>
        }
      >
        <Box data-testid="library-about" sx={{ display: "grid", gap: 1, alignContent: "start" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2" component="h2" sx={{ flexGrow: 1, fontWeight: 700 }}>
              {t("library.about.title")}
            </Typography>
            {!compact && (
              <IconAction label={t("library.about.collapse")} onClick={() => foldAbout(true)} expanded testId="library-about-collapse">
                {/* Towards the inline end, in the language's direction: the panel is drawn from inside the board's `ForceLTR`. */}
                <KeyboardDoubleArrowRightRoundedIcon
                  fontSize="small"
                  style={i18n.dir() === "rtl" ? { transform: "scaleX(-1)" } : undefined}
                />
              </IconAction>
            )}
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("library.hint")}
          </Typography>
        </Box>
      </RightPanel>
      <FolderNameDialog
        open={naming !== null}
        title={t(naming !== null && naming !== "new" ? "library.folder.renameFolder" : "library.folder.newFolder")}
        initial={naming !== null && naming !== "new" ? naming.folder.name : ""}
        onSave={(name, parentId) => {
          if (naming === null) return;
          if (naming !== "new") {
            void renameLibraryFolder(naming.folder.id, name);
            return;
          }
          void createLibraryFolder(name, parentId).then((made) => {
            // Open the way down to it, so the new folder is in view.
            if (made === undefined || parentId === null) return;
            const chain = gameFolderPath(folders, parentId).map((folder) => folder.id);
            setOpen((current) => new Set([...current, ...chain]));
          });
        }}
        onClose={() => setNaming(null)}
        labels={{ name: t("library.folder.name"), cancel: t("library.folder.cancel"), save: t("library.folder.save") }}
        // A new folder's parent (CTA-231): the reader's folders, the top level by default — Built-in is not one.
        parents={
          naming === "new"
            ? {
                folders,
                labels: { picker: t("library.folder.parent"), none: t("library.folder.topLevel"), untitled: t("library.folder.untitled") },
              }
            : undefined
        }
        testId="library-folder"
      />
      <FolderMoveDialog
        open={movingFolder !== null}
        folders={folders}
        current={movingFolder?.parentId ?? null}
        exclude={movingFolder === null ? undefined : [...gameFolderSubtree(folders, movingFolder.id)]}
        onMove={(parentId) => {
          if (movingFolder !== null) void moveLibraryFolder(movingFolder.id, parentId);
          setMovingFolder(null);
        }}
        onClose={() => setMovingFolder(null)}
        labels={{
          title: t("library.folder.moveFolder"),
          cancel: t("library.folder.cancel"),
          none: t("library.folder.topLevel"),
          untitled: t("library.folder.untitled"),
          picker: t("library.folder.picker"),
        }}
        testId="library-folder"
      />
      <FolderMoveDialog
        open={movingCollection !== null}
        folders={folders}
        current={movingCollection?.folderId ?? null}
        onMove={(folderId) => {
          if (movingCollection !== null) void moveCollection(movingCollection.id, folderId);
          setMovingCollection(null);
        }}
        onClose={() => setMovingCollection(null)}
        labels={{
          title: t("library.folder.moveCollection"),
          cancel: t("library.folder.cancel"),
          none: t("library.folder.topLevel"),
          untitled: t("library.folder.untitled"),
          picker: t("library.folder.picker"),
        }}
        testId="library-collection"
        pickerTestId="library-folder-picker"
      />
      {merge.dialog}
      <FolderDeleteDialog
        open={deletingFolder !== null}
        title={`${t("library.folder.deleteFolder")}: ${deletingFolder?.name ?? ""}`}
        message={t("library.folder.deleteConfirm")}
        counts={t("library.folder.deleteCounts", {
          games: deletingFolder === null ? 0 : collectionsUnder(deletingFolder).length,
          subFolders: deletingFolder === null ? 0 : gameFolderChildren(folders, deletingFolder.id).length,
        })}
        confirmLabel={t("library.folder.deleteFolder")}
        cancelLabel={t("library.folder.cancel")}
        onConfirm={() => {
          if (deletingFolder !== null) void removeLibraryFolder(deletingFolder.id);
        }}
        onClose={() => setDeletingFolder(null)}
        testId="library-folder"
      />
      <DeleteManyDialog
        open={deletingPicks}
        onClose={() => {
          if (!deleteBusy) setDeletingPicks(false);
        }}
        onConfirm={() => void deletePicks()}
        title={
          deleteAsked.uploads.length === 1
            ? t("library.confirmDelete.title", { name: deleteAsked.uploads[0].name })
            : t("library.confirmDelete.titleMany", { count: deleteAsked.uploads.length })
        }
        message={
          <>
            {t("library.confirmDelete.body", { count: deleteAsked.uploads.reduce((sum, each) => sum + each.count, 0) })}
            {deleteAsked.builtIn > 0 && ` ${t("library.confirmDelete.builtInKept", { count: deleteAsked.builtIn })}`}
          </>
        }
        error={deleteProblem ? t("library.confirmDelete.problem") : undefined}
        busy={deleteBusy}
        confirmLabel={t("library.confirmDelete.confirm")}
        cancelLabel={t("library.confirmDelete.cancel")}
        testId="library-delete-dialog"
        confirmTestId="library-delete-confirm"
      />
    </>
  );
}

export default LibraryHome;
