import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import { DEFAULT_POSITION } from "chess.js";
import { createSearchParams, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useCurrentOpening } from "../shared/useCurrentOpening";
import type { ChessboardOptions } from "react-chessboard";

import { BoardEngineControls, CurrentOpening, EngineThinking, PgnExportPanel, PlayToggleButton } from "../../blocks/panels";
import { OpeningBookList } from "../../blocks/lists";
import { SwitchField } from "../../design-system/components/forms";
import { IconAction } from "../../design-system/components/toolbars";
import { downloadPgn } from "../../lib/pgnExport";
import { useChessTokens } from "../../design-system/theme";
import { parseFen } from "../../lib/fen";
import type { GameTree } from "../../lib/gameTree";
import { atParamOf, atParamSans, lineTreeOf, nodeAtParam, REPERTOIRE_AT_PARAM } from "../../lib/repertoireLink";
import BoardShell from "../board/core/BoardShell";
import { turnOf } from "../board/core/useBoardCore";
import { useOpeningBookModule } from "../board/core/useOpeningBookModule";
import { useVariationsExplorer } from "../explorer/useVariationsExplorer";
import { ClearBoardButton } from "../shared/ClearBoardButton";
import { useAnalysisSession } from "../board/core/useAnalysisSession";
import { useSendToAnalysis } from "../analysisV2/useSendToAnalysis";
import { openingArrowsOf } from "./openingArrows";
import OpeningsLoad from "./OpeningsLoad";

/**
 * **The Openings explorer** (`/openings`, CTA-78) — an opening played through
 * on a full analysis board, with the book's continuations from the position
 * on screen beside it. Composed as the Library's game board is
 * ([`chessboard.md`](../../../.claude/rules/chessboard.md) §9.4 — no
 * behaviour hook of its own):
 *
 * | Capability | Taken |
 * | --- | --- |
 * | Base + engine + Play | `useAnalysisSession` — the Analysis Board's own session: `useBoardCore`, `useEngineModule` (off until switched on), `usePlayToggle` (off at the start) |
 * | Book | `useOpeningBookModule` — eco.json's continuations from the position on screen, listed in the Book tab (a click plays one, from any node — an earlier position branches) and drawn as arrows |
 * | Tree view | `useVariationsExplorer` — Moves, Map, the comment block, the next-moves bar, the arrows, the move menu; editing on, *Play chances…* off |
 * | Shell | `BoardShell` / `BoardPanel` — tabs Book · Moves (with the next-move arrows' switch) · Map · Load (and Clear) · Export (no Engine tab since CTA-181: the search settings are the top bar's Engine menu, the eval bar the header's engine menu) |
 *
 * **Nothing is kept.** An opening is explored, not filed: there is no Save,
 * no changes strip and no folders, and the Load tab merges a text of several
 * games but never splits it. What the reader wants to
 * keep goes on to **Analysis** — the header's button hands the whole tree
 * over (side lines, comments) as a new Game Case in a Project the reader
 * picks, opened at the position on screen and facing the board's side
 * (`useSendToAnalysis`, CTA-192). "Play from here" hands the position on
 * screen to Play with Engine as `?fen=`.
 *
 * **Arrivals, read once**: `?fen=` (`CurrentOpening`'s ECO chip — validated with `parseFen`; a position turns
 * the board to the side to move) and **`?at=`** — the moves from that start as
 * SAN. The URL is written back with history replace on every step — `?fen=`
 * when the tree does not start at the standard position, `?at=` where the
 * reader stands — so the address is a link to the line on screen. (A link
 * carries that one line, not the side lines beside it.)
 *
 * The full reference — the book, the arrows, the URL, the hand-off, tests,
 * debugging and recipes — is
 * [`.claude/rules/openings-explorer.md`](../../../.claude/rules/openings-explorer.md).
 */

/** The tabs kept mounted once opened — a long move list is costly to mount; the Map keeps its view. */
const KEEP_MOUNTED = ["moves", "map"] as const;

/** What the URL hands the screen, read once: the start position and the line to replay. */
const arrivalOf = (params: URLSearchParams) => {
  let fen = DEFAULT_POSITION;
  const requested = params.get("fen");
  if (requested !== null) {
    try {
      fen = parseFen(requested);
    } catch {
      // A position nobody can read opens as the standard start.
    }
  }
  const at = params.get(REPERTOIRE_AT_PARAM);
  const tree: GameTree = lineTreeOf(fen, atParamSans(at));
  return {
    tree,
    nodeId: nodeAtParam(tree, at) ?? undefined,
    // A position turns the board; the standard start faces White.
    orientation: turnOf(fen) === "b" ? ("black" as const) : ("white" as const),
  };
};

