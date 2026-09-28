import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ViewComfyRounded from "@mui/icons-material/ViewComfyRounded";
import ViewListRounded from "@mui/icons-material/ViewListRounded";
import ViewModuleRounded from "@mui/icons-material/ViewModuleRounded";
import { Link as RouterLink, useLocation, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Chessboard } from "react-chessboard";

import { FolderDeleteDialog, FolderMoveDialog, FolderNameDialog } from "../../../../blocks/dialogs";
import { SAVED_LIST_DEFAULT_VIEW, SavedAnalysesList, type SavedListView } from "../../../../blocks/lists";
import { DeleteManyDialog } from "../../../../design-system/components/dialogs";
import { Breadcrumbs } from "../../../../design-system/components/navigation";
import { LoadingLine } from "../../../../design-system/components/states";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES, TablePager } from "../../../../design-system/components/tables";
import { IconAction, ListScreenHeader, SelectionBar, ViewToggle } from "../../../../design-system/components/toolbars";
import { mainlineGame, type GameTree } from "../../../../lib/gameTree";
import { openingOfLine, type OpeningEntry } from "../../../../lib/openings";
import { downloadPgn } from "../../../../lib/pgnExport";
import { slugify } from "../../../../lib/pgnText";
import { savedAnalysisFen, savedAnalysisToTree, type SavedAnalysis } from "../../../../lib/savedAnalyses";
import {
  analysesHere,
  analysesInFolder,
  analysesUnderFolder,
  analysisFolderChildren,
  analysisFolderPath,
  analysisFolderSubtree,
  type AnalysisFolder,
} from "../../../../lib/savedAnalysisFolders";
import {
  createAnalysisFolder,
  moveAnalysisFolder,
  removeAnalysisFolder,
  renameAnalysisFolder,
} from "../../../../lib/savedAnalysisFolderStore";
import { removeSavedAnalyses } from "../../../../lib/savedAnalysisStore";
import { useOwnPageHeading, usePageTitle } from "../../../main/pageTitle";
import { RightPanel } from "../../../main/rightPanel";
import { useBoardSquareOptions } from "../../../shared/boardColors";
import { useOpeningBook } from "../../../shared/useOpeningBook";
import NewAnalysisForm from "./NewAnalysisForm";
import { useAnalysisFolders } from "./useAnalysisFolders";
import { useSavedAnalyses } from "./useSavedAnalyses";

/**
 * **Saved analyses** (`/tools/analysis/saved`) — the analyses the reader has
 * saved on the Analysis Board, newest first, filed into a nested tree of
 * folders, as rows or as preview boards at the saved lists' two card sizes.
 * The right-hand panel is the **new-analysis form** (CTA-87,
 * `NewAnalysisForm.tsx`): the shared position editor and a **Start** that
 * opens the Analysis Board on the edited position.
 *
 * Since CTA-113 it is the design system's composition, and holds only the
 * state: a `ListScreenHeader` (the title the page's `h1`, the count, New,
 * New folder, the `SelectionBar` and the `ViewToggle`), the folder trail
 * (`Breadcrumbs`), the **`SavedAnalysesList`** block (the rows or cards — the
 * repertoires' `RepertoiresList` is its sister, one look) and a
 * `TablePager`. The folder dialogs are the `blocks/dialogs` ones; the bulk
 * delete is `DeleteManyDialog`.
 *
 * - **One destination.** An analysis opens on the Analysis Board
 *   (`?analysis=<id>`) — the Open button on a row, the board itself on a card.
 * - **Its settings, from a gear** on every row and card
 *   (`AnalysisSettingsScreen.tsx`: title, description, side, next-move arrows
 *   and the folder it is filed under).
 * - **Deleting is in bulk, and in every view.** No row or card deletes itself:
 *   each carries a pick — the cards too — so the selection bar shows in all
 *   three views, and switching view keeps the picks.
 * - **A card previews where the reader was standing** — a tree has no final
 *   position, so the record carries that place as SAN from the root
 *   (`lib/savedAnalyses.ts`) — facing the analysis' own side, with the opening
 *   the mainline reached beneath it.
 * - **Folders nest** (`lib/savedAnalysisFolders.ts`): folders first, then this
 *   folder's analyses; create under the folder the reader is in, rename, move
 *   anywhere but its own subtree, delete keeping the contents (an empty
 *   folder at once, otherwise after a confirmation), and download a folder's
 *   whole subtree as one `.pgn`. The folder the reader is standing in is
 *   `?folder=<id>`. **The picks persist across folders**: select-all adds
 *   what is here, and the chip counts the whole picked set.
 * - **A record the store has and cannot parse is still listed**, says so and
 *   can still be picked — to delete it, or to export its stored PGN intact.
 * - **Paged, and parsed a page at a time** (CTA-77; the design system's page
 *   sizes since CTA-113 — 25 / 50 / 100 / 250, 50 by default). The store holds
 *   thousands of analyses (a Library batch is a folder of them), so only the
 *   page on screen is parsed (each record once, kept while it is the stored
 *   one) — the rows, the counts and the picks read the records without
 *   parsing them. The pager shows once a folder holds more than the smallest
 *   page. Until the store's first read lands the screen says it is reading.
 */

