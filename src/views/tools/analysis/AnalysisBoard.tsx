import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  createSearchParams,
  Link as RouterLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { useTranslation } from "react-i18next";
import type { ChessboardOptions } from "react-chessboard";

import { ChangesStrip, CurrentOpening, EngineThinking, PgnExportPanel, PlayToggleButton } from "../../../blocks/panels";
import { AnalysisEngineForm } from "../../../blocks/forms";
import { deviceEngineLimits } from "../../../lib/engineSettings";
import { StatusText } from "../../../design-system/components/feedback";
import { SwitchField } from "../../../design-system/components/forms";
import { IconAction, ToggleIconAction } from "../../../design-system/components/toolbars";
import { downloadPgn } from "../../../lib/pgnExport";
import { analysisHandOffOf } from "../../../lib/analysisHandOff";
import {
  DEFAULT_ARROW_PALETTE,
  DEFAULT_ARROW_WIDTH_SOURCE,
} from "../../../lib/arrowSettings";
import { parseFen } from "../../../lib/fen";
import { initialPlyOf, parseMoveParam } from "../../../lib/gameNavigation";
import {
  isAnalysisReference,
  isReferenceRead,
  loadReferencedGames,
  resolveGameReference,
} from "../../../lib/gameReference";
import type { GameTree } from "../../../lib/gameTree";
import { arrowWidthSourcesIn } from "../../../lib/nextMoveWeights";
import { parsePgnTree } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import { atParamOf, REPERTOIRE_AT_PARAM } from "../../../lib/repertoireLink";
import { savedAnalysisDerivedName } from "../../../lib/savedAnalyses";
import { analysisFoldersSnapshot, loadAnalysisFolders } from "../../../lib/savedAnalysisFolderStore";
import {
  findSavedAnalysis,
  loadSavedAnalyses,
  savedAnalysesSnapshot,
} from "../../../lib/savedAnalysisStore";
import {
  LIST_CONTEXT_PARAMS,
  LIST_FOLDER_PARAM,
  listContextOf,
} from "../../../lib/analysesListContext";
import BoardShell from "../../board/core/BoardShell";
import { useShellCompact } from "../../main/shellCompact";
import { useVariationsExplorer } from "../../explorer/useVariationsExplorer";
import AnalysesFolderView from "./AnalysesFolderView";
import { INITIAL_FOLDER_VIEW, type FolderViewState } from "./folderViewState";
import AnalysisArrows from "./AnalysisArrows";
import AnalysisLoad from "./AnalysisLoad";
import SaveAnalysisDialog from "./SaveAnalysisDialog";
import { useAnalysisBoard, type AnalysisBoardStart } from "./useAnalysisBoard";
import { usePageTitle } from "../../main/pageTitle";
import { playerPlatesOf } from "../../shared/playerResults";
import { useCurrentOpening } from "../../shared/useCurrentOpening";
import { useUnsavedWorkGuard } from "../../main/unsavedWork";

