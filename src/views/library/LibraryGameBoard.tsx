import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useCurrentOpening } from "../shared/useCurrentOpening";
import type { ChessboardOptions } from "react-chessboard";

import {
  ChangesStrip,
  CurrentOpening,
  EngineThinking,
  LibraryGameDetails,
  PgnExportPanel,
  PlayToggleButton,
  type LibraryGameDetailsTab,
} from "../../blocks/panels";
import { visuallyHidden } from "../../design-system/components/a11y";
import { SwitchField } from "../../design-system/components/forms";
import { IconAction, ToggleIconAction } from "../../design-system/components/toolbars";
import { downloadPgn } from "../../lib/pgnExport";
import { indexGame } from "../../lib/collectionIndex";
import { initialPlyOf } from "../../lib/gameNavigation";
import { mainlineGame, treeToPgn, type GameTree } from "../../lib/gameTree";
import {
  insertCollectionGame,
  replaceCollectionGame,
} from "../../lib/libraryCollectionStore";
import {
  collectionRowOf,
  gameTitleOf,
  type LibraryCollection,
} from "../../lib/libraryCollections";
import { slugify } from "../../lib/pgnText";
import { atParamOf, nodeAtParam, REPERTOIRE_AT_PARAM } from "../../lib/repertoireLink";
import BoardShell from "../board/core/BoardShell";
import { useVariationsExplorer } from "../explorer/useVariationsExplorer";
import type { PlayerPlates } from "../shared/PlayerPlate";
import { playerResultsOf } from "../shared/playerResults";
import { useAnalysisSession } from "../board/core/useAnalysisSession";
import { useSendToAnalysis } from "../analysisV2/useSendToAnalysis";
import { BoardLeftPanel } from "../main/boardLeftPanel";
import { usePageTitle } from "../main/pageTitle";
import { useShellCompact } from "../main/shellCompact";
import { useUnsavedWorkGuard } from "../main/unsavedWork";

/**
 * **A Library game** (`/library/<collection>/<game>`, CTA-75) — a game of a
 * collection on a **full analysis board**, composed exactly as the Analysis
 * Board is ([`chessboard.md`](../../../.claude/rules/chessboard.md) §9.4 —
 * no behaviour hook of its own):
 *
 * | Capability | Taken |
 * | --- | --- |
 * | Base + engine + Play + baseline | `useAnalysisSession` — the Analysis Board's own session: `useBoardCore`, `useEngineModule` (off until switched on), `usePlayToggle` (off at the start) |
 * | Tree view | `useVariationsExplorer` — Moves, Map, the comment block, the next-moves bar, the arrows, the move menu; editing on, *Play chances…* off |
 * | Shell | `BoardShell` / `BoardPanel` — tabs Moves · Map · Export (no Engine tab since CTA-181: the search settings are the top bar's Engine menu) |
 * | Left panel | `BoardLeftPanel`, `keepShell` (CTA-209) — the `LibraryGameDetails` block: Back, the game's title and caption, previous / next; tabs Settings (the next-move arrows, the move marks, the eval bar) · Info (the tags) |
 *
 * The Export tab also hands the game to **Analysis** (CTA-77, a Case since
 * CTA-192: a Project picked, `useSendToAnalysis`) at the position on screen —
 * the game as the collection holds it, not this session's changes.
 *
 * The players are **plated beside the board** (CTA-105), at the left end of
 * the captured-pieces strips: each one's result of the game, a thin
 * separator, their Elo and their name (`1 | 2850 Carlsen, Magnus`), the top
 * plate the player the orientation puts at the top.
 *
 * **The left panel** (CTA-209) is the game's own view, as the Case board's
 * and the repertoire player's: the shell's header and its Engine menu kept
 * (`keepShell`), a drawer under the breakpoint opened from the right panel's
 * header. Its head is Back to the table (`state.from`, kept), the game's
 * title (`gameTitleOf`), "Game n of m · event · round · date · result" and
 * previous / next (keeping `location.state`); its tabs Settings and Info. Its
 * open tab and drawer are the route's (`LibraryGameScreen`), above this keyed
 * board, so they outlive a step to another game. The right panel's header
 * keeps the drawer's button, the opening on screen, Save, Play and the
 * engine's on / off — a switch, as the Case board's (CTA-199); the eval bar's
 * switch is the left panel's Settings tab's.
 *
 * **Nothing is written unless the reader asks**, and what may be written
 * depends on where the collection came from — the changes strip, opened by
 * the header's Save while the tree differs from the game as it arrived:
 *
 * - an **uploaded** collection's game: **Update** (the game is rewritten in
 *   place in the collection), **Save as copy** (a copy inserted right after
 *   it, and the board goes on in the copy) or **Discard** — each write taking
 *   the game's new index row with it (`indexGame`), so the table is in step;
 * - a **shipped** collection's game is read-only: **Save as copy** makes it
 *   a Game Case in a Project the reader picks and opens it there (CTA-192), or
 *   **Discard**.
 *
 * `?at=` — the moves from the start as SAN — is read on arrival and written
 * back on every step (history replace), so the address is a permanent link to
 * the position on screen. Without one, a game opens at its `StartPly` tag
 * (`initialPlyOf`), else at its start.
 */

