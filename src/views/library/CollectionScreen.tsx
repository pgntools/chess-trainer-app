import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LibraryAddRoundedIcon from "@mui/icons-material/LibraryAddRounded";
import PostAddRoundedIcon from "@mui/icons-material/PostAddRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Link as RouterLink, useHref, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { DEFAULT_ANALYSIS_SETTINGS } from "../../lib/analysisSettings";
import type { IndexedRow } from "../../lib/collectionIndex";
import { addCollection, removeCollectionGames, updateCollectionSettings } from "../../lib/libraryCollectionStore";
import {
  batchFolderNameOf,
  canBeTournament,
  COLLECTION_COLUMNS,
  COLLECTION_FILTER_PARAMS,
  collectionFacetsOf,
  filteredRows,
  isTournamentCollection,
  MAX_COLLECTION_NAME_CHARS,
  RESULTS,
  tableFormatOfKind,
  type CollectionColumn,
  type CollectionFilterValues,
  type CollectionRow,
  type CollectionSummary,
  type CollectionTournament,
  type SortDirection,
} from "../../lib/libraryCollections";
import {
  OPENING_LINE_PARAM,
  openingLineOfParam,
  openingLineParamOf,
  openingNodeAt,
  openingNodeOn,
  openingTreeOf,
} from "../../lib/openingTree";
import { downloadPgn } from "../../lib/pgnExport";
import { slugify } from "../../lib/pgnText";
import { batchAnalysesOf, newSavedAnalysisId } from "../../lib/savedAnalyses";
import {
  createAnalysisFolder,
  MAX_ANALYSIS_FOLDER_NAME,
  MAX_ANALYSIS_FOLDERS,
  removeAnalysisFolder,
} from "../../lib/savedAnalysisFolderStore";
import { addAnalyses, MAX_SAVED_ANALYSES } from "../../lib/savedAnalysisStore";
import { repertoireGameNamesOf } from "../../lib/savedRepertoires";
import { RightPanel } from "../main/rightPanel";
import { SaveAsCollectionDialog } from "../../blocks/dialogs";
import { CollectionFilters, TournamentSuggestion } from "../../blocks/forms";
import { CollectionGamesTable, COLLECTION_DEFAULT_SORT, collectionFirstDirection } from "../../blocks/tables";
import { DeleteManyDialog } from "../../design-system/components/dialogs";
import { useSnackbar } from "../../design-system/components/feedback";
import { SearchField } from "../../design-system/components/forms";
import { BackButton } from "../../design-system/components/navigation";
import { LoadingLine } from "../../design-system/components/states";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "../../design-system/components/tables";
import { HintButton, IconAction, ListScreenHeader, SelectionBar } from "../../design-system/components/toolbars";
import OpeningFilterBoard from "./OpeningFilterBoard";
import { TournamentCollection, type TournamentTabs } from "./TournamentCollection";
import LibraryMiss from "./LibraryMiss";
import { loadCollectionGames, useCollectionRows, useTournamentGuess } from "./useLibraryCollections";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";