/**
 * **The Analysis Board** (`/tools/analysis`, CTA-73) — the board a game or a
 * position is taken apart on: both colours move from any node, side lines
 * branch off wherever the reader plays something else, and the engine reads
 * the position on screen — moving a piece only while the header's **Play** is
 * on, and then only for the side not at the bottom of the board, until
 * paused or until the reader steps back (`useAnalysisBoard`).
 *
 * Composed from the v2 core
 * ([`.claude/rules/chessboard.md`](../../../../.claude/rules/chessboard.md) §9)
 * and the shared tree view
 * ([`.claude/rules/tree-views.md`](../../../../.claude/rules/tree-views.md)) —
 * functionally the repertoire player without its trainer and its protection:
 *
 * | Capability | Taken | Because |
 * | --- | --- | --- |
 * | Base | `useBoardCore`, through `useAnalysisBoard` | the tree, the node, the oracle, promotion, orientation |
 * | Engine | switch, **off by default** (CTA-148); its best move played **only while Play is on, for the opponent's side** (`onBestMove`, `useAnalysisBoard`) | the pinned lines, the eval bar and the Engine tab; Play is disabled while the engine is off, and a step back pauses it |
 * | Tree view | `useVariationsExplorer` | Moves (side lines, comment marks, evals, the move menu), Map, the comment block, the next-moves bar and arrows — editing on, *Play chances…* off (nothing here plays by chance) |
 * | Saving | `useAnalysisBoard` — explicit | no autosave: the header's Save lights while the board differs from its record, and opens the changes strip (Update / Save as copy / Discard); a board with no record yet saves through a name-and-folder dialog |
 *
 * **Tabs: Moves · Map · Load · Export · Engine · Arrows.** Load brings a PGN (a file
 * or a paste — several games are merged onto the board or split into a
 * folder of saved analyses) or a FEN; Export copies the FEN, and copies or
 * downloads the PGN with or without comments, NAGs and side lines; Arrows
 * (CTA-98) switches the next-move arrows, picks what sizes them — a tag in
 * each move's comment (`[%eval]`, `[%games]`, `prc`), offered only while the
 * tree carries it, or the lines ahead — and their colours. The
 * saved list's panel hosts the position editor that starts a new analysis
 * from a custom position
 * ([`position-editor.md`](../../../../.claude/rules/position-editor.md) §4).
 *
 * **Arrivals, read once** (arriving at the URL is what mounts the screen, and
 * the screen writes its own URL as the reader moves): `?fen=` (a position —
 * the board turns to the side to move), `?game=` + `?move=` (a game out of a
 * catalog, re-read with `parsePgnTree` for its side lines; the ply or its
 * `StartPly`), `?analysis=<id>` (a saved analysis, where the reader left it,
 * facing the way it faced), and — not in the URL — a **whole tree handed over
 * in the location state** by the Openings explorer (`lib/analysisHandOff.ts`,
 * [`openings-explorer.md`](../../../../.claude/rules/openings-explorer.md) §5:
 * a new unsaved board, like a PGN loaded; kept on the screen's own URL writes
 * so a reload keeps it, until a load or a save names something else). **`?at=`** — the moves from the start as SAN
 * (`lib/repertoireLink.ts`) — is written back on every step with history
 * replace, so the address bar is always a permanent link to the position on
 * screen; it beats `?move=` and the record's own place on the way in. Once a
 * board is saved, its URL becomes `?analysis=<id>`.
 *
 * **The workspace** (CTA-145): an analysis opened from the saved list carries
 * where the list stood (`?folder=`, the table's sort) — `lib/analysesListContext.ts`
 * — and the board then takes the whole window with the list's tree on its left
 * (`AnalysesFolderView`), previous / next in a toolbar at its foot and a Close back to the
 * list (`.claude/rules/analysis-board.md` §1.2).
 */

/**
 * The tabs that stay mounted once opened — `BoardPanel`'s `keepMounted`: a long
 * move list is costly to mount, and the Map keeps where it was panned.
 */
const KEEP_MOUNTED = ["moves", "map"] as const;

/** Everything the URL (and a hand-off's location state) hands the screen, read once. */
const arrivalOf = (params: URLSearchParams, state: unknown): AnalysisBoardStart => {
  // A link nobody can read opens as if that parameter were not there.
  let fen: string | undefined;
  const requestedFen = params.get("fen");
  if (requestedFen !== null) {
    try {
      fen = parseFen(requestedFen);
    } catch {
      fen = undefined;
    }
  }

  const arrived = resolveGameReference(params.get("game"));
  let tree: GameTree | undefined;
  if (arrived !== undefined) {
    try {
      tree = parsePgnTree(arrived.pgn);
    } catch {
      tree = undefined;
    }
  }

  return {
    fen,
    tree,
    ply:
      parseMoveParam(params.get("move")) ??
      (arrived === undefined ? undefined : initialPlyOf(arrived.game)),
    resume: findSavedAnalysis(params.get("analysis")),
    handOff: analysisHandOffOf(state),
    at: params.get(REPERTOIRE_AT_PARAM),
  };
};

/** The URL parameters that carry where an analysis was opened from — kept when the board points its URL at a copy. */
const LIST_URL_KEYS: readonly string[] = LIST_CONTEXT_PARAMS;

type AnalysisBoardProps = {
  /** What the reader did to the workspace's tree — the route's, so it survives stepping to another analysis. */
  folderView: FolderViewState;
  onFolderViewChange: (state: FolderViewState) => void;
  /** The board pointed its own URL at this analysis (a save) — the route must not take that for a new arrival. */
  onPointUrl: (analysisId: string) => void;
};