const KEEP_MOUNTED = ["moves", "map"] as const;

type LibraryGameBoardProps = {
  collection: LibraryCollection;
  /** 1-based: the game's place in the collection. */
  number: number;
  /** The game, parsed with its side lines. */
  tree: GameTree;
  /** The left panel's open tab — the route's, so it outlives a step to another game. */
  detailsTab: LibraryGameDetailsTab;
  onDetailsTabChange: (tab: LibraryGameDetailsTab) => void;
  /** Under the shell's breakpoint: whether the left panel's drawer is open — the route's too. */
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
};

function LibraryGameBoard({
  collection,
  number,
  tree,
  detailsTab,
  onDetailsTabChange,
  drawerOpen,
  onDrawerOpenChange,
}: LibraryGameBoardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Where it opens: a `?at=` link, else the game's own `StartPly` tag, else its start.
  const [start] = useState(() => ({
    nodeId: nodeAtParam(tree, searchParams.get(REPERTOIRE_AT_PARAM)) ?? undefined,
    ply: initialPlyOf(mainlineGame(tree)),
  }));

  const session = useAnalysisSession({ tree, nodeId: start.nodeId, ply: start.ply });
  const { core, engine } = session;
  // The opening on screen, for the panel header (CTA-113: a hook and the `CurrentOpening` block).
  const currentOpening = useCurrentOpening(core.fen);
  const compact = useShellCompact();

  const [tab, setTab] = useState("moves");
  const [showArrows, setShowArrows] = useState(true);
  // The move marks on the board (CTA-168), the session's like the arrows; a copy keeps both.
  const [showMoveMarks, setShowMoveMarks] = useState(true);
  const [changesOpen, setChangesOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // The strip closes itself once the changes are kept or dropped.
  if (changesOpen && !session.changed) setChangesOpen(false);

  const shipped = collection.source === "shipped";
  const row = useMemo(
    () => collectionRowOf(collection.games[number - 1] ?? "", number),
    [collection, number],
  );
  const title = gameTitleOf(row);
  usePageTitle(title);
  const caption = [row.event, row.round, row.date, row.result].filter(Boolean).join(" · ");
  // The players, plated beside the board (CTA-105) — everything of it is on
  // the memoized row already.
  const results = playerResultsOf(row.result);
  const playerPlates: PlayerPlates = {
    white: { name: row.white ?? "?", elo: row.whiteElo, result: results.white },
    black: { name: row.black ?? "?", elo: row.blackElo, result: results.black },
  };

  const explorer = useVariationsExplorer({
    testId: "library-game",
    source: core,
    evalsByFen: engine.evalsByFen,
    extensionIds: session.extensionIds,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    moveMarks: showMoveMarks,
    arrows: { show: showArrows },
    map: { addedIds: session.extensionIds, linked: true },
  });
  const boardOptions: ChessboardOptions = { ...explorer.boardOptions, arrows: explorer.arrows };
  const topLine = engine.analysis.lines.find((line) => line !== undefined);

  /* `?at=`, written back with history replace — keeping the route's state (the table's URL). */
  const linkedAt = useMemo(() => atParamOf(core.tree, core.nodeId), [core.tree, core.nodeId]);
  useEffect(() => {
    if ((searchParams.get(REPERTOIRE_AT_PARAM) ?? "") === linkedAt) return;
    const next = new URLSearchParams(searchParams);
    if (linkedAt === "") next.delete(REPERTOIRE_AT_PARAM);
    else next.set(REPERTOIRE_AT_PARAM, linkedAt);
    setSearchParams(next, { replace: true, state: location.state });
  }, [linkedAt, searchParams, setSearchParams, location.state]);

  // Leaving with changes unsaved — a reload, a closed tab — asks first.
  useUnsavedWorkGuard(session.changed);

  const from = (location.state as { from?: string } | null)?.from;
  const tablePath = from ?? `/library/${encodeURIComponent(collection.id)}`;
  const gamePath = (other: number) => `/library/${encodeURIComponent(collection.id)}/${other}`;

  /** **Update** — an uploaded collection's game, rewritten in place. */
  const update = async () => {
    const tree = core.tree;
    const pgn = treeToPgn(tree);
    const failed = await replaceCollectionGame(collection.id, number, pgn, await indexGame(pgn));
    if (failed !== undefined) {
      setProblem(failed);
      return;
    }
    setProblem(null);
    session.rebase(tree);
  };

  /** Into Analysis: a Game Case in a Project the reader picks, a new one named after the collection. */
  const analysis = useSendToAnalysis("library-game-send");

  /** **Save as copy** — beside the original in an upload; into Analysis from a shipped file. */
  const saveCopy = async () => {
    if (shipped) {
      analysis.send({
        games: [
          {
            tree: core.tree,
            nodeId: core.nodeId,
            orientation: core.orientation,
            name: t("library.shippedChanges.copyName", { name: title }),
            display: { showArrows, showMoveMarks },
          },
        ],
        projectName: collection.name,
      });
      return;
    }
    const pgn = treeToPgn(core.tree);
    const failed = await insertCollectionGame(collection.id, number + 1, pgn, await indexGame(pgn));
    if (failed !== undefined) {
      setProblem(failed);
      return;
    }
    const at = linkedAt === "" ? "" : `?${REPERTOIRE_AT_PARAM}=${encodeURIComponent(linkedAt)}`;
    navigate(`${gamePath(number + 1)}${at}`, { state: location.state });
  };

  const discard = () => {
    session.discard();
    setProblem(null);
  };

  const saveLabel = t(session.changed ? "library.changes.saveOpen" : "library.changes.saveNothing");
  const labelKey = shipped ? "library.shippedChanges" : "library.changes";

  /*
    The left panel (CTA-209): the game's own view — its head and the
    session's settings and tags — in the main menu's place, the shell's
    header and its Engine menu kept (`keepShell`, as the Case board's and the
    repertoire player's); a drawer under the breakpoint. Its tab and drawer
    are the route's; the session's state is this board's, handed in as props.
  */
  const game = useMemo(() => mainlineGame(core.tree), [core.tree]);
  const leftPanel = (
    <BoardLeftPanel
      collapsed={false}
      open={drawerOpen}
      onClose={() => onDrawerOpenChange(false)}
      drawerLabel={t("library.game.details.label", { name: title })}
      keepShell
    >
      <LibraryGameDetails
        title={title}
        collectionName={collection.name}
        number={number}
        count={collection.games.length}
        caption={caption}
        backLink={{ component: RouterLink, to: tablePath }}
        previousLink={number <= 1 ? undefined : { component: RouterLink, to: gamePath(number - 1), state: location.state }}
        nextLink={
          number >= collection.games.length
            ? undefined
            : { component: RouterLink, to: gamePath(number + 1), state: location.state }
        }
        tab={detailsTab}
        onTabChange={onDetailsTabChange}
        showArrows={showArrows}
        onShowArrowsChange={setShowArrows}
        showMoveMarks={showMoveMarks}
        onShowMoveMarksChange={setShowMoveMarks}
        showEvalBar={session.showEvalBar}
        onShowEvalBarChange={session.setShowEvalBar}
        game={game}
        testId="library-game-details"
      />
    </BoardLeftPanel>
  );

  return (
    <>
      {leftPanel}
      <BoardShell
        id="library-game"
        core={core}
        score={topLine?.score ?? null}
        showEvalBar={session.engineOn && session.showEvalBar}
        boardOptions={boardOptions}
        playerPlates={playerPlates}
        overlay={explorer.overlay}
        panel={{
          header: (
            <>
              {compact && (
                // Under the breakpoint the game's own view is a drawer; wide, the board's own column.
                <IconAction
                  label={t("library.game.details.toggle")}
                  onClick={() => onDrawerOpenChange(true)}
                  popupOpen={drawerOpen}
                  popupKind="dialog"
                  testId="library-game-details-toggle"
                >
                  <TuneRoundedIcon fontSize="small" />
                </IconAction>
              )}
              {analysis.dialog}
              {/* The opening on screen at the toolbar's start; the game's title, caption and previous / next are the left panel's. */}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <CurrentOpening {...currentOpening} testId="library-game-current-opening" />
              </Box>
              <ToggleIconAction
                label={saveLabel}
                onClick={() => setChangesOpen((open) => !open)}
                disabled={!session.changed}
                active={session.changed}
                // Pressed while its changes strip is open.
                pressed={session.changed ? changesOpen : null}
                testId="library-game-save"
              >
                <SaveRoundedIcon fontSize="small" />
              </ToggleIconAction>
              <PlayToggleButton
                testId="library-game-play"
                engineOn={session.engineOn}
                playing={session.playing}
                thinking={session.thinking}
                onToggle={session.togglePlaying}
              />
              {/* The engine's on / off — a small switch, as the Case board's; the eval bar is the left panel's Settings tab's. */}
              <Box sx={{ flexShrink: 0 }}>
                <SwitchField
                  size="small"
                  // The top bar's Engine icon for the word — "Engine" on a hover, and read from the
                  // hidden word — neutral at its 0.56 while off, the primary colour while on.
                  label={
                    <Box component="span" title={t("library.game.details.engine")} sx={{ display: "flex" }}>
                      <SmartToyRoundedIcon
                        fontSize="small"
                        color={session.engineOn ? "primary" : "inherit"}
                        aria-hidden
                        sx={{ display: "block", opacity: session.engineOn ? 1 : 0.56 }}
                      />
                      <Box component="span" sx={visuallyHidden}>
                        {t("library.game.details.engine")}
                      </Box>
                    </Box>
                  }
                  checked={session.engineOn}
                  onChange={session.setEngineOn}
                  testId="library-game-setting-engine"
                />
              </Box>
            </>
          ),
          analysis: engine.analysis,
          // The depth chip fills toward where the search stops (CTA-195).
          searchProgress: engine.searchProgress,
          requestedMultiPv: session.settings.multiPv,
          engineOn: session.engineOn,
          onPlayVariation: core.playVariation,
          activeTab: tab,
          onTabChange: setTab,
          keepMounted: KEEP_MOUNTED,
          tabs: [
            {
              id: "moves",
              label: t("library.game.tabs.moves"),
              content: explorer.moves,
            },
            { id: "map", label: t("library.game.tabs.map"), content: explorer.map },
            {
              id: "export",
              label: t("library.game.tabs.export"),
              content: (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "grid", gap: 0.5, justifyItems: "start" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<OpenInNewRoundedIcon fontSize="small" />}
                      onClick={() =>
                        analysis.send({
                          // The game as the collection holds it, at the position on screen.
                          games: [{ tree, nodeId: nodeAtParam(tree, linkedAt), orientation: core.orientation }],
                          projectName: collection.name,
                        })
                      }
                      data-testid="library-game-open-analysis"
                    >
                      {t("library.game.openAnalysis")}
                    </Button>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {t(session.changed ? "library.game.openAnalysisChanged" : "library.game.openAnalysisHelp")}
                    </Typography>
                  </Box>
                  <PgnExportPanel
                    fen={core.fen}
                    tree={core.tree}
                    onDownload={(pgn) => downloadPgn(slugify(title) || "game", [pgn])}
                    testId="analysis"
                  />
                </Box>
              ),
            },
          ],
          footer: (
            <>
              {explorer.annotations}
              {session.changed && changesOpen && (
                <ChangesStrip
                  testId="library-game-changes"
                  labelKey={labelKey}
                  readOnly={shipped}
                  summary={
                    session.extensionIds.size === 0
                      ? t("library.changes.edited")
                      : t("library.changes.added", { count: session.extensionIds.size })
                  }
                  problem={problem}
                  onUpdate={() => void update()}
                  onCopy={() => void saveCopy()}
                  onDiscard={discard}
                />
              )}
              {session.playing && (
                <EngineThinking
                  testId="analysis-play"
                  thinking={session.thinking}
                  depth={engine.analysis.fen === core.fen ? engine.analysis.depth : 0}
                />
              )}
              {tab === "moves" && explorer.nextMoves}
            </>
          ),
        }}
      />
    </>
  );
}

export default LibraryGameBoard;
