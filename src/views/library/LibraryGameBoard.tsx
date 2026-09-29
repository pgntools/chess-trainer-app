import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useCurrentOpening } from "../shared/useCurrentOpening";
import type { ChessboardOptions } from "react-chessboard";

import { ChangesStrip, CurrentOpening, EngineThinking, GameInfo, PgnExportPanel, PlayToggleButton } from "../../blocks/panels";
import { AnalysisEngineForm } from "../../blocks/forms";
import { SwitchField } from "../../design-system/components/forms";
import { BackButton } from "../../design-system/components/navigation";
import { IconAction, ToggleIconAction } from "../../design-system/components/toolbars";
import { downloadPgn } from "../../lib/pgnExport";
import { indexGame } from "../../lib/collectionIndex";
import { initialPlyOf } from "../../lib/gameNavigation";
import { libraryGameReference } from "../../lib/gameReference";
import { mainlineGame, sanPathTo, treeToPgn, type GameTree } from "../../lib/gameTree";
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
import { newSavedAnalysisId, savedAnalysisOf } from "../../lib/savedAnalyses";
import { saveAnalysis } from "../../lib/savedAnalysisStore";
import BoardShell from "../board/core/BoardShell";
import { useVariationsExplorer } from "../explorer/useVariationsExplorer";
import type { PlayerPlates } from "../shared/PlayerPlate";
import { playerResultsOf } from "../shared/playerResults";
import { useAnalysisSession } from "../tools/analysis/useAnalysisSession";
import { usePageTitle } from "../main/pageTitle";

/**
 * **A Library game** (`/library/<collection>/<game>`, CTA-75) — a game of a
 * collection on a **full analysis board**, composed exactly as the Analysis
 * Board is ([`chessboard.md`](../../../.claude/rules/chessboard.md) §9.4 —
 * no behaviour hook of its own):
 *
 * | Capability | Taken |
 * | --- | --- |
 * | Base + engine + Play + baseline | `useAnalysisSession` — the Analysis Board's own session: `useBoardCore`, `useEngineModule` (on), `usePlayToggle` (off at the start) |
 * | Tree view | `useVariationsExplorer` — Moves, Map, the comment block, the next-moves bar, the arrows, the move menu; editing on, *Play chances…* off |
 * | Shell | `BoardShell` / `BoardPanel` — tabs Moves (with the next-move arrows' switch) · Map · Info · Export · Engine |
 *
 * The Export tab also hands the game to the **Analysis Board**
 * (`?game=library/<collection>/<n>`, CTA-77) at the position on screen
 * (`?at=`) — the game as the collection holds it, not this session's changes.
 *
 * The players are **plated beside the board** (CTA-105), at the left end of
 * the captured-pieces strips: each one's result of the game, a thin
 * separator, their Elo and their name (`1 | 2850 Carlsen, Magnus`), the top
 * plate the player the orientation puts at the top. The panel's header names
 * the game no more — its first line is the "Game n of m" caption — and
 * `gameTitleOf` stays for the export's file stem and the shipped "Save as
 * copy" name.
 *
 * **Nothing is written unless the reader asks**, and what may be written
 * depends on where the collection came from — the changes strip, opened by
 * the header's Save while the tree differs from the game as it arrived:
 *
 * - an **uploaded** collection's game: **Update** (the game is rewritten in
 *   place in the collection), **Save as copy** (a copy inserted right after
 *   it, and the board goes on in the copy) or **Discard** — each write taking
 *   the game's new index row with it (`indexGame`), so the table is in step;
 * - a **shipped** collection's game is read-only: **Save as copy** writes it
 *   into **Saved analyses** and opens it there (`?analysis=<id>`), or
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
};

function LibraryGameBoard({ collection, number, tree }: LibraryGameBoardProps) {
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

  const [tab, setTab] = useState("moves");
  const [showArrows, setShowArrows] = useState(true);
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
    arrows: { show: showArrows },
    map: { addedIds: session.extensionIds, linked: true },
  });
  const boardOptions: ChessboardOptions = { arrows: explorer.arrows };
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
  useEffect(() => {
    if (!session.changed) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [session.changed]);

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

  /** **Save as copy** — beside the original in an upload; into Saved analyses from a shipped file. */
  const saveCopy = async () => {
    if (shipped) {
      const record = {
        ...savedAnalysisOf(
          newSavedAnalysisId(),
          core.tree,
          sanPathTo(core.tree, core.nodeId),
          session.settings,
          core.orientation,
        ),
        name: t("library.shippedChanges.copyName", { name: title }),
        showArrows,
      };
      const failed = await saveAnalysis(record);
      if (failed !== undefined) {
        setProblem(failed);
        return;
      }
      navigate(`/tools/analysis?analysis=${encodeURIComponent(record.id)}`);
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

  return (
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
            <BackButton
              label={t("library.game.back", { name: collection.name })}
              link={{ component: RouterLink, to: tablePath }}
              testId="library-game-back"
            />
            {/* The players live on the board's plates (CTA-105); the header's
                own line is the caption. */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                data-testid="library-game-caption"
                dir="auto"
                title={caption}
                sx={{ color: "text.secondary", display: "block" }}
                noWrap
              >
                {t("library.game.of", { number, count: collection.games.length })}
                {caption === "" ? "" : ` · ${caption}`}
              </Typography>
              <CurrentOpening {...currentOpening} testId="library-game-current-opening" />
            </Box>
            <IconAction
              label={t("library.game.previous")}
              link={{ component: RouterLink, to: gamePath(number - 1), state: location.state }}
              disabled={number <= 1}
              testId="library-game-previous"
            >
              <NavigateBeforeRoundedIcon fontSize="small" />
            </IconAction>
            <IconAction
              label={t("library.game.next")}
              link={{ component: RouterLink, to: gamePath(number + 1), state: location.state }}
              disabled={number >= collection.games.length}
              testId="library-game-next"
            >
              <NavigateNextRoundedIcon fontSize="small" />
            </IconAction>
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
            <SwitchField
              size="small"
              label={t("library.game.engineSwitch")}
              checked={session.engineOn}
              onChange={session.setEngineOn}
              // The board's tests reach the input inside the switch.
              testIdOn="control"
              testId="library-game-setting-engine"
            />
          </>
        ),
        analysis: engine.analysis,
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
            content: (
              <>
                <Box sx={{ px: 1 }}>
                  <SwitchField
                    size="small"
                    label={t("library.game.arrows")}
                    checked={showArrows}
                    onChange={setShowArrows}
                    testIdOn="control"
                    testId="library-game-arrows"
                  />
                </Box>
                {explorer.moves}
              </>
            ),
          },
          { id: "map", label: t("library.game.tabs.map"), content: explorer.map },
          {
            id: "info",
            label: t("library.game.tabs.info"),
            content: <GameInfo game={mainlineGame(core.tree)} testId="game-info" />,
          },
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
                    component={RouterLink}
                    to={`/tools/analysis?${new URLSearchParams({
                      game: libraryGameReference(collection.id, number),
                      ...(linkedAt === "" ? {} : { [REPERTOIRE_AT_PARAM]: linkedAt }),
                    }).toString()}`}
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
          {
            id: "engine",
            label: t("library.game.tabs.engine"),
            content: (
              <AnalysisEngineForm
                testId="analysis"
                settings={session.settings}
                onChange={session.updateSettings}
                engineOptions={engine.engineOptions}
                engineOn={session.engineOn}
                showEvalBar={session.showEvalBar}
                onShowEvalBarChange={session.setShowEvalBar}
              />
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
  );
}

export default LibraryGameBoard;