function AnalysisBoard({ folderView, onFolderViewChange, onPointUrl }: AnalysisBoardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [arrival] = useState(() => arrivalOf(searchParams, location.state));

  const state = useAnalysisBoard(arrival);
  const { core, engine, record } = state;
  // The opening on screen, for the panel header (CTA-113: a hook and the `CurrentOpening` block).
  const currentOpening = useCurrentOpening(core.fen);

  const [tab, setTab] = useState("moves");
  // Opens as the record's settings say (on, colour only, classic for a new
  // board); the Arrows tab's choices are the session's.
  const [showArrows, setShowArrows] = useState(record?.showArrows ?? true);
  const [arrowWidthSource, setArrowWidthSource] = useState(
    record?.arrowWidthSource ?? DEFAULT_ARROW_WIDTH_SOURCE,
  );
  const [arrowPalette, setArrowPalette] = useState(record?.arrowPalette ?? DEFAULT_ARROW_PALETTE);
  // The move marks on the board (CTA-168): on, unless the record says otherwise.
  const [showMoveMarks, setShowMoveMarks] = useState(record?.showMoveMarks ?? true);
  // A tag no move in the tree carries is offered greyed out, and a choice of
  // one is kept but drawn as None — until a load or an edit brings it back.
  const availableWidthSources = useMemo(() => arrowWidthSourcesIn(core.tree), [core.tree]);
  const drawnWidthSource = availableWidthSources.has(arrowWidthSource) ? arrowWidthSource : "none";
  const [changesOpen, setChangesOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  // The strip closes itself once the changes are kept or dropped — adjusted
  // during render (`react-hooks/set-state-in-effect`).
  if (changesOpen && !state.changed) setChangesOpen(false);

  const name =
    record?.name || savedAnalysisDerivedName(core.tree.headers) || t("savedAnalyses.untitled");
  // A saved analysis is the page (CTA-112); a board with no record is just the board.
  usePageTitle(record === null ? undefined : name);

  /*
    The variations explorer (CTA-72): the parts are placed below. Editing is
    on — the menu's edits and the comment block's go through `replaceTree`,
    session changes like a move added — and *Play chances…* off: no trainer
    here plays by them. The map draws the session, the moves added since the
    baseline ringed, every dot a link.
  */
  const explorer = useVariationsExplorer({
    testId: "analysis",
    source: core,
    evalsByFen: engine.evalsByFen,
    extensionIds: state.extensionIds,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    moveMarks: showMoveMarks,
    arrows: { show: showArrows, widthSource: drawnWidthSource, palette: arrowPalette },
    map: { addedIds: state.extensionIds, linked: true },
  });
  const boardOptions: ChessboardOptions = { ...explorer.boardOptions, arrows: explorer.arrows };
  // A game's players, plated beside the board (CTA-148, as the Library's — CTA-105); a position, or an analysis no one is named in, has none.
  const playerPlates = useMemo(() => playerPlatesOf(core.tree.headers), [core.tree.headers]);
  const topLine = engine.analysis.lines.find((line) => line !== undefined);

  /*
    The URL, derived and written back with history replace: what the board
    *is* — the arrival's parameters, `?analysis=<id>` once it is a record,
    nothing once the reader loads something new — plus **`?at=`**, where the
    reader stands, so the address bar is always a permanent link. `?move=` is
    the arrival's alone; the link says where the reader is now. One write
    from one value, so a save and a step cannot race each other's URL.
  */
  const [urlBase, setUrlBase] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== REPERTOIRE_AT_PARAM && key !== "move") base[key] = value;
    });
    return base;
  });
  const linkedAt = useMemo(
    () => atParamOf(core.tree, core.nodeId),
    [core.tree, core.nodeId],
  );
  const wantedSearch = useMemo(
    () =>
      createSearchParams(
        linkedAt === "" ? urlBase : { ...urlBase, [REPERTOIRE_AT_PARAM]: linkedAt },
      ).toString(),
    [urlBase, linkedAt],
  );
  /*
    A hand-off's location state rides along on those writes — the browser
    keeps a history entry's state across a reload, so a reload reopens the
    handed-over tree — until the board is something else: a load or a save.
  */
  const [urlState, setUrlState] = useState<unknown>(() =>
    arrival.handOff === undefined ? null : location.state,
  );
  // Whether the entry carries a state is compared, not the state itself: the
  // browser's history hands back a clone, never the object that was written.
  const stateKept = (location.state ?? null) !== null;
  useEffect(() => {
    if (searchParams.toString() === wantedSearch && stateKept === (urlState !== null)) return;
    setSearchParams(wantedSearch, { replace: true, state: urlState });
  }, [wantedSearch, searchParams, setSearchParams, urlState, stateKept]);

  /** The URL of a board that is a record now: `?analysis=<id>`. */
  const pointUrlAt = (id: string) => {
    onPointUrl(id);
    // A copy is filed where the original is: where it was opened from still stands.
    setUrlBase((base) => ({
      ...Object.fromEntries(Object.entries(base).filter(([key]) => LIST_URL_KEYS.includes(key))),
      analysis: id,
    }));
    setUrlState(null);
  };

  /** A new board loaded: the URL no longer names what arrived. */
  const clearArrivalUrl = () => {
    setUrlBase({});
    setUrlState(null);
  };

  // Leaving with changes unsaved — a reload, a closed tab — asks first.
  useUnsavedWorkGuard(state.unsaved);

  /*
    **The workspace** (CTA-145): an analysis opened from the saved list carries
    where the list stood in the URL (`?folder=`, the table's sort) — read off
    what the board is *now*, so a Load, which drops the record and the URL's
    parameters, ends it. While there is one the list's tree is the board's
    left panel (`AnalysesFolderView`, rooted at that folder; a drawer under the shell's breakpoint,
    opened from the header) and previous / next walk the open analysis' folder
    in the table's order.
  */
  const compact = useShellCompact();
  const listContext = useMemo(() => listContextOf(new URLSearchParams(urlBase)), [urlBase]);
  const inWorkspace = listContext !== null && record !== null;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onSaveClick = () => {
    if (record === null) setSaveOpen(true);
    else setChangesOpen((open) => !open);
  };

  const saveCopy = async () => {
    const copy = await state.saveCopy(
      t("analysis.changes.copyName", { name: record?.name || name }),
    );
    if (copy !== undefined) pointUrlAt(copy.id);
  };

  const saveLabel = t(
    record === null
      ? "analysis.save.open"
      : state.changed
        ? "analysis.changes.saveOpen"
        : "analysis.changes.saveNothing",
  );

  return (
    <>
      <BoardShell
        id="analysis"
        core={core}
        score={topLine?.score ?? null}
        showEvalBar={state.engineOn && state.showEvalBar}
        playerPlates={playerPlates}
        boardOptions={boardOptions}
        overlay={explorer.overlay}
        panel={{
          header: (
            <>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  data-testid="analysis-name"
                  dir="auto"
                  sx={{ fontWeight: 700, lineHeight: 1.3 }}
                  noWrap
                >
                  {name}
                </Typography>
                {record !== null && record.description !== "" && (
                  // The reader's notes on it: one line here, all of it on hover.
                  <Typography
                    variant="caption"
                    data-testid="analysis-description"
                    dir="auto"
                    title={record.description}
                    sx={{ color: "text.secondary", display: "block" }}
                    noWrap
                  >
                    {record.description}
                  </Typography>
                )}
                <CurrentOpening {...currentOpening} oneLine testId="analysis-current-opening" />
              </Box>
              {inWorkspace && compact && (
                // Under the breakpoint the tree — and its previous / next toolbar — is a drawer; wide, it is the board's column.
                <IconAction
                  label={t("analysis.folderView.toggle")}
                  onClick={() => setDrawerOpen(true)}
                  popupOpen={drawerOpen}
                  testId="analysis-folder-view-toggle"
                >
                  <AccountTreeOutlinedIcon fontSize="small" />
                </IconAction>
              )}
              <ToggleIconAction
                label={saveLabel}
                onClick={onSaveClick}
                disabled={!state.canSave}
                active={state.unsaved}
                // Over a record Save opens the changes strip, a toggle; a new board's opens a dialog.
                pressed={record !== null && state.changed ? changesOpen : null}
                testId="analysis-save"
              >
                <SaveRoundedIcon fontSize="small" />
              </ToggleIconAction>
              <PlayToggleButton
                testId="analysis-play"
                engineOn={state.engineOn}
                playing={state.playing}
                thinking={state.thinking}
                onToggle={state.togglePlaying}
              />
              {record !== null && (
                // Its settings — off while there are unsaved changes, which leaving the board would lose.
                <IconAction
                  label={t(state.unsaved ? "analysis.settingsLink.unsaved" : "analysis.settingsLink.open")}
                  link={{
                    component: RouterLink,
                    to: `/tools/analysis/saved/${encodeURIComponent(record.id)}/settings`,
                    state: { from: `${location.pathname}${location.search}` },
                  }}
                  disabled={state.unsaved}
                  testId="analysis-settings"
                >
                  <SettingsRoundedIcon fontSize="small" />
                </IconAction>
              )}
              <SwitchField
                size="small"
                label={t("analysis.engineSwitch")}
                checked={state.engineOn}
                onChange={state.setEngineOn}
                // The board's tests reach the input inside the switch.
                testIdOn="control"
                testId="analysis-setting-engine"
              />
            </>
          ),
          analysis: engine.analysis,
          requestedMultiPv: state.settings.multiPv,
          engineOn: state.engineOn,
          // Present, so the pinned lines are clickable (CTA-55).
          onPlayVariation: core.playVariation,
          activeTab: tab,
          onTabChange: setTab,
          keepMounted: KEEP_MOUNTED,
          tabs: [
            { id: "moves", label: t("analysis.tabs.moves"), content: explorer.moves },
            { id: "map", label: t("analysis.tabs.map"), content: explorer.map },
            {
              id: "load",
              label: t("analysis.tabs.load"),
              content: (
                <AnalysisLoad
                  onLoadTree={(tree) => {
                    state.loadNew(tree);
                    clearArrivalUrl();
                  }}
                  onLoadFen={(fen) => {
                    state.loadFen(fen);
                    clearArrivalUrl();
                  }}
                  onCollectionSaved={(collectionId) =>
                    navigate(`/library/${encodeURIComponent(collectionId)}`)
                  }
                  onAnalysesSaved={(folderId) =>
                    navigate(`/tools/analysis/saved?folder=${encodeURIComponent(folderId)}`)
                  }
                />
              ),
            },
            {
              id: "export",
              label: t("analysis.tabs.export"),
              content: (
                <PgnExportPanel
                  fen={core.fen}
                  tree={core.tree}
                  onDownload={(pgn) => downloadPgn(slugify(name) || "analysis", [pgn])}
                  testId="analysis"
                />
              ),
            },
            {
              id: "engine",
              label: t("analysis.tabs.engine"),
              content: (
                <AnalysisEngineForm
                  testId="analysis"
                  settings={state.settings}
                  onChange={state.updateSettings}
                  engineOptions={engine.engineOptions}
                  engineOn={state.engineOn}
                  showEvalBar={state.showEvalBar}
                  onShowEvalBarChange={state.setShowEvalBar}
                  deviceLimits={deviceEngineLimits()}
                  onClear={() => {
                    state.clearBoard();
                    clearArrivalUrl();
                  }}
                />
              ),
            },
            {
              id: "arrows",
              label: t("analysis.tabs.arrows"),
              content: (
                <AnalysisArrows
                  showArrows={showArrows}
                  onShowArrowsChange={setShowArrows}
                  widthSource={arrowWidthSource}
                  onWidthSourceChange={setArrowWidthSource}
                  available={availableWidthSources}
                  palette={arrowPalette}
                  onPaletteChange={setArrowPalette}
                  showMoveMarks={showMoveMarks}
                  onShowMoveMarksChange={setShowMoveMarks}
                />
              ),
            },
          ],
          footer: (
            <>
              {explorer.annotations}
              {record !== null && state.changed && changesOpen && (
                <ChangesStrip
                  testId="analysis-changes"
                  labelKey="analysis.changes"
                  summary={
                    state.extensionIds.size === 0
                      ? t("analysis.changes.edited")
                      : t("analysis.changes.added", { count: state.extensionIds.size })
                  }
                  problem={state.problem}
                  onUpdate={() => void state.update()}
                  onCopy={() => void saveCopy()}
                  onDiscard={state.discard}
                />
              )}
              {record === null && state.problem !== null && (
                <Box sx={{ px: 1 }}>
                  <StatusText tone="error" testId="analysis-save-problem">
                    {t(`analysis.changes.problem.${state.problem}`)}
                  </StatusText>
                </Box>
              )}
              {/* Play's status — the engine thinking, or the reader's move. */}
              {state.playing && (
                <EngineThinking
                  testId="analysis-play"
                  thinking={state.thinking}
                  depth={engine.analysis.fen === core.fen ? engine.analysis.depth : 0}
                />
              )}
              {tab === "moves" && explorer.nextMoves}
            </>
          ),
        }}
      />
      {inWorkspace && (
        <AnalysesFolderView
          context={listContext}
          record={record}
          locked={state.unsaved}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          state={folderView}
          onStateChange={onFolderViewChange}
        />
      )}
      <SaveAnalysisDialog
        open={saveOpen}
        initialName={savedAnalysisDerivedName(core.tree.headers)}
        onSave={async (typed, folderId) => {
          const saved = await state.saveNew(typed, folderId, {
            showArrows,
            arrowWidthSource,
            arrowPalette,
            showMoveMarks,
          });
          if (saved !== undefined) pointUrlAt(saved.id);
        }}
        onClose={() => setSaveOpen(false)}
      />
    </>
  );
}

