import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import ViewComfyRounded from "@mui/icons-material/ViewComfyRounded";
import ViewListRounded from "@mui/icons-material/ViewListRounded";
import ViewModuleRounded from "@mui/icons-material/ViewModuleRounded";
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Chessboard, type ChessboardOptions } from "react-chessboard";

import { FolderDeleteDialog, FolderNameDialog } from "../../blocks/dialogs";
import { RepertoiresList, SAVED_LIST_DEFAULT_VIEW, type SavedListView } from "../../blocks/lists";
import { DeleteManyDialog } from "../../design-system/components/dialogs";
import { BackButton } from "../../design-system/components/navigation";
import { IconAction, ListScreenHeader, SelectionBar, ViewToggle } from "../../design-system/components/toolbars";
import { downloadPgn } from "../../lib/pgnExport";
import { slugify } from "../../lib/pgnText";
import type { SavedRepertoire } from "../../lib/savedRepertoires";
import { createRepertoireFolder, removeRepertoireFolder, renameRepertoireFolder } from "../../lib/savedRepertoireFolderStore";
import { repertoiresInFolder, sortedRepertoireFolders, type RepertoireFolder } from "../../lib/savedRepertoireFolders";
import { removeSavedRepertoires } from "../../lib/savedRepertoireStore";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { RightPanel } from "../main/rightPanel";
import { useBoardSquareOptions } from "../shared/boardColors";
import { ReadingRepertoires } from "./RepertoireBoard";
import RepertoireGamesMenu from "./RepertoireGamesMenu";
import { useRepertoireFolders } from "./useRepertoireFolders";
import { useSavedRepertoires } from "./useSavedRepertoires";

/**
 * **Repertoires** (`/repertoires`) — the reader's own repertoires, newest
 * first, as rows or as preview boards at the saved lists' two card sizes (CTA-61).
 *
 * Since CTA-113 it is the design system's composition, as its sister screen
 * Saved analyses is (`views/tools/analysis/saved/SavedAnalyses.tsx`): a
 * `ListScreenHeader` (the title the page's `h1`, the count, the folder's
 * back, rename and delete, Add, the `SelectionBar` and the `ViewToggle`) over
 * the **`RepertoiresList`** block — the same rows, cards and folder actions
 * as the analyses'. The differences:
 *
 * - **Deleting is in bulk, and in every view** (CTA-68). No row or card
 *   carries a delete of its own: each carries a pick — the cards too, so the
 *   selection bar (select-all, the count, the download and a delete that asks
 *   first, `DeleteManyDialog`) shows in all three views, and switching view
 *   keeps the picks.
 * - **One destination, and its games.** A repertoire opens on its player
 *   (`/repertoires/<id>`), and each row and card carries the Games menu
 *   (`RepertoireGamesMenu.tsx`, CTA-63) beside it.
 * - **Folders, one level deep.** The top level lists the folders, then the
 *   Unfiled repertoires; `?folder=<id>` opens one — its repertoires, with its
 *   rename and delete in the top bar and the way back beside its name. A
 *   split lands the reader inside the folder it made. A repertoire moves
 *   between folders from its settings screen (CTA-68); a folder deleted keeps its
 *   repertoires (they go back to Unfiled). See `lib/savedRepertoireFolders.ts`.
 * - **A card previews where the repertoire branches.** Not the start, which
 *   every 1.e4 repertoire shares, and not any one line's end: the position the
 *   record's check found every line still agreeing on
 *   (`SavedRepertoire.previewFen`), so no card parses a move to draw itself.
 */

const boardPath = (saved: SavedRepertoire) => `/repertoires/${encodeURIComponent(saved.id)}`;

/**
 * The route: the list, once both stores' first reads have landed (IndexedDB —
 * a read is a promise), so a `?folder=` link is not read as the top level
 * before the folders are there.
 */
function Repertoires() {
  const repertoires = useSavedRepertoires();
  const folders = useRepertoireFolders();
  if (repertoires === undefined || folders === undefined) return <ReadingRepertoires />;
  return <RepertoiresScreen repertoires={repertoires} folders={folders} />;
}