/**
 * **A collection** (`/library/<collection>`, CTA-75) — its games as a table:
 * one row per game, the columns `lib/libraryCollections.ts` reads off the
 * tags (and the length it counts), **sorted** by a click on any header and
 * **filtered** by words (matched against every text column, the box over the
 * table) and by the right-hand panel's filters — players (several names at
 * once, OR'd, CTA-95) and side, opening,
 * event, dates, result (the `CollectionFilters` block; each shown only where the
 * collection has its field) — and, under the player and side, the **opening moves** played
 * on a small board (`OpeningFilterBoard.tsx`, CTA-76): the opening tree
 * (`lib/openingTree.ts`, merged from the index's `line` column) of **the
 * games the other filters leave** — filter by players and side, and the
 * board shows their openings — rebuilt as they change (a few ms for
 * 10,000 games). Its line narrows the table last, and is kept as written
 * when the other filters leave no game on it (the board then says so); only
 * a line no game of the whole collection plays is cut back, where they part.
 * A row opens that game on the Library's analysis board.
 *
 * **Every row carries a checkbox**, and the header's select-all works on
 * **the rows the filters leave, on every page** — so filter, select all,
 * download, and the file is the filtered batch — and adds them to the picks
 * (unticking removes just those), while the top bar's `SelectionBar` chip
 * counts every pick, whatever the filter now shows.
 * The download is one `.pgn` of the picked games, in collection order. In an
 * **uploaded** collection the bar also **deletes** the picked games (asked
 * first; `removeCollectionGames`, the games after them moving up) — the
 * whole collection is deleted from its row on `/library`. Picks
 * are the screen's, not the URL's: a link carries the filter, not a hand-made
 * selection.
 *
 * **Add games** (an upload's only — an empty collection starts here) opens
 * the upload screen on this collection (`/library/new?into=<id>`): a file or
 * a paste, checked as an upload is, added at the end.
 *
 * **Analyse** (CTA-77), beside the export bar, hands the picks to **Saved
 * analyses**: one new top-level folder, named after the collection, the
 * count and the filters that are on (`batchFolderNameOf`), and every picked
 * game saved into it as its own analysis, in collection order, all or
 * nothing — the Analysis Board's split (`AnalysisLoad.tsx`) over games
 * already read: the folder first, then the records (`batchAnalysesOf`, the
 * stored PGN as it is), the folder taken back out if they cannot be written.
 * A game the index marks unreadable is **left out, and the notice says how
 * many** — it would open on no board — rather than refusing the whole batch.
 * The app's snackbar (`useSnackbar`) says how many went where, with a link
 * to the folder; the picks stay.
 *
 * **Save as collection** (CTA-122), the fourth action on the picks, shipped
 * and uploaded collections alike: the picked games written as one **new
 * uploaded collection** of their own, each game exactly as stored and its
 * row straight off the index (no re-parse, the Analyse discipline) — the
 * name asked first in a dialog (`SaveAsCollectionDialog`), prefilled with the
 * name derived the way Analyse derives its folder name, within the
 * collection-name cap. The write is one all-or-nothing `addCollection`
 * (top-level folder, no description, no tournament mark); a failure is
 * answered in the dialog and nothing is created. The snackbar links to the
 * new collection; the picks stay.
 *
 * **The rows are the collection's index** (`lib/collectionIndex.ts`), read
 * whole — no game is parsed, or even fetched, to draw the table: a shipped
 * file's index is its own small chunk, and the PGN is fetched only for a
 * download of the picked games. (The whole collection downloads from its row
 * on `/library`.) A game the index found unreadable is marked in its `#` cell.
 *
 * **The newest games first**: the table opens sorted by date, descending
 * (undated games last, one day's games later first); `#` restores the
 * collection's own order.
 *
 * The sort, the filters and the page are the URL's (`?sort=`, `?dir=`, `?q=`,
 * `?player=`, `?color=`, `?opening=`, `?event=`, `?from=`, `?to=`,
 * `?result=`, `?line=`, `?page=`, `?rows=`, written with history replace), so going back
 * from a game finds the table as it was left, and a filtered table is a link.
 * Pages rather than one long table: the Tal file is 2,636 rows — the tables'
 * one set of page sizes (25 / 50 / 100 / 250, 50 unless `?rows=` says).
 *
 * **A tournament** (CTA-142) — a collection that reads as one
 * (`isTournamentCollection`) — opens on a view of its own instead
 * (`TournamentCollection.tsx`: Info, Participants, Games); its Games tab is
 * this same table, the tab strip under the header.
 *
 * Built from the design system since CTA-113: a `ListScreenHeader` with a
 * `BackButton`, a `SearchField`, the `CollectionGamesTable` block, a
 * `DeleteManyDialog`.
 */

const isColumn = (value: string | null): value is CollectionColumn =>
  (COLLECTION_COLUMNS as readonly string[]).includes(value ?? "");