/**
 * The route: the board, once what its URL names can be read. The saved
 * analyses are IndexedDB's (CTA-77) and a read is a promise, so an arrival
 * that names one — `?analysis=<id>`, or `?game=analysis/…` — waits for the
 * store's first read rather than opening a blank board and calling the
 * record missing; so does a Library game (`?game=library/<collection>/<n>`),
 * whose collection's games are read lazily. Every other arrival mounts at once.
 */
function AnalysisBoardRoute() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const game = searchParams.get("game");
  const analysisParam = searchParams.get("analysis");
  const waitsForAnalyses = analysisParam !== null || isAnalysisReference(game);
  // The workspace's tree is the folders and the analyses: both are read before the board opens.
  const waitsForFolders = analysisParam !== null && searchParams.get(LIST_FOLDER_PARAM) !== null;
  const [ready, setReady] = useState(
    () =>
      (!waitsForAnalyses || savedAnalysesSnapshot() !== undefined) &&
      (!waitsForFolders || analysisFoldersSnapshot() !== undefined) &&
      isReferenceRead(game),
  );
  useEffect(() => {
    if (ready) return;
    let live = true;
    void Promise.all([
      waitsForAnalyses ? loadSavedAnalyses() : undefined,
      waitsForFolders ? loadAnalysisFolders() : undefined,
      loadReferencedGames(game),
    ]).then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, [ready, waitsForAnalyses, waitsForFolders, game]);

  /*
    **A board is read from its arrival once** — so a URL that names another
    analysis (a link in the workspace's tree, the browser's Back between two) gets a new
    board, keyed by `generation`. The board's own URL writes do not: when it
    saves a copy it points the URL at it and says so (`onPointUrl`), and the
    arrival that follows is its own. Adjusted during render against the last
    analysis seen, as `Layout.tsx` follows the location.
  */
  const [generation, setGeneration] = useState(0);
  const [seenAnalysis, setSeenAnalysis] = useState(analysisParam);
  const [ownedAnalysis, setOwnedAnalysis] = useState<string | null>(null);
  if (analysisParam !== seenAnalysis) {
    setSeenAnalysis(analysisParam);
    if (analysisParam !== null && analysisParam !== ownedAnalysis) setGeneration((n) => n + 1);
    if (ownedAnalysis !== null) setOwnedAnalysis(null);
  }
  // The workspace's tree as the reader left it — opened folders, pages — across the boards he steps through.
  const [folderView, setFolderView] = useState(INITIAL_FOLDER_VIEW);

  if (!ready) {
    return (
      <Typography data-testid="analysis-loading" sx={{ color: "text.secondary", p: 2 }}>
        {t("savedAnalyses.loading")}
      </Typography>
    );
  }
  return (
    <AnalysisBoard
      key={generation}
      folderView={folderView}
      onFolderViewChange={setFolderView}
      onPointUrl={setOwnedAnalysis}
    />
  );
}

export default AnalysisBoardRoute;