/** How many analyses a page shows by default, in every view — the design system's one default. */
export const SAVED_ANALYSES_PAGE = DEFAULT_TABLE_PAGE_SIZE;

/*
  Each record's tree, parsed once and kept while the record is the stored one
  (a write replaces a record, never mutates it) — `null` for one that will not
  parse.
*/
const parsedTrees = new WeakMap<SavedAnalysis, GameTree | null>();
const treeOf = (saved: SavedAnalysis): GameTree | undefined => {
  let tree = parsedTrees.get(saved);
  if (tree === undefined) {
    tree = savedAnalysisToTree(saved) ?? null;
    parsedTrees.set(saved, tree);
  }
  return tree ?? undefined;
};

const boardPath = (saved: SavedAnalysis) => `/tools/analysis?analysis=${encodeURIComponent(saved.id)}`;

/** What the name dialog is open for — a folder made, or renamed. */
type NameDialogState = { mode: "create"; parentId: string | null } | { mode: "rename"; folder: AnalysisFolder } | null;

/** A folder's download stem: its name slugified, else the fixed one. */
const folderStem = (folder: AnalysisFolder): string => slugify(folder.name) || "saved-analyses";

/** The route: the list, once the store's first read has landed. */
function SavedAnalyses() {
  const { t } = useTranslation();
  const analyses = useSavedAnalyses();
  const folders = useAnalysisFolders();
  if (analyses === undefined || folders === undefined) {
    return <LoadingLine testId="saved-analyses-loading">{t("savedAnalyses.loading")}</LoadingLine>;
  }
  return <SavedAnalysesScreen analyses={analyses} folders={folders} />;
}