function CollectionTable({
  collection,
  rows,
  tabs,
}: {
  collection: CollectionSummary;
  rows: readonly CollectionRow[];
  /** A tournament collection's Games tab (CTA-142): the strip under the header, the region under it its panel. Absent, today's screen. */
  tabs?: TournamentTabs;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { show } = useSnackbar();
  // The router's base, so the snackbar's link — outside the router — is a real href.
  const base = useHref("/");
  const hrefOf = (path: string) => (base === "/" ? path : `${base}${path}`);
  // The collection's name is the page's `h1`, and its title (CTA-112).
  useOwnPageHeading();
  usePageTitle(collection.name);
  const [params, setParams] = useSearchParams();
  const [deleting, setDeleting] = useState(false);
  const [deleteProblem, setDeleteProblem] = useState(false);
  /** How many the open dialog asks about — held while it closes, once the picks are cleared. */
  const [deleteCount, setDeleteCount] = useState(0);
  /** The picked games, by number. */
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());

  const requestedSort = params.get("sort");
  const sort: CollectionColumn = isColumn(requestedSort) ? requestedSort : COLLECTION_DEFAULT_SORT;
  const requestedDirection = params.get("dir");
  const direction: SortDirection =
    requestedDirection === "asc" || requestedDirection === "desc"
      ? requestedDirection
      : collectionFirstDirection(sort);
  const text = params.get("q") ?? "";
  const requestedResult = params.get("result") ?? "";
  const requestedColor = params.get("color");
  const collectionTree = useMemo(() => openingTreeOf(rows), [rows]);
  const requestedLine = params.get(OPENING_LINE_PARAM) ?? "";
  // Followed as far as the collection's games go — a stale link lands where they part.
  const line = useMemo(
    () => openingNodeAt(collectionTree, openingLineOfParam(requestedLine)).line,
    [collectionTree, requestedLine],
  );
  const isoDate = (value: string | null) => (/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? (value as string) : "");
  // The player filter's chosen names — the URL's repeated `?player=` params,
  // blanks dropped. Memoized on `params`: it stays one object until the search
  // changes, so a re-render the URL did not cause does not re-filter the rows.
  const player = useMemo(
    () => params.getAll("player").filter((name) => name.trim() !== ""),
    [params],
  );
  const filters: CollectionFilterValues = {
    player,
    color: requestedColor === "white" || requestedColor === "black" ? requestedColor : "",
    opening: params.get("opening") ?? "",
    event: params.get("event") ?? "",
    from: isoDate(params.get("from")),
    to: isoDate(params.get("to")),
    result: (RESULTS as readonly string[]).includes(requestedResult) ? requestedResult : "",
    line: openingLineParamOf(line),
  };
  const requestedRows = Number(params.get("rows"));
  const rowsPerPage = TABLE_PAGE_SIZES.includes(requestedRows) ? requestedRows : DEFAULT_TABLE_PAGE_SIZE;

  const facets = useMemo(() => collectionFacetsOf(rows), [rows]);
  const { color, event, from, to, result } = filters;
  const openingName = filters.opening;
  // Every filter but the line: the rows the board's tree is merged from.
  const narrowed = useMemo(
    () => filteredRows(rows, { text, result, player, color, opening: openingName, event, from, to }),
    [rows, text, result, player, color, openingName, event, from, to],
  );
  const openingTree = useMemo(() => openingTreeOf(narrowed), [narrowed]);
  const openingNode = useMemo(() => openingNodeOn(openingTree, line), [openingTree, line]);
  // The table orders them (`CollectionGamesTable`, `sortedRows`).
  const shown = useMemo(() => filteredRows(narrowed, { text: "", result: "", line }), [narrowed, line]);
  const [analysing, setAnalysing] = useState(false);
  /** The Save-as-collection dialog: open, the name it opens with, the write under way, and its last problem. */
  const [savingAs, setSavingAs] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savingCollection, setSavingCollection] = useState(false);
  const [saveProblem, setSaveProblem] = useState<"read" | "storage" | null>(null);

  /*
    CTA-142: an upload never marked one way or the other, whose games share one
    `Event`, is offered the kind of tournament they look like — the settings
    screen's suggestion, one step: Apply marks it at once and opens its
    tournament view; the close button marks it "not a tournament" (the mark
    stored off), so it is not asked again. Its games are read for the guess
    (their own tags) only then — never for the table itself.
  */
  const offerMark = tabs === undefined && collection.source === "uploaded" && collection.tournament === undefined && canBeTournament(rows);
  const suggestion = useTournamentGuess(collection.id, offerMark);
  const [marking, setMarking] = useState(false);
  const mark = async (tournament: CollectionTournament): Promise<boolean> => {
    setMarking(true);
    const problem = await updateCollectionSettings(collection.id, { tournament });
    setMarking(false);
    if (problem !== undefined) {
      show({ message: t("library.settings.suggestion.problem"), severity: "error", duration: null, testId: "library-table-suggestion-notice" });
      return false;
    }
    return true;
  };
  const applySuggestion = async (type: CollectionTournament["type"]) => {
    // Where Undo comes back to: this table, its filters and all.
    const backTo = cameFrom;
    if (!(await mark({ enabled: true, type }))) return;
    show({
      message: t("library.settings.suggestion.marked", { type: t(`library.settings.formats.${type}`) }),
      severity: "success",
      duration: 10_000,
      testId: "library-table-suggestion-notice",
      // Undo: the mark taken off again — never decided, so the suggestion is offered again.
      action: {
        label: t("library.settings.suggestion.undo"),
        onClick: () => {
          void updateCollectionSettings(collection.id, { tournament: null }).then((problem) => {
            if (problem === undefined) navigate(backTo, { replace: true });
            else show({ message: t("library.settings.suggestion.problem"), severity: "error", duration: null, testId: "library-table-suggestion-notice" });
          });
        },
        testId: "library-table-suggestion-undo",
      },
    });
    // The collection now reads as a tournament: its view, on Info.
    navigate(`/library/${encodeURIComponent(collection.id)}?tab=info`, { replace: true });
  };

  /** The picks into Saved analyses: a new folder, a record per readable game — or nothing. */
  const analysePicked = async () => {
    const failure = (message: string) =>
      show({ message, severity: "error", duration: null, testId: "library-picks-analyse-notice" });
    setAnalysing(true);
    try {
      const games = await loadCollectionGames(collection);
      if (games === null) return failure(t("library.table.picks.problem.read"));
      const unreadable = new Set(rows.filter((row) => row.unreadable).map((row) => row.number));
      const numbers = [...picked].sort((a, b) => a - b);
      const kept = numbers.filter((number) => games[number - 1] !== undefined && !unreadable.has(number));
      const skipped = numbers.length - kept.length;
      if (kept.length === 0) return failure(t("library.table.picks.problem.none"));

      const chunks = kept.map((number) => games[number - 1]);
      const names = repertoireGameNamesOf(chunks);
      const folderName = batchFolderNameOf(
        collection.name,
        { text, result, player, color, opening: openingName, event, from, to, line },
        {
          games: t("library.games", { count: kept.length }),
          white: t("library.table.picks.white"),
          black: t("library.table.picks.black"),
        },
        MAX_ANALYSIS_FOLDER_NAME,
      );
      const folder = await createAnalysisFolder(folderName, null);
      if (folder === undefined) {
        return failure(t("library.table.picks.problem.folder", { max: MAX_ANALYSIS_FOLDERS }));
      }
      const failed = await addAnalyses(
        batchAnalysesOf(
          newSavedAnalysisId,
          chunks.map((pgn, index) => ({ pgn, name: names[index] })),
          folder.id,
          DEFAULT_ANALYSIS_SETTINGS,
        ),
      );
      if (failed !== undefined) {
        // All or nothing: no empty folder is left behind.
        await removeAnalysisFolder(folder.id);
        return failure(
          failed === "too-many"
            ? t("library.table.picks.problem.tooMany", { max: MAX_SAVED_ANALYSES })
            : t("library.table.picks.problem.storage"),
        );
      }
      const folderPath = `/tools/analysis/saved?folder=${encodeURIComponent(folder.id)}`;
      show({
        severity: "success",
        duration: 10_000,
        testId: "library-picks-analyse-notice",
        action: {
          label: t("library.table.picks.openFolder"),
          onClick: () => navigate(folderPath),
          href: hrefOf(folderPath),
          testId: "library-picks-analyse-open",
        },
        message: [
          t("library.table.picks.done", { count: kept.length, folder: folder.name }),
          skipped > 0 ? t("library.table.picks.skipped", { count: skipped }) : "",
        ]
          .filter(Boolean)
          .join(" "),
      });
    } finally {
      setAnalysing(false);
    }
  };

  /**
   * The name the Save-as-collection dialog opens with — derived the way
   * Analyse derives its folder name (`batchFolderNameOf`: the collection,
   * the count, the filters that are on), within the collection-name cap.
   */
  const derivedSaveName = () =>
    batchFolderNameOf(
      collection.name,
      { text, result, player, color, opening: openingName, event, from, to, line },
      {
        games: t("library.games", { count: picked.size }),
        white: t("library.table.picks.white"),
        black: t("library.table.picks.black"),
      },
      MAX_COLLECTION_NAME_CHARS,
    );

  /**
   * The picks as one new uploaded collection (CTA-122): each game exactly as
   * stored — no re-parse, its row straight off the index — in one
   * all-or-nothing `addCollection`. A failure is answered in the dialog,
   * nothing created; a success closes it and links to the new collection.
   */
  const savePickedAsCollection = async (name: string) => {
    setSaveProblem(null);
    setSavingCollection(true);
    try {
      const games = await loadCollectionGames(collection);
      if (games === null) {
        setSaveProblem("read");
        return;
      }
      const chunks: string[] = [];
      const indexed: IndexedRow[] = [];
      for (const pick of [...picked].sort((a, b) => a - b)) {
        const pgn = games[pick - 1];
        const row = rows[pick - 1];
        if (pgn === undefined || row === undefined) continue;
        chunks.push(pgn);
        // The index's row is the table's minus its place — nothing is re-parsed.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { number, ...indexRow } = row;
        indexed.push(indexRow);
      }
      const made = await addCollection(name, chunks, indexed);
      if ("problem" in made) {
        setSaveProblem("storage");
        return;
      }
      setSavingAs(false);
      const path = `/library/${encodeURIComponent(made.collection.id)}`;
      show({
        severity: "success",
        duration: 10_000,
        testId: "library-picks-collection-notice",
        action: {
          label: t("library.table.picks.openCollection"),
          onClick: () => navigate(path),
          href: hrefOf(path),
          testId: "library-picks-collection-open",
        },
        message: t("library.table.picks.savedCollection", { count: chunks.length, name }),
      });
    } finally {
      setSavingCollection(false);
    }
  };

  const downloadPicked = async () => {
    const games = await loadCollectionGames(collection);
    if (games === null) return;
    const numbers = [...picked].sort((a, b) => a - b);
    downloadPgn(
      `${slugify(collection.name) || "collection"}-${numbers.length}-games`,
      numbers.map((number) => games[number - 1]).filter((pgn) => pgn !== undefined),
    );
  };

  const page = Math.max(0, Number(params.get("page")) || 0);

  /**
   * Change some of the table's URL state; a new filter or sort starts at page
   * 0. A string writes one param (`""` removing it); an array writes a
   * repeated param — the player filter's names, `?player=a&player=b` (names
   * hold commas, so joining them into one value is not safe), an empty array
   * removing every one; `null` removes whatever the key holds.
   */
  const setState = (patch: Record<string, string | readonly string[] | null>, keepPage = false) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (typeof value === "string") {
            if (value === "") next.delete(key);
            else next.set(key, value);
          } else if (value === null) {
            next.delete(key);
          } else {
            next.delete(key);
            for (const name of value) {
              if (name !== "") next.append(key, name);
            }
          }
        }
        if (!keepPage) next.delete("page");
        return next;
      },
      { replace: true },
    );

  /** A header's sort: a new column opens its own way, a second click turns it. The URL keeps only what is not the default. */
  const sortBy = (column: CollectionColumn, turned: SortDirection) =>
    setState({
      sort: column === COLLECTION_DEFAULT_SORT ? null : column,
      dir: turned === collectionFirstDirection(column) ? null : turned,
    });

  const gamePath = (number: number) => `/library/${encodeURIComponent(collection.id)}/${number}`;
  const cameFrom = `${location.pathname}${location.search}`;

  const confirmDelete = async () => {
    const failed = await removeCollectionGames(collection.id, [...picked]);
    if (failed !== undefined) {
      setDeleteProblem(true);
      return;
    }
    // The numbers after the deleted games have moved up: a pick would name another game.
    setPicked(new Set());
    setDeleting(false);
  };

  return (
    <>
      <Box data-testid="library-table-screen" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={<span data-testid="library-table-name">{collection.name}</span>}
          titleDir="auto"
          count={
            <span data-testid="library-table-count">
              {shown.length === rows.length
                ? t("library.games", { count: rows.length })
                : t("library.table.shown", { shown: shown.length, count: rows.length })}
            </span>
          }
          back={
            <BackButton
              label={t("library.table.back")}
              link={{ component: RouterLink, to: "/library" }}
              testId="library-table-back"
            />
          }
          actions={
            <>
              {collection.source === "uploaded" && (
                <HintButton
                  hint={t("library.table.addGamesHint")}
                  variant={rows.length === 0 ? "contained" : "outlined"}
                  startIcon={<PostAddRoundedIcon fontSize="small" />}
                  link={{ component: RouterLink, to: `/library/new?into=${encodeURIComponent(collection.id)}` }}
                  testId="library-table-add-games"
                >
                  {t("library.table.addGames")}
                </HintButton>
              )}
              {/* The picks' chip and actions; select-all is the table header's. */}
              <SelectionBar
                count={picked.size}
                countLabel={t("library.table.picks.selected", { count: picked.size })}
                onClear={() => setPicked(new Set())}
                clearLabel={t("savedList.clearSelected")}
                actions={
                  <>
                    {collection.source === "uploaded" && (
                      <IconAction
                        label={t("library.table.settings")}
                        link={{
                          component: RouterLink,
                          // Back to this table, filter and all.
                          to: `/library/${encodeURIComponent(collection.id)}/settings`,
                          state: { from: cameFrom },
                        }}
                        testId="library-table-settings"
                      >
                        <SettingsRoundedIcon fontSize="small" />
                      </IconAction>
                    )}
                    <IconAction
                      label={t("library.table.picks.download")}
                      disabled={picked.size === 0}
                      onClick={() => void downloadPicked()}
                      testId="library-picks-download"
                    >
                      <DownloadRoundedIcon fontSize="small" />
                    </IconAction>
                    {collection.source === "uploaded" && (
                      <IconAction
                        label={t("library.table.picks.deleteSelected")}
                        disabled={picked.size === 0}
                        onClick={() => {
                          setDeleteProblem(false);
                          setDeleteCount(picked.size);
                          setDeleting(true);
                        }}
                        testId="library-picks-delete"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconAction>
                    )}
                    {/* Shipped and uploaded alike (CTA-122): the result is always a new uploaded collection. */}
                    <IconAction
                      label={t("library.table.picks.saveAs")}
                      disabled={picked.size === 0}
                      onClick={() => {
                        setSaveProblem(null);
                        setSaveName(derivedSaveName());
                        setSavingAs(true);
                      }}
                      testId="library-picks-collection"
                    >
                      <LibraryAddRoundedIcon fontSize="small" />
                    </IconAction>
                  </>
                }
                testId="library-picks"
              />
              <HintButton
                hint={t(analysing ? "library.table.picks.analysing" : "library.table.picks.analyseHint")}
                variant="outlined"
                disabled={picked.size === 0 || analysing}
                onClick={() => void analysePicked()}
                busy={analysing}
                startIcon={<ShareRoundedIcon fontSize="small" />}
                testId="library-picks-analyse"
              >
                {t("library.table.picks.analyse")}
              </HintButton>
            </>
          }
          testId="library-table-header"
        />

        {tabs?.strip}
        <Box
          {...tabs?.panel}
          sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", ...(tabs !== undefined && { pt: 1 }) }}
        >
          {/* The reader's own description (CTA-121), under the header when there is one. */}
          {collection.description !== undefined && (
            <Typography
              variant="body2"
              dir="auto"
              data-testid="library-table-description"
              sx={{ flexShrink: 0, color: "text.secondary", px: 1, pb: 0.5, whiteSpace: "pre-line" }}
            >
              {collection.description}
            </Typography>
          )}

          {/* CTA-142: the kind of tournament the games look like, for a collection never marked. */}
          {offerMark && suggestion !== undefined && (
            <Box sx={{ flexShrink: 0, pb: 1 }}>
              <TournamentSuggestion
                guess={suggestion}
                selected={false}
                onApply={() => void applySuggestion(tableFormatOfKind(suggestion.kind))}
                onDismiss={() => void mark({ enabled: false, type: tableFormatOfKind(suggestion.kind) })}
                disabled={marking}
                testId="library-table-suggestion"
              />
            </Box>
          )}

          <CollectionGamesTable
            rows={shown}
            sort={{ column: sort, direction }}
            onSort={sortBy}
            paging={{
              page,
              rowsPerPage,
              onPageChange: (next) => setState({ page: next === 0 ? null : String(next) }, true),
              onRowsPerPageChange: (next) => setState({ rows: next === DEFAULT_TABLE_PAGE_SIZE ? null : String(next) }),
            }}
            picked={picked}
            onPickedChange={setPicked}
            gameLink={(row) => ({ component: RouterLink, to: gamePath(row.number), state: { from: cameFrom } })}
            collectionEmpty={rows.length === 0}
            filters={
              <SearchField
                label={t("library.table.filter")}
                value={text}
                onChange={(value) => setState({ q: value })}
                clearLabel={t("library.filterClear")}
                testId="library-table-filter"
              />
            }
            testId="library-table"
            picksTestId="library-picks"
          />
        </Box>
      </Box>
      <RightPanel>
        {/* The aside does not scroll; the panel is its own scrolling column. */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", alignContent: "start", gap: 3 }}>
          <CollectionFilters
            facets={facets}
            values={filters}
            onChange={(patch) => setState(patch)}
            onClear={() => setState(Object.fromEntries(COLLECTION_FILTER_PARAMS.map((key) => [key, null])))}
            openingBoard={
              // The board shows once some game has a `line` in the index (an index from before the column has none).
              collectionTree.count > 0 && (
                <OpeningFilterBoard
                  node={openingNode}
                  line={line}
                  onLine={(next) => setState({ [OPENING_LINE_PARAM]: openingLineParamOf(next) })}
                  collectionName={collection.name}
                />
              )
            }
            testId="library-filter"
            rootTestId="library-filters"
          />
          <Typography variant="body2" data-testid="library-table-note" sx={{ color: "text.secondary" }}>
            {t(collection.source === "shipped" ? "library.table.shippedNote" : "library.table.uploadedNote")}
          </Typography>
        </Box>
      </RightPanel>
      <DeleteManyDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => void confirmDelete()}
        title={t("library.table.confirmDeleteGames.title", { count: deleteCount })}
        message={t("library.table.confirmDeleteGames.body", { name: collection.name })}
        confirmLabel={t("library.confirmDelete.confirm")}
        cancelLabel={t("library.confirmDelete.cancel")}
        error={deleteProblem ? t("library.table.confirmDeleteGames.problem") : undefined}
        testId="library-picks-delete-dialog"
        confirmTestId="library-picks-delete-confirm"
      />
      {/* CTA-122: the picks as a new collection — the write is all-or-nothing, so the dialog closes on success, not on save. */}
      <SaveAsCollectionDialog
        open={savingAs}
        initial={saveName}
        count={picked.size}
        busy={savingCollection}
        error={
          saveProblem === null
            ? undefined
            : t(
                saveProblem === "read"
                  ? "library.table.picks.saveAsReadProblem"
                  : "library.table.picks.saveAsProblem",
              )
        }
        onSave={(name) => void savePickedAsCollection(name)}
        onClose={() => setSavingAs(false)}
        testId="library-picks-collection-dialog"
      />
    </>
  );
}

/** The route: the collection the URL names, or the miss. */
function CollectionScreen() {
  const { collectionId } = useParams();
  const { t } = useTranslation();
  const state = useCollectionRows(collectionId);
  if (state.status === "loading") {
    return <LoadingLine testId="library-loading">{t("library.table.loading")}</LoadingLine>;
  }
  if (state.status === "missing") return <LibraryMiss what="collection" />;
  // A collection that reads as a tournament has a view of its own (CTA-142); its Games tab is this table.
  if (isTournamentCollection(state.summary, state.value)) {
    return (
      <TournamentCollection
        key={state.summary.id}
        collection={state.summary}
        rows={state.value}
        games={(tabs) => <CollectionTable collection={state.summary} rows={state.value} tabs={tabs} />}
      />
    );
  }
  return <CollectionTable key={state.summary.id} collection={state.summary} rows={state.value} />;
}

export default CollectionScreen;