function RepertoiresScreen({
  repertoires,
  folders,
}: {
  repertoires: readonly SavedRepertoire[];
  folders: readonly RepertoireFolder[];
}) {
  // The header's title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const squares = useBoardSquareOptions();
  const [view, setView] = useState<SavedListView>(SAVED_LIST_DEFAULT_VIEW);

  /*
    Where the reader is: a folder named by `?folder=`, or the top level. A
    folder the store does not hold — deleted in another tab, a stale link —
    is the top level, rather than an empty screen for nothing.
  */
  const [searchParams] = useSearchParams();
  const folderParam = searchParams.get("folder");
  const current = folders.find((folder) => folder.id === folderParam) ?? null;
  const folderId = current?.id ?? null;
  usePageTitle(current === null ? undefined : current.name || t("repertoires.untitled"));

  const visible = repertoiresInFolder(repertoires, folders, folderId);
  // Folders are one level: they are listed at the top level, and only there.
  const shownFolders = current === null ? sortedRepertoireFolders(folders) : [];
  const countIn = (id: string) => repertoiresInFolder(repertoires, folders, id).length;

  /*
    The picks, held as ids and read *through* the rows on screen, so one
    deleted or moved away falls out of the count rather than haunting it —
    and cleared on moving to another folder (adjusted during render, not in
    an effect), since a count for rows nobody can see is a trap. Switching
    view keeps them: every view has the picks.
  */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [pickedIn, setPickedIn] = useState<string | null>(folderId);
  if (pickedIn !== folderId) {
    setPickedIn(folderId);
    setPicked(new Set());
  }
  const selected = visible.filter((saved) => picked.has(saved.id));

  const togglePicked = (id: string) =>
    setPicked((currentPicks) => {
      const next = new Set(currentPicks);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAll = () =>
    setPicked(selected.length === visible.length ? new Set() : new Set(visible.map((saved) => saved.id)));

  /* The dialogs: naming a folder, deleting one, deleting the picks. */
  const [naming, setNaming] = useState<{ folder: RepertoireFolder | null } | null>(null);
  const [deleting, setDeleting] = useState<RepertoireFolder | null>(null);
  const [deletingPicked, setDeletingPicked] = useState(false);
  // The count asked about, held past the confirm so the dialog's closing
  // transition does not read "Delete 0".
  const [askedCount, setAskedCount] = useState(0);
  // The folder asked about, held past the dialog's close for the same reason.
  const [askedFolder, setAskedFolder] = useState<RepertoireFolder | null>(null);

  const deleteFolder = (folder: RepertoireFolder) => {
    void removeRepertoireFolder(folder.id);
    if (folder.id === folderId) navigate("/repertoires");
  };

  // An empty folder goes at once; one with repertoires in it asks first.
  const askDelete = (folder: RepertoireFolder) => {
    if (countIn(folder.id) === 0) {
      deleteFolder(folder);
      return;
    }
    setAskedFolder(folder);
    setDeleting(folder);
  };

  const downloadFolder = (folder: RepertoireFolder) =>
    downloadPgn(
      slugify(folder.name) || "repertoire-folder",
      repertoiresInFolder(repertoires, folders, folder.id).map((saved) => saved.pgn),
    );

  // Save and Cancel on a settings screen come back to this list as it stands.
  const from = `${location.pathname}${location.search}`;

  const previewOptions = (saved: SavedRepertoire): ChessboardOptions => ({
    ...squares,
    id: `repertoires-preview-${saved.id}`,
    position: saved.previewFen,
    // The side the reader plays it from (its settings), as its board opens.
    boardOrientation: saved.settings.color,
    allowDragging: false,
    allowDrawingArrows: false,
    showNotation: false,
  });

  const currentName = current === null ? "" : current.name || t("repertoires.untitled");
  const folderLabel = (key: string) => t(key, { name: currentName });

  return (
    <>
      <Box data-testid="repertoires-screen" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={current === null ? t("repertoires.title") : currentName}
          titleDir={current === null ? undefined : "auto"}
          count={
            current === null
              ? t("repertoires.count", { count: repertoires.length })
              : t("repertoires.folder.count", { count: visible.length })
          }
          back={
            current === null ? undefined : (
              <BackButton
                label={t("repertoires.folder.back")}
                link={{ component: RouterLink, to: "/repertoires" }}
                testId="repertoires-folder-back"
              />
            )
          }
          wrap
          actions={
            <>
              {current === null ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CreateNewFolderRoundedIcon fontSize="small" />}
                  onClick={() => setNaming({ folder: null })}
                  data-testid="repertoires-new-folder"
                >
                  {t("repertoires.folder.new")}
                </Button>
              ) : (
                <>
                  <IconAction
                    label={folderLabel("savedList.folder.renameNamed")}
                    onClick={() => setNaming({ folder: current })}
                    testId="repertoires-folder-rename"
                  >
                    <DriveFileRenameOutlineRoundedIcon fontSize="small" />
                  </IconAction>
                  <IconAction
                    label={folderLabel("savedList.folder.deleteNamed")}
                    onClick={() => askDelete(current)}
                    testId="repertoires-folder-delete"
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconAction>
                </>
              )}
              <Button
                size="small"
                variant="outlined"
                component={RouterLink}
                to="/repertoires/new"
                startIcon={<AddRoundedIcon fontSize="small" />}
                data-testid="repertoires-add"
              >
                {t("repertoires.add")}
              </Button>
              {visible.length > 0 && (
                <SelectionBar
                  checked={selected.length === visible.length}
                  indeterminate={selected.length > 0 && selected.length < visible.length}
                  onToggleAll={toggleAll}
                  selectAllLabel={t("repertoires.selectAll")}
                  count={selected.length}
                  countLabel={t("repertoires.selected", { count: selected.length })}
                  onClear={() => setPicked(new Set())}
                  clearLabel={t("savedList.clearSelected")}
                  actions={
                    <>
                      <IconAction
                        label={t("repertoires.download")}
                        disabled={selected.length === 0}
                        onClick={() => downloadPgn("chess-trainer-repertoires", selected.map((saved) => saved.pgn))}
                        testId="repertoires-download"
                      >
                        <DownloadRoundedIcon fontSize="small" />
                      </IconAction>
                      <IconAction
                        label={t("repertoires.deleteSelected")}
                        disabled={selected.length === 0}
                        onClick={() => {
                          setAskedCount(selected.length);
                          setDeletingPicked(true);
                        }}
                        testId="repertoires-delete"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconAction>
                    </>
                  }
                  testId="repertoires"
                />
              )}
              <ViewToggle<SavedListView>
                value={view}
                onChange={setView}
                options={[
                  { value: "list", label: t("repertoires.view.list"), icon: <ViewListRounded fontSize="small" /> },
                  { value: "compact", label: t("repertoires.view.compact"), icon: <ViewComfyRounded fontSize="small" /> },
                  { value: "comfortable", label: t("repertoires.view.comfortable"), icon: <ViewModuleRounded fontSize="small" /> },
                ]}
                ariaLabel={t("repertoires.view.label")}
                testId="repertoires-view"
              />
            </>
          }
          testId="repertoires"
        />

        <RepertoiresList
          view={view}
          folders={shownFolders.map((folder) => ({ folder, count: countIn(folder.id) }))}
          repertoires={visible}
          picked={picked}
          onTogglePick={togglePicked}
          openLink={(saved) => ({ component: RouterLink, to: boardPath(saved) })}
          settingsLink={(saved) => ({ component: RouterLink, to: `${boardPath(saved)}/settings`, state: { from } })}
          folderLink={(folder) => ({ component: RouterLink, to: `/repertoires?folder=${encodeURIComponent(folder.id)}` })}
          folderActions={{
            onDownload: downloadFolder,
            onRename: (folder) => setNaming({ folder }),
            onDelete: askDelete,
          }}
          extraActions={(saved) => (
            <RepertoireGamesMenu
              id={saved.id}
              label={t("repertoires.games.openNamed", { name: saved.name || t("repertoires.untitled") })}
              testId={`repertoires-games-${saved.id}`}
            />
          )}
          preview={(saved) => (
            <Box sx={{ width: "100%", aspectRatio: "1 / 1" }}>
              <Chessboard options={previewOptions(saved)} />
            </Box>
          )}
          empty={{
            label: t(current === null ? "repertoires.empty" : "repertoires.folder.empty"),
            testId: "repertoires-empty",
          }}
          testId="repertoires"
          folderTestId="repertoire-folder"
        />
      </Box>

      <FolderNameDialog
        open={naming !== null}
        title={t(naming?.folder ? "repertoires.folder.rename" : "repertoires.folder.newTitle")}
        initial={naming?.folder?.name ?? ""}
        onSave={(name) => {
          if (naming?.folder) void renameRepertoireFolder(naming.folder.id, name);
          else void createRepertoireFolder(name);
        }}
        onClose={() => setNaming(null)}
        labels={{
          name: t("repertoires.folder.name"),
          cancel: t("repertoires.folder.cancel"),
          save: t("repertoires.folder.save"),
        }}
        testId="repertoire-folder"
      />
      <FolderDeleteDialog
        open={deleting !== null}
        title={`${t("repertoires.folder.delete")}: ${askedFolder?.name ?? ""}`}
        message={t("repertoires.folder.deleteConfirm", { count: askedFolder === null ? 0 : countIn(askedFolder.id) })}
        confirmLabel={t("repertoires.folder.delete")}
        cancelLabel={t("repertoires.folder.cancel")}
        onConfirm={() => {
          if (deleting !== null) deleteFolder(deleting);
        }}
        onClose={() => setDeleting(null)}
        testId="repertoire-folder"
      />
      <DeleteManyDialog
        open={deletingPicked}
        onClose={() => setDeletingPicked(false)}
        onConfirm={() => {
          // One write for the lot; the picks go with them.
          void removeSavedRepertoires(selected.map((saved) => saved.id));
          setPicked(new Set());
          setDeletingPicked(false);
        }}
        title={t("repertoires.bulkDelete.title", { count: askedCount })}
        message={t("repertoires.bulkDelete.text")}
        confirmLabel={t("repertoires.bulkDelete.confirm")}
        cancelLabel={t("repertoires.folder.cancel")}
        testId="repertoires-delete-dialog"
        titleTestId="repertoires-delete-title"
        cancelTestId="repertoires-delete-cancel"
        confirmTestId="repertoires-delete-confirm"
      />

      <RightPanel>
        <Box component="section" aria-labelledby="repertoires-panel-title" sx={{ color: "text.secondary" }}>
          <Typography id="repertoires-panel-title" variant="subtitle2" component="h2" sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>
            {t("repertoires.panelTitle")}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t("repertoires.hint")}
          </Typography>
          <Typography variant="body2" data-testid="repertoires-storage-note">
            {t("repertoires.storage")}
          </Typography>
        </Box>
      </RightPanel>
    </>
  );
}

export default Repertoires;
