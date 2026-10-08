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
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Chessboard } from "react-chessboard";

import { FolderMoveDialog, FolderNameDialog } from "../../../../blocks/dialogs";
import { SAVED_LIST_DEFAULT_VIEW, SavedAnalysesList, type SavedListView } from "../../../../blocks/lists";
import { SavedAnalysesTable } from "../../../../blocks/tables";
import { DeleteManyDialog } from "../../../../design-system/components/dialogs";
import { SearchField } from "../../../../design-system/components/forms";
import { Breadcrumbs } from "../../../../design-system/components/navigation";
import { EmptyState, LoadingLine } from "../../../../design-system/components/states";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES, TablePager, useTableUrlState } from "../../../../design-system/components/tables";
import { IconAction, ListScreenHeader, SelectionBar, ViewToggle } from "../../../../design-system/components/toolbars";
import { mainlineGame, type GameTree } from "../../../../lib/gameTree";
import { openingOfLine, type OpeningEntry } from "../../../../lib/openings";
import { downloadPgn } from "../../../../lib/pgnExport";
import { slugify } from "../../../../lib/pgnText";
import { savedAnalysisFen, savedAnalysisToTree, type SavedAnalysis } from "../../../../lib/savedAnalyses";
import { analysisBoardPath, DEFAULT_LIST_SORT, type ListSort } from "../../../../lib/analysesListContext";
import {
  analysisTreeRows,
  SAVED_ANALYSES_DEFAULT_SORT,
  SAVED_ANALYSIS_COLUMNS,
  savedAnalysisFirstDirection,
  savedAnalysisRowOf,
  savedAnalysisRowWith,
  type AnalysisOpeningLookup,
  type SavedAnalysisRow,
} from "../../../../lib/savedAnalysisRows";
import {
  analysesHere,
  analysesInFolder,
  analysesUnderFolder,
  analysisFolderChildren,
  analysisFolderPath,
  analysisFolderSubtree,
  analysisPicksOf,
  toggleAnalysisFolderPick,
  toggleAnalysisPick,
  unpickAnalysis,
  type AnalysisFolder,
} from "../../../../lib/savedAnalysisFolders";
import {
  createAnalysisFolder,
  moveAnalysisFolder,
  removeAnalysisFoldersDeep,
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
 * (`Breadcrumbs`), in the list view the **`SavedAnalysesTable`** block (the
 * folders and analyses as one tree table, CTA-144), in the card views the
 * **`SavedAnalysesList`** block (the repertoires' `RepertoiresList` is its
 * sister, one look) and their `TablePager`. The folder dialogs are the
 * `blocks/dialogs` ones; the bulk delete is `DeleteManyDialog`.
 *
 * - **The list view is a tree table** (CTA-144) — the folders first at every
 *   level, each opened in place by its chevron (or its row), its analyses
 *   indented under it, its name a link into it; the open folders are the
 *   screen's state. Most saved analyses are imported games, and a folder of
 *   them is put in order: Name, White, Elo,
 *   Black, Elo, Result, Date, Event, Round, ECO, Opening, Moves, Updated, each
 *   a sort header, read off the record's PGN tags without parsing it
 *   (`lib/savedAnalysisRows.ts`; a board's own placeholders read as empty);
 *   newest updated first until a header is clicked; a words box over names,
 *   players, event, opening and notes — and the folders' names — opening the
 *   folders above a match by themselves. **The sort and the filter cover
 *   everything in view** (the whole tree, or a `?folder=`'s subtree), within
 *   each level, and the page is cut after them. The sort, the page, its
 *   size and the words are the URL's (`useTableUrlState`: `?sort=`, `?dir=`,
 *   `?page=`, `?rows=`, `?q=`, history replace), so coming back from a board
 *   or a settings screen finds the table as it was; a new sort, filter or
 *   folder starts at the first page, and a new folder drops the words.
 * - **The opening the book names** fills ECO and Opening where the tags name
 *   none — over every analysis the open folders show while they are at most
 *   `SAVED_ANALYSES_PARSE_ALL` (the largest page: nothing costs more to read
 *   than one page always did), so those columns sort and filter by it; past
 *   that (an open Library batch) only for the page on screen, and the sort
 *   and the filter read the tags alone.
 *
 * - **One destination.** An analysis opens on the Analysis Board
 *   (`?analysis=<id>`) — a row's name, the board itself on a card.
 * - **Its settings, from a gear** on every row and card
 *   (`AnalysisSettingsScreen.tsx`: title, description, side, next-move arrows
 *   and the folder it is filed under).
 * - **Deleting is in bulk, and in every view.** No row or card deletes itself:
 *   each carries a pick — the cards too, and a folder's pick covers its
 *   whole subtree (CTA-147: folders and records are picked alike) — so the
 *   selection bar shows in all three views, and switching view keeps the
 *   picks. A picked folder goes in the bulk delete **together with everything
 *   under it**; there is no per-folder delete icon any more, and a bulk
 *   delete's confirm says the folders and their contents go.
 * - **A card previews where the reader was standing** — a tree has no final
 *   position, so the record carries that place as SAN from the root
 *   (`lib/savedAnalyses.ts`) — facing the analysis' own side, with the opening
 *   the mainline reached beneath it.
 * - **Folders nest** (`lib/savedAnalysisFolders.ts`): folders first, then this
 *   folder's analyses; create under the folder the reader is in, rename, move
 *   anywhere but its own subtree, and download a folder's whole subtree as
 *   one `.pgn`. Deleting a folder is through the picks (CTA-147): tick its
 *   box — its whole subtree is picked with it — and the bulk delete takes it
 *   and everything under it. The folder the reader is standing in is
 *   `?folder=<id>`. **The picks persist across folders and views**:
 *   select-all adds what is here (in the table, the rows the filter leaves),
 *   and the chip counts the whole picked set — the analyses under the picked
 *   folders included.
 * - **A record the store has and cannot parse is still listed**, says so and
 *   can still be picked — to delete it, or to export its stored PGN intact.
 * - **Paged, and parsed no more than a page at a time** (CTA-77; the design
 *   system's page sizes since CTA-113 — 25 / 50 / 100 / 250, 50 by default).
 *   The store holds thousands of analyses (a Library batch is a folder of
 *   them), so beyond `SAVED_ANALYSES_PARSE_ALL` only the page on screen is
 *   parsed (each record once, kept while it is the stored one) — the table's
 *   tag columns, the counts and the picks read the records without parsing
 *   them. The pager shows once a folder holds more than the smallest page.
 *   Until the store's first read lands the screen says it is reading.
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

/**
 * How many analyses a folder may hold and still be read whole for the table —
 * every record parsed, so the book's openings sort and filter with the tags
 * and every unreadable record is marked: the largest page size, so no folder
 * costs more to read than one page always could.
 */
const SAVED_ANALYSES_PARSE_ALL = TABLE_PAGE_SIZES[TABLE_PAGE_SIZES.length - 1];

/* Each record's row off its tags, read once and kept while it is the stored one. */
const tagRows = new WeakMap<SavedAnalysis, SavedAnalysisRow>();
const tagRowOf = (saved: SavedAnalysis): SavedAnalysisRow => {
  let row = tagRows.get(saved);
  if (row === undefined) {
    row = savedAnalysisRowOf(saved);
    tagRows.set(saved, row);
  }
  return row;
};

/*
  Each record's row with what its parse adds — unreadable, or the book's
  opening where the tags name none. Kept once the book has landed (the one
  loaded book is the only one there is); until then only the tree's verdict
  is known, and the row is made again when it lands.
*/
const readRows = new WeakMap<SavedAnalysis, SavedAnalysisRow>();
const readRowOf = (saved: SavedAnalysis, lookup: AnalysisOpeningLookup | undefined): SavedAnalysisRow => {
  const kept = readRows.get(saved);
  if (kept !== undefined) return kept;
  const row = savedAnalysisRowWith(tagRowOf(saved), treeOf(saved), lookup);
  if (lookup !== undefined) readRows.set(saved, row);
  return row;
};

/**
 * The board an analysis opens on (CTA-145): the workspace — the list's tree
 * beside the board, Close back here — carrying the folder the analysis is
 * filed in (none: the top level) and the order the reader has them in: the
 * table's sort, or the cards' newest first.
 */
const boardPath = (saved: { id: string; folderId: string | null }, sort: ListSort = DEFAULT_LIST_SORT) =>
  analysisBoardPath(saved.id, { folderId: saved.folderId, sort });

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
  const navigate = useNavigate();
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
  /* A folder's search: into it at its first page, without the words typed over the last; the sort and the page size stay. */
  const folderSearch = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id === null) next.delete("folder");
    else next.set("folder", id);
    next.delete("page");
    next.delete("q");
    const search = next.toString();
    return search === "" ? "" : `?${search}`;
  };
  const openFolder = (id: string | null) => setSearchParams(folderSearch(id));
  const foldersHere = analysisFolderChildren(folders, browseId);
  const crumbs = currentFolder === undefined ? [] : analysisFolderPath(folders, currentFolder.id);
  // Keyed on what the URL asks for: the folder it resolves to is read off the same `folders`.
  const rowsHere = useMemo(
    () => analysesHere(analyses, folders, folders.some((folder) => folder.id === requestedFolder) ? requestedFolder : null),
    [analyses, folders, requestedFolder],
  );

  const isList = view === "list";
  const book = useOpeningBook();
  const lookup = useMemo<AnalysisOpeningLookup | undefined>(
    () => (book === null ? undefined : (fens) => openingOfLine(book.book, book.positions, fens)),
    [book],
  );

  /*
    The tree table (CTA-144): the folders and analyses in view — everything,
    or a folder's subtree seen from inside it — walked into one table, folders
    first at every level, an open folder's contents under it.
  */
  const text = searchParams.get("q") ?? "";
  // Keyed on what the URL asks for, as `rowsHere` is: the folder it resolves to is read off the same `folders`.
  const scopeFolders = useMemo(() => {
    const scope = folders.some((folder) => folder.id === requestedFolder) ? requestedFolder : null;
    if (scope === null) return folders;
    const subtree = analysisFolderSubtree(folders, scope);
    return folders.filter((folder) => folder.id !== scope && subtree.has(folder.id));
  }, [folders, requestedFolder]);
  const scopeAnalyses = useMemo(() => {
    const scope = folders.some((folder) => folder.id === requestedFolder) ? requestedFolder : null;
    return scope === null ? analyses : analysesInFolder(analyses, folders, scope);
  }, [analyses, folders, requestedFolder]);

  /*
    Which folders are open: the reader's own toggles, kept by id; one never
    toggled is open while the words open it (above a match). Not the URL's —
    the Library's tree keeps its open folders the same way.
  */
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(new Map());

  /*
    The analyses the open folders show (the words aside) are read whole —
    parse and book — while there are at most `SAVED_ANALYSES_PARSE_ALL`, so
    the book's openings sort and filter with the tags; the rest are their
    tags until their row is on screen.
  */
  const readWhole = useMemo(() => {
    const inScope = new Map(scopeFolders.map((folder) => [folder.id, folder]));
    const shown = new Map<string, boolean>();
    const folderShown = (id: string): boolean => {
      const known = shown.get(id);
      if (known !== undefined) return known;
      const folder = inScope.get(id);
      // A folder out of view is the scope itself — its contents are the top level.
      const result =
        folder === undefined ||
        ((toggled.get(id) ?? false) && (folder.parentId === null || folderShown(folder.parentId)));
      shown.set(id, result);
      return result;
    };
    const visible = scopeAnalyses.filter((saved) => saved.folderId === null || folderShown(saved.folderId));
    return visible.length <= SAVED_ANALYSES_PARSE_ALL ? new Set(visible) : new Set<SavedAnalysis>();
  }, [scopeFolders, scopeAnalyses, toggled]);
  const treeItems = useMemo(
    () => (isList ? scopeAnalyses.map((saved) => (readWhole.has(saved) ? readRowOf(saved, lookup) : tagRowOf(saved))) : []),
    [isList, scopeAnalyses, readWhole, lookup],
  );
  const table = useTableUrlState({
    columns: SAVED_ANALYSIS_COLUMNS,
    defaultSort: SAVED_ANALYSES_DEFAULT_SORT,
    firstDirection: savedAnalysisFirstDirection,
    defaultRowsPerPage: SAVED_ANALYSES_PAGE,
  });
  // The order the reader has the folders' analyses in — what a board opened from a row lists its siblings by.
  const tableSort: ListSort = { column: table.sort, direction: table.direction };
  const walked = useMemo(
    () =>
      isList
        ? analysisTreeRows({
            folders: scopeFolders,
            rows: treeItems,
            isOpen: (id, auto) => toggled.get(id) ?? auto,
            column: table.sort,
            direction: table.direction,
            text,
          }).rows
        : [],
    [isList, scopeFolders, treeItems, toggled, table.sort, table.direction, text],
  );
  const { rowsPerPage } = table;
  // A page past the last (rows gone since the URL was written) reads as the last.
  const page = Math.min(table.page, Math.max(0, Math.ceil((isList ? walked.length : rowsHere.length) / rowsPerPage) - 1));
  // The page on screen read for what it shows — a row's book opening, an unreadable record marked.
  const tableRows = useMemo(() => {
    const byId = new Map(scopeAnalyses.map((saved) => [saved.id, saved]));
    const from = page * rowsPerPage;
    return walked.map((row, index) => {
      if (row.kind === "folder" || index < from || index >= from + rowsPerPage) return row;
      const saved = byId.get(row.item.id);
      return saved === undefined ? row : { ...row, item: readRowOf(saved, lookup) };
    });
  }, [walked, scopeAnalyses, page, rowsPerPage, lookup]);
  const toggleFolder = (id: string) => {
    const shownOpen = walked.find((row) => row.kind === "folder" && row.folder.id === id);
    setToggled((before) => new Map(before).set(id, !(shownOpen?.kind === "folder" && shownOpen.open)));
  };

  /* The cards' page — the folder as it comes, newest first. */
  const pageRows = useMemo(
    () => (isList ? [] : rowsHere.slice(page * rowsPerPage, (page + 1) * rowsPerPage)),
    [isList, rowsHere, page, rowsPerPage],
  );

  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [moving, setMoving] = useState<AnalysisFolder | null>(null);
  const [deletingPicked, setDeletingPicked] = useState(false);
  // The counts asked about, held past the confirm so the dialog's closing
  // transition does not read "Delete 0".
  const [askedCount, setAskedCount] = useState(0);
  const [askedFolders, setAskedFolders] = useState(0);

  /*
    The page's trees: the side lines are counted and the node the reader was
    standing on found in them, and a record that will not parse has none.
  */
  const pageTrees = useMemo(() => pageRows.map((saved) => ({ saved, tree: treeOf(saved) })), [pageRows]);

  /*
    What is picked (CTA-147): **one set of ids over folders and records
    alike** — an analysis' own, a folder's standing for its whole subtree.
    Everything below reads the selection *through* `analyses` and `folders`
    (`analysisPicksOf`), so one deleted — here or in another tab — simply
    falls out of the count. The picks persist across folders and views;
    select-all **adds** what is here (in the table, the rows the filter
    leaves), and unchecking it removes just those.
  */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const picks = useMemo(() => analysisPicksOf(analyses, folders, picked), [analyses, folders, picked]);
  // What a bulk delete takes: the analyses the picks cover, and every checked folder — a checked folder goes with all that is under it.
  const selected = analyses.filter((saved) => picks.analyses.has(saved.id));
  const selectedFolders = folders.filter((folder) => picks.folders.get(folder.id)?.checked === true);
  const selectedHere = rowsHere.filter((saved) => picks.analyses.has(saved.id));

  const togglePicked = (id: string) =>
    setPicked((current) => {
      const saved = analyses.find((analysis) => analysis.id === id);
      // A card's or a row's box: demote the folders above an unticked analysis, so none stays checked with its contents partly picked.
      return saved === undefined ? current : toggleAnalysisPick(current, saved, folders);
    });

  /*
    The table's row boxes go through `onPickedChange`: the same demotion,
    worked out from what the change removed (a row's untick is one id).
  */
  const onPickedChange = (next: Set<string>) => {
    let settled: ReadonlySet<string> = next;
    for (const id of picked) {
      if (settled.has(id)) continue;
      const saved = analyses.find((analysis) => analysis.id === id);
      if (saved !== undefined) settled = unpickAnalysis(settled, saved, folders);
    }
    setPicked(new Set(settled));
  };

  /** A folder's box — the cards' and the table's alike: its whole subtree joins or leaves the picks. */
  const folderPick = (folder: AnalysisFolder) => {
    const state = picks.folders.get(folder.id);
    const checked = state?.checked ?? false;
    return {
      checked,
      indeterminate: state?.indeterminate ?? false,
      onToggle: () =>
        setPicked((current) => toggleAnalysisFolderPick(current, folder, analyses, folders, checked)),
    };
  };

  /*
    The cards' select-all: the folders here and the analyses here. Ticked, it
    adds every folder's whole subtree; unticked, it removes what it covers.
  */
  const allHere = foldersHere.length + rowsHere.length > 0 &&
    foldersHere.every((folder) => picks.folders.get(folder.id)?.checked === true) &&
    selectedHere.length === rowsHere.length;
  const someHere = selectedHere.length > 0 || foldersHere.some((folder) => {
    const state = picks.folders.get(folder.id);
    return (state?.checked ?? false) || (state?.indeterminate ?? false);
  });
  const toggleAllHere = () =>
    setPicked((current) => {
      let next: ReadonlySet<string> = current;
      for (const folder of foldersHere) {
        next = toggleAnalysisFolderPick(next, folder, analyses, folders, allHere);
      }
      const grown = new Set(next);
      for (const saved of rowsHere) {
        if (allHere) grown.delete(saved.id);
        else grown.add(saved.id);
      }
      return grown;
    });

  /*
    The table's select-all (CTA-147) — the screen owns it, because a folder's
    pick covers its closed folders' unshown subtrees. It covers the rows the
    filter leaves: every folder row's whole subtree, and every analysis row.
  */
  const coverage = useMemo(() => {
    const coveredFolders: AnalysisFolder[] = [];
    const coveredAnalyses: SavedAnalysis[] = [];
    const byId = new Map(scopeAnalyses.map((saved) => [saved.id, saved]));
    for (const row of walked) {
      if (row.kind === "folder") coveredFolders.push(row.folder);
      else {
        const saved = byId.get(row.item.id);
        if (saved !== undefined) coveredAnalyses.push(saved);
      }
    }
    return { coveredFolders, coveredAnalyses };
  }, [walked, scopeAnalyses]);
  const allCovered = (coverage.coveredFolders.length + coverage.coveredAnalyses.length > 0) &&
    coverage.coveredFolders.every((folder) => picks.folders.get(folder.id)?.checked === true) &&
    coverage.coveredAnalyses.every((saved) => picks.analyses.has(saved.id));
  const someCovered = coverage.coveredAnalyses.some((saved) => picks.analyses.has(saved.id)) ||
    coverage.coveredFolders.some((folder) => {
      const state = picks.folders.get(folder.id);
      return (state?.checked ?? false) || (state?.indeterminate ?? false);
    });
  const tableSelectAll = {
    checked: allCovered,
    indeterminate: someCovered && !allCovered,
    onToggleAll: () =>
      setPicked((current) => {
        let next: ReadonlySet<string> = current;
        for (const folder of coverage.coveredFolders) {
          next = toggleAnalysisFolderPick(next, folder, analyses, folders, allCovered);
        }
        const grown = new Set(next);
        for (const saved of coverage.coveredAnalyses) {
          if (allCovered) grown.delete(saved.id);
          else grown.add(saved.id);
        }
        return grown;
      }),
  };

  /** One `.pgn` of everything under the folder — the set its count stands for. */
  const downloadFolder = (folder: AnalysisFolder) =>
    downloadPgn(folderStem(folder), analysesInFolder(analyses, folders, folder.id).map((row) => row.pgn));

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

  /* The selection bar's chip and actions — every view's; its select-all is the cards' alone. */
  const selectionBar = {
    count: selected.length,
    countLabel: t("savedAnalyses.selected", { count: selected.length }),
    onClear: () => setPicked(new Set()),
    clearLabel: t("savedList.clearSelected"),
    actions: (
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
          // An empty folder picked is deletable with nothing to download.
          disabled={selected.length === 0 && selectedFolders.length === 0}
          onClick={() => {
            setAskedCount(selected.length);
            setAskedFolders(selectedFolders.length);
            setDeletingPicked(true);
          }}
          testId="saved-analyses-delete"
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconAction>
      </>
    ),
    testId: "saved-analyses",
  };

  /* What a folder's actions do — a tree table's folder row, or a card. No delete: a folder goes through the picks (CTA-147). */
  const folderActions = {
    onDownload: downloadFolder,
    onRename: (folder: AnalysisFolder) => setNameDialog({ mode: "rename", folder }),
    onMove: setMoving,
  };

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
              {/*
                The selection bar, in every view: the cards carry picks too.
                Beside the table it leaves its select-all out — the table's
                header has it, over the rows the filter leaves.
              */}
              {(analyses.length > 0 || folders.length > 0) &&
                (isList ? (
                  <SelectionBar {...selectionBar} />
                ) : (
                  <SelectionBar
                    {...selectionBar}
                    checked={allHere}
                    indeterminate={someHere && !allHere}
                    onToggleAll={toggleAllHere}
                    selectAllLabel={t("savedAnalyses.selectAll")}
                  />
                ))}
              {/* Switching view keeps the picks: every view has them. */}
              <ViewToggle<SavedListView>
                value={view}
                onChange={(next) => {
                  setView(next);
                  table.setPage(0);
                }}
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
          The one region that scrolls. The list view is the tree table — the
          folders first at every level, opened in place (CTA-144); the cards
          show this folder's folders, then its analyses.
        */}
        {isList ? (
          scopeFolders.length === 0 && scopeAnalyses.length === 0 ? (
            <Box data-testid="saved-analyses-body" sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {browseId === null ? (
                <EmptyState testId="saved-analyses-empty">{t("savedAnalyses.empty")}</EmptyState>
              ) : (
                <EmptyState testId="saved-analyses-folder-empty">{t("savedAnalyses.folder.empty")}</EmptyState>
              )}
            </Box>
          ) : (
            <Box data-testid="saved-analyses-body" sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <SavedAnalysesTable
                rows={tableRows}
                sort={{ column: table.sort, direction: table.direction }}
                onSort={table.sortBy}
                onToggle={toggleFolder}
                folderLink={(folder) => ({ component: RouterLink, to: `${location.pathname}${folderSearch(folder.id)}` })}
                folderActions={folderActions}
                paging={
                  walked.length > TABLE_PAGE_SIZES[0]
                    ? { page, rowsPerPage, onPageChange: table.setPage, onRowsPerPageChange: table.setRowsPerPage }
                    : undefined
                }
                picked={picked}
                onPickedChange={onPickedChange}
                folderPick={folderPick}
                selectAll={tableSelectAll}
                openLink={(row) => ({ component: RouterLink, to: boardPath(row, tableSort) })}
                onOpenAnalysis={(row) => navigate(boardPath(row, tableSort))}
                settingsLink={(row) => ({
                  component: RouterLink,
                  to: `/tools/analysis/saved/${encodeURIComponent(row.id)}/settings`,
                  state: { from },
                })}
                filtered={text.trim() !== ""}
                onClearFilter={() => table.setParams({ q: null })}
                filters={
                  <SearchField
                    label={t("savedAnalyses.table.filter")}
                    value={text}
                    onChange={(value) => table.setParams({ q: value === "" ? null : value })}
                    clearLabel={t("savedAnalyses.table.filterClear")}
                    testId="saved-analyses-filter"
                  />
                }
                testId="saved-analyses-table"
                rowTestId="saved-analyses-item"
                openTestId="saved-analyses-open"
                pickTestId="saved-analyses-select"
                selectAllTestId="saved-analyses-select-all"
                folderTestId="saved-analyses-folder"
              />
            </Box>
          )
        ) : (
          <SavedAnalysesList
            view={view}
            folders={foldersHere.map((folder) => ({ folder, count: analysesUnderFolder(analyses, folders, folder.id) }))}
            entries={entries}
            picked={picked}
            onTogglePick={togglePicked}
            folderPick={folderPick}
            openLink={(saved) => ({ component: RouterLink, to: boardPath(saved) })}
            settingsLink={(saved) => ({
              component: RouterLink,
              to: `/tools/analysis/saved/${encodeURIComponent(saved.id)}/settings`,
              state: { from },
            })}
            onOpenFolder={openFolder}
            folderActions={folderActions}
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
        )}

        {/* The cards' pager; the table carries its own. */}
        {!isList && rowsHere.length > TABLE_PAGE_SIZES[0] && (
          <TablePager
            count={rowsHere.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={table.setPage}
            onRowsPerPageChange={table.setRowsPerPage}
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
          /*
            One delete for the lot (CTA-147): the analyses the picks cover,
            then every checked folder with its whole subtree. Standing inside
            what goes, the reader steps to the nearest folder that survives.
          */
          const gone = new Set<string>();
          for (const folder of selectedFolders) {
            for (const id of analysisFolderSubtree(folders, folder.id)) gone.add(id);
          }
          if (browseId !== null && gone.has(browseId)) {
            const byId = new Map(folders.map((folder) => [folder.id, folder]));
            let parentId = byId.get(browseId)?.parentId ?? null;
            while (parentId !== null && gone.has(parentId)) parentId = byId.get(parentId)?.parentId ?? null;
            openFolder(parentId);
          }
          void removeSavedAnalyses(selected.map((saved) => saved.id)).then(() =>
            removeAnalysisFoldersDeep(selectedFolders.map((folder) => folder.id)),
          );
          setPicked(new Set());
          setDeletingPicked(false);
        }}
        title={
          askedCount > 0
            ? t("savedAnalyses.bulkDelete.title", { count: askedCount })
            : t("savedAnalyses.bulkDelete.titleFolders", { count: askedFolders })
        }
        message={
          askedFolders > 0
            ? askedCount > 0
              ? t("savedAnalyses.bulkDelete.textWithFolders", { count: askedFolders })
              : t("savedAnalyses.bulkDelete.textFoldersOnly")
            : t("savedAnalyses.bulkDelete.text")
        }
        confirmLabel={t("savedAnalyses.bulkDelete.confirm")}
        cancelLabel={t("savedAnalyses.folder.cancel")}
        testId="saved-analyses-delete-dialog"
        titleTestId="saved-analyses-delete-title"
        cancelTestId="saved-analyses-delete-cancel"
        confirmTestId="saved-analyses-delete-confirm"
      />
    </>
  );
}

export default SavedAnalyses;