function OpeningsBoard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [arrival] = useState(() => arrivalOf(searchParams));

  const session = useAnalysisSession(arrival);
  const { core, engine } = session;
  // The opening on screen, for the panel header (CTA-113: a hook and the `CurrentOpening` block).
  const currentOpening = useCurrentOpening(core.fen);
  const book = useOpeningBookModule({ enabled: true, fen: core.fen });
  const chess = useChessTokens();

  const [tab, setTab] = useState("book");
  const [showArrows, setShowArrows] = useState(true);

  const explorer = useVariationsExplorer({
    testId: "openings",
    source: core,
    evalsByFen: engine.evalsByFen,
    onEditTree: core.replaceTree,
    playChances: false,
    annotations: true,
    arrows: { show: showArrows },
    map: { linked: true },
  });
  const boardOptions: ChessboardOptions = {
    ...explorer.boardOptions,
    arrows: openingArrowsOf(
      explorer.arrows,
      book.nextMoves,
      book.hoveredMove?.san ?? null,
      chess.book,
    ),
  };
  const topLine = engine.analysis.lines.find((line) => line !== undefined);

  /*
    The URL, derived and written back with history replace: the tree's start
    when it is not the standard one, and where the reader stands.
  */
  const linkedAt = useMemo(() => atParamOf(core.tree, core.nodeId), [core.tree, core.nodeId]);
  const startFen = core.tree.startFen;
  const wantedSearch = useMemo(
    () =>
      createSearchParams({
        ...(startFen === DEFAULT_POSITION ? {} : { fen: startFen }),
        ...(linkedAt === "" ? {} : { [REPERTOIRE_AT_PARAM]: linkedAt }),
      }).toString(),
    [startFen, linkedAt],
  );
  useEffect(() => {
    if (searchParams.toString() === wantedSearch) return;
    setSearchParams(wantedSearch, { replace: true });
  }, [wantedSearch, searchParams, setSearchParams]);

  /** A new tree on the board — a PGN loaded, a merge. */
  const loadTree = (tree: GameTree) => {
    core.loadTree(tree);
    engine.clearAnalysis();
  };

  /** Everything explored here, into Analysis as a new Game Case — opened at the position on screen. */
  const analysis = useSendToAnalysis("openings-send");
  const openInAnalysis = () =>
    analysis.send({
      games: [{ tree: core.tree, nodeId: core.nodeId, orientation: core.orientation }],
      projectName: currentOpening.opening?.name ?? t("openings.sendTo.projectName"),
    });

  return (
    <BoardShell
      id="openings"
      core={core}
      score={topLine?.score ?? null}
      showEvalBar={session.engineOn && session.showEvalBar}
      boardOptions={boardOptions}
      overlay={explorer.overlay}
      panel={{
        header: (
          <>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <CurrentOpening {...currentOpening} testId="openings-current" />
            </Box>
            <IconAction label={t("openings.controls.analysis")} onClick={openInAnalysis} testId="openings-open-analysis">
              <AccountTreeRoundedIcon fontSize="small" />
            </IconAction>
            {analysis.dialog}
            <IconAction
              label={t("openings.controls.playFromHere")}
              onClick={() =>
                navigate({
                  pathname: "/engine/play",
                  search: createSearchParams({ fen: core.fen }).toString(),
                })
              }
              testId="openings-play-from-here"
            >
              <SportsEsportsRoundedIcon fontSize="small" />
            </IconAction>
            <PlayToggleButton
              testId="openings-play"
              engineOn={session.engineOn}
              playing={session.playing}
              thinking={session.thinking}
              onToggle={session.togglePlaying}
            />
            {/* The engine's play / pause and its menu — the eval bar (CTA-181). */}
            <BoardEngineControls
              engineOn={session.engineOn}
              onEngineOnChange={session.setEngineOn}
              showEvalBar={session.showEvalBar}
              onShowEvalBarChange={session.setShowEvalBar}
              testId="openings"
            />
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
            id: "book",
            label: t("openings.tabs.book"),
            content: (
              <OpeningBookList
                moves={book.nextMoves}
                // Like a drop, at any node: from an earlier position it branches.
                onPlay={(san) => core.playVariation([san])}
                onHover={book.setHoveredMove}
                testId="openings-book"
              />
            ),
          },
          {
            id: "moves",
            label: t("openings.tabs.moves"),
            content: (
              <>
                <Box sx={{ px: 1 }}>
                  <SwitchField
                    size="small"
                    label={t("analysis.settings.arrows")}
                    checked={showArrows}
                    onChange={setShowArrows}
                    testIdOn="control"
                    testId="openings-arrows"
                  />
                </Box>
                {explorer.moves}
              </>
            ),
          },
          { id: "map", label: t("openings.tabs.map"), content: explorer.map },
          {
            id: "load",
            label: t("openings.tabs.load"),
            content: (
              <>
                <OpeningsLoad
                  onLoadTree={loadTree}
                  onLoadFen={(fen) => {
                    core.loadFen(fen);
                    engine.clearAnalysis();
                  }}
                />
                {/* Back to the tree's own start — the Engine tab's, until CTA-181. */}
                <ClearBoardButton
                  testId="openings-clear"
                  onClear={() => {
                    core.reset();
                    engine.clearAnalysis();
                  }}
                />
              </>
            ),
          },
          {
            id: "export",
            label: t("openings.tabs.export"),
            content: <PgnExportPanel fen={core.fen} tree={core.tree} onDownload={(pgn) => downloadPgn("opening", [pgn])} testId="analysis" />,
          },
        ],
        footer: (
          <>
            {explorer.annotations}
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

export default OpeningsBoard;