function SavedAnalysesScreen({ analyses, folders }: { analyses: readonly SavedAnalysis[]; folders: readonly AnalysisFolder[] }) {
  // The header's title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const { t } = useTranslation();
  const location = useLocation();
  const squares = useBoardSquareOptions();
  const [view, setView] = useState<SavedListView>(SAVED_LIST_DEFAULT_VIEW);

  /*
    Where the browser stands: `?folder=<id>`, so a split on the Analysis Board
    lands the reader in its folder and Back walks up. A folder that is not
    there (deleted, here or in another tab) reads as the top level.
  */
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFolder = searchParams.get("folder");
  const currentFolder = requestedFolder === null ? undefined : folders.find((folder) => folder.id === requestedFolder);
  const browseId = currentFolder?.id ?? null;
  usePageTitle(currentFolder === undefined ? undefined : currentFolder.name || t("savedAnalyses.folder.untitled"));
  const openFolder = (id: string | null) => setSearchParams(id === null ? {} : { folder: id });
  const foldersHere = analysisFolderChildren(folders, browseId);
  const crumbs = currentFolder === undefined ? [] : analysisFolderPath(folders, currentFolder.id);
  // Keyed on what the URL asks for: the folder it resolves to is read off the same `folders`.
  const rowsHere = useMemo(
    () => analysesHere(analyses, folders, folders.some((folder) => folder.id === requestedFolder) ? requestedFolder : null),
    [analyses, folders, requestedFolder],
  );

  /* The page on screen — back to the first whenever the reader changes folder. */
  const [paging, setPaging] = useState<{ folder: string | null; page: number; rowsPerPage: number }>({
    folder: browseId,
    page: 0,
    rowsPerPage: SAVED_ANALYSES_PAGE,
  });
  const { rowsPerPage } = paging;
  const pageCount = Math.max(1, Math.ceil(rowsHere.length / rowsPerPage));
  const page = paging.folder === browseId ? Math.min(paging.page, pageCount - 1) : 0;
  const pageRows = useMemo(() => rowsHere.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [rowsHere, page, rowsPerPage]);

  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [moving, setMoving] = useState<AnalysisFolder | null>(null);
  const [deleting, setDeleting] = useState<AnalysisFolder | null>(null);
  const [deletingPicked, setDeletingPicked] = useState(false);
  // The count and the folder asked about, held past the confirm so the
  // dialogs' closing transitions do not read "Delete 0" or lose the name.
  const [askedCount, setAskedCount] = useState(0);
  const [askedFolder, setAskedFolder] = useState<AnalysisFolder | null>(null);

  /*
    The page's trees: the side lines are counted and the node the reader was
    standing on found in them, and a record that will not parse has none.
  */
  const pageTrees = useMemo(() => pageRows.map((saved) => ({ saved, tree: treeOf(saved) })), [pageRows]);

  /*
    Which analyses are picked. Held as a set of ids rather than a flag per
    row, so one deleted — here or in another tab — simply falls out of the
    count: everything below reads the selection *through* `analyses`. The
    picks persist across folders; select-all **adds** the rows here, and
    unchecking it removes just those.
  */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const selected = analyses.filter((saved) => picked.has(saved.id));
  const selectedHere = rowsHere.filter((saved) => picked.has(saved.id));

  const togglePicked = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAllHere = () =>
    setPicked((current) => {
      const next = new Set(current);
      const allPicked = rowsHere.length > 0 && selectedHere.length === rowsHere.length;
      for (const saved of rowsHere) {
        if (allPicked) next.delete(saved.id);
        else next.add(saved.id);
      }
      return next;
    });

  /** One `.pgn` of everything under the folder — the set its count stands for. */
  const downloadFolder = (folder: AnalysisFolder) =>
    downloadPgn(folderStem(folder), analysesInFolder(analyses, folders, folder.id).map((row) => row.pgn));

  /*
    Delete keeps the contents (`removeAnalysisFolder`). Standing inside what is
    deleted, the reader moves to its parent — where its sub-folders went.
  */
  const confirmDelete = (folder: AnalysisFolder) => {
    if (browseId !== null && analysisFolderSubtree(folders, folder.id).has(browseId)) openFolder(folder.parentId);
    void removeAnalysisFolder(folder.id);
  };

  const startDelete = (folder: AnalysisFolder) => {
    const isEmpty = analysesUnderFolder(analyses, folders, folder.id) === 0 && analysisFolderChildren(folders, folder.id).length === 0;
    if (isEmpty) {
      confirmDelete(folder);
      return;
    }
    setAskedFolder(folder);
    setDeleting(folder);
  };

  const book = useOpeningBook();

  /*
    One walk per analysis on the page, memoised on the page and the book. The
    **mainline** is what is named: it is what the analysis is of, where a side
    line is one thing tried inside it.
  */
  const entries = useMemo(
    () =>
      pageTrees.map(({ saved, tree }) => {
        let opening: OpeningEntry | undefined;
        if (book !== null && tree !== undefined) {
          opening = openingOfLine(book.book, book.positions, mainlineGame(tree).moves.map((move) => move.fen));
        }
        return { saved, tree, opening };
      }),
    [pageTrees, book],
  );

  // Save and Cancel on a settings screen come back to this list as it stands.
  const from = `${location.pathname}${location.search}`;
  const folderName = (folder: AnalysisFolder) => folder.name || t("savedAnalyses.folder.untitled");

  return (
    <>
      <Box data-testid="saved-analyses-screen" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={t("savedAnalyses.title")}
          count={t("savedAnalyses.count", { count: analyses.length })}
          wrap
          actions={
            <>
              {/*
                The board this screen's sidebar entry hides (CTA-58): the Analysis
                folder is a single entry to *this* screen, so a fresh board is
                reached from here. No query params — a blank Analysis Board.
              */}
              <Button
                size="small"
                variant="outlined"
                component={RouterLink}
                to="/tools/analysis"
                startIcon={<AddRoundedIcon fontSize="small" />}
                data-testid="saved-analyses-new"
              >
                {t("savedAnalyses.new")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CreateNewFolderRoundedIcon fontSize="small" />}
                data-testid="saved-analyses-new-folder"
                onClick={() => setNameDialog({ mode: "create", parentId: browseId })}
              >
                {t("savedAnalyses.folder.newFolder")}
              </Button>
              {/* The selection bar, in every view: the cards carry picks too. */}
              {analyses.length > 0 && (
                <SelectionBar
                  checked={rowsHere.length > 0 && selectedHere.length === rowsHere.length}
                  indeterminate={selectedHere.length > 0 && selectedHere.length < rowsHere.length}
                  onToggleAll={toggleAllHere}
                  selectAllLabel={t("savedAnalyses.selectAll")}
                  count={selected.length}
                  countLabel={t("savedAnalyses.selected", { count: selected.length })}
                  onClear={() => setPicked(new Set())}
                  clearLabel={t("savedList.clearSelected")}
                  actions={
                    <>
                      <IconAction
                        label={t("savedAnalyses.download")}
                        disabled={selected.length === 0}
                        onClick={() => downloadPgn("chess-trainer-analyses", selected.map((saved) => saved.pgn))}
                        testId="saved-analyses-download"
                      >
                        <DownloadRoundedIcon fontSize="small" />
                      </IconAction>
                      <IconAction
                        label={t("savedAnalyses.deleteSelected")}
                        disabled={selected.length === 0}
                        onClick={() => {
                          setAskedCount(selected.length);
                          setDeletingPicked(true);
                        }}
                        testId="saved-analyses-delete"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconAction>
                    </>
                  }
                  testId="saved-analyses"
                />
              )}
              {/* Switching view keeps the picks: every view has them. */}
              <ViewToggle<SavedListView>
                value={view}
                onChange={setView}
                options={[
                  { value: "list", label: t("savedAnalyses.view.list"), icon: <ViewListRounded fontSize="small" /> },
                  { value: "compact", label: t("savedAnalyses.view.compact"), icon: <ViewComfyRounded fontSize="small" /> },
                  { value: "comfortable", label: t("savedAnalyses.view.comfortable"), icon: <ViewModuleRounded fontSize="small" /> },
                ]}
                ariaLabel={t("savedAnalyses.view.label")}
                testId="saved-analyses-view"
              />
            </>
          }
          testId="saved-analyses"
        />

        {currentFolder !== undefined && (
          <Box sx={{ flexShrink: 0, py: 0.5 }}>
            <Breadcrumbs
              ariaLabel={t("savedList.breadcrumb")}
              crumbs={[
                { id: "root", label: t("savedAnalyses.folder.root"), onClick: () => openFolder(null) },
                ...crumbs.slice(0, -1).map((crumb) => ({ id: crumb.id, label: folderName(crumb), onClick: () => openFolder(crumb.id) })),
              ]}
              current={folderName(currentFolder)}
              currentTestId={`saved-analyses-breadcrumb-${currentFolder.id}`}
              testId="saved-analyses-breadcrumb"
            />
          </Box>
        )}

        {/*
          The one region that scrolls. Folders first, then this folder's
          analyses: the reader drills into a folder, they do not scroll past it.
        */}
        <SavedAnalysesList
          view={view}
          folders={foldersHere.map((folder) => ({ folder, count: analysesUnderFolder(analyses, folders, folder.id) }))}
          entries={entries}
          picked={picked}
          onTogglePick={togglePicked}
          openLink={(saved) => ({ component: RouterLink, to: boardPath(saved) })}
          settingsLink={(saved) => ({
            component: RouterLink,
            to: `/tools/analysis/saved/${encodeURIComponent(saved.id)}/settings`,
            state: { from },
          })}
          onOpenFolder={openFolder}
          folderActions={{
            onDownload: downloadFolder,
            onRename: (folder) => setNameDialog({ mode: "rename", folder }),
            onMove: setMoving,
            onDelete: startDelete,
          }}
          preview={({ saved, tree }) => (
            <Box sx={{ width: "100%", aspectRatio: "1 / 1" }}>
              <Chessboard
                options={{
                  ...squares,
                  // `options.id` is unique on the page: this screen shows many boards at once.
                  id: `saved-analyses-preview-${saved.id}`,
                  position: savedAnalysisFen(saved, tree),
                  boardOrientation: saved.orientation,
                  allowDragging: false,
                  allowDrawingArrows: false,
                  showNotation: false,
                }}
              />
            </Box>
          )}
          empty={
            browseId === null
              ? { label: t("savedAnalyses.empty"), testId: "saved-analyses-empty" }
              : { label: t("savedAnalyses.folder.empty"), testId: "saved-analyses-folder-empty" }
          }
          testId="saved-analyses"
        />

        {rowsHere.length > TABLE_PAGE_SIZES[0] && (
          <TablePager
            count={rowsHere.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(next) => setPaging({ folder: browseId, page: next, rowsPerPage })}
            onRowsPerPageChange={(rows) => setPaging({ folder: browseId, page: 0, rowsPerPage: rows })}
            labelRowsPerPage={t("savedAnalyses.rowsPerPage")}
            testId="saved-analyses-pagination"
          />
        )}
      </Box>

      <RightPanel>
        <NewAnalysisForm />
      </RightPanel>

      <FolderNameDialog
        open={nameDialog !== null}
        title={
          nameDialog === null
            ? ""
            : nameDialog.mode === "create"
              ? t("savedAnalyses.folder.newFolder")
              : t("savedAnalyses.folder.renameFolder")
        }
        initial={nameDialog === null || nameDialog.mode === "create" ? "" : nameDialog.folder.name}
        onSave={(name) => {
          if (nameDialog === null) return;
          if (nameDialog.mode === "create") void createAnalysisFolder(name, nameDialog.parentId);
          else void renameAnalysisFolder(nameDialog.folder.id, name);
        }}
        onClose={() => setNameDialog(null)}
        labels={{
          name: t("savedAnalyses.folder.name"),
          cancel: t("savedAnalyses.folder.cancel"),
          save: t("savedAnalyses.folder.save"),
        }}
        testId="analysis-folder"
      />
      <FolderMoveDialog
        open={moving !== null}
        folders={folders}
        current={moving?.parentId ?? null}
        exclude={moving === null ? undefined : [...analysisFolderSubtree(folders, moving.id)]}
        onMove={(newParentId) => {
          if (moving !== null) void moveAnalysisFolder(moving.id, newParentId);
          setMoving(null);
        }}
        onClose={() => setMoving(null)}
        labels={{
          title: t("savedAnalyses.folder.moveFolder"),
          cancel: t("savedAnalyses.folder.cancel"),
          none: t("savedAnalyses.folder.topLevel"),
          untitled: t("savedAnalyses.folder.untitled"),
          picker: t("savedAnalyses.folder.picker"),
        }}
        testId="analysis-folder"
      />
      <DeleteManyDialog
        open={deletingPicked}
        onClose={() => setDeletingPicked(false)}
        onConfirm={() => {
          // One write for the lot; the picks go with them.
          void removeSavedAnalyses(selected.map((saved) => saved.id));
          setPicked(new Set());
          setDeletingPicked(false);
        }}
        title={t("savedAnalyses.bulkDelete.title", { count: askedCount })}
        message={t("savedAnalyses.bulkDelete.text")}
        confirmLabel={t("savedAnalyses.bulkDelete.confirm")}
        cancelLabel={t("savedAnalyses.folder.cancel")}
        testId="saved-analyses-delete-dialog"
        titleTestId="saved-analyses-delete-title"
        cancelTestId="saved-analyses-delete-cancel"
        confirmTestId="saved-analyses-delete-confirm"
      />
      <FolderDeleteDialog
        open={deleting !== null}
        title={`${t("savedAnalyses.folder.deleteFolder")}: ${askedFolder === null ? "" : folderName(askedFolder)}`}
        message={t("savedAnalyses.folder.deleteConfirm")}
        counts={t("savedAnalyses.folder.deleteCounts", {
          games: askedFolder === null ? 0 : analysesUnderFolder(analyses, folders, askedFolder.id),
          subFolders: askedFolder === null ? 0 : analysisFolderChildren(folders, askedFolder.id).length,
        })}
        confirmLabel={t("savedAnalyses.folder.deleteFolder")}
        cancelLabel={t("savedAnalyses.folder.cancel")}
        onConfirm={() => {
          if (deleting !== null) confirmDelete(deleting);
        }}
        onClose={() => setDeleting(null)}
        testId="analysis-folder"
      />
    </>
  );
}

export default SavedAnalyses;
