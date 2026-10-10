import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  analysisUciOptionsOf,
  withClampedAnalysisUciOptions,
  DEFAULT_ANALYSIS_SETTINGS,
  type AnalysisSettings,
} from "../../../lib/analysisSettings";
import { annotatorOf, recordEvaluation } from "../../../lib/engineEvals";
import { findNode, pathTo, type GameTree } from "../../../lib/gameTree";
import { extensionIdsOf, nodeIdsOf } from "../../../lib/repertoireTrainer";
import { useBoardCore } from "../../board/core/useBoardCore";
import { useEngineModule, type FinishedSearch } from "../../board/core/useEngineModule";
import { useEngineChoice } from "../../shared/useEngineChoice";
import { usePlayToggle } from "../../board/core/usePlayToggle";

/**
 * **An analysis session against a baseline** — the part of the Analysis
 * Board every board that analyses a tree shares (the Analysis Board, CTA-73;
 * a Library game, CTA-75): the v2 core, the engine (**off at the start**
 * — the reader switches it on, and then it searches the position on screen),
 * **Play** (`usePlayToggle`, off at the start and disabled while the engine is
 * off: the engine plays the side not at the bottom only while it is on), and a **baseline**
 * — the tree as it arrived or was last kept — with what follows from it:
 *
 * - `changed` is `core.tree !== baseline`, the repertoire player's rule —
 *   every edit makes a new tree, replaying a move already there does not;
 * - `extensionIds` are the moves added since, tinted in the list and ringed
 *   on the map (recomputed, never tracked);
 * - `discard` goes back to the baseline, on the last of its positions on the
 *   way to where the reader stands; `rebase` makes a kept tree the baseline;
 * - with `settings.writeEvals` on (CTA-167, the Analysis Board's Engine tab),
 *   each finished search's score is written into the tree as `[%eval]` on the
 *   move whose position was searched, and the engine named in `Annotator`
 *   (`lib/engineEvals.ts`) — an edit like any other, so it is a change Save
 *   offers and Discard drops.
 *
 * What is **kept**, and where, is the screen's: a saved analysis
 * (`useAnalysisBoard`), or a Library collection's game. Composed from the
 * core's modules ([`chessboard.md`](../../../../.claude/rules/chessboard.md) §9)
 * — nothing here that a module owns.
 */

export type AnalysisSessionStart = {
  /** The tree the board opens on — also the first baseline. */
  tree: GameTree;
  /** A mainline ply to open at (`?move=`, a `StartPly`). */
  ply?: number;
  /** A node to open on — a record's place, a permanent link. Beats `ply`. */
  nodeId?: string;
  orientation?: "white" | "black";
  /** The engine settings a record was worked under. */
  settings?: AnalysisSettings;
};

export const useAnalysisSession = ({
  tree,
  ply,
  nodeId,
  orientation,
  settings: initialSettings,
}: AnalysisSessionStart) => {
  const core = useBoardCore({ tree, ply, nodeId, orientation });
  const { loadTree, goToNode } = core;

  const [baseline, setBaseline] = useState<GameTree>(tree);
  const changed = core.tree !== baseline;
  const baselineIds = useMemo(() => nodeIdsOf(baseline), [baseline]);
  const extensionIds = useMemo(
    () => extensionIdsOf(core.tree, baselineIds),
    [core.tree, baselineIds],
  );

  /* The engine — off until the reader switches it on (CTA-148): nothing searches by itself. */
  const [settings, setSettings] = useState<AnalysisSettings>(
    () => initialSettings ?? DEFAULT_ANALYSIS_SETTINGS,
  );
  const [engineOn, setEngineOn] = useState(false);
  const [showEvalBar, setShowEvalBar] = useState(true);
  const onUciOptionsReady = useCallback(
    (clamped: Readonly<Record<string, number>>) =>
      setSettings((current) => withClampedAnalysisUciOptions(current, clamped)),
    [],
  );
  /*
    Play (CTA-73): the engine plays its best move for the opponent's side,
    search after search, until paused — the shared toggle, off at the start.
  */
  const play = usePlayToggle({ core, engineOn });
  const { playing, thinking } = play;

  /*
    Which node each position was last on screen at — what a finished search
    is written to. A search ends after the reader has moved on (a change of
    position stops it, and its `bestmove` lands then), so the node on screen
    at the end is not the one searched. Kept in an effect: the engine's
    messages arrive after the commit that changed the position.
  */
  const shownAtRef = useRef(new Map<string, string | null>());
  useEffect(() => {
    shownAtRef.current.set(core.fen, core.nodeId);
  }, [core.fen, core.nodeId]);

  const { annotateTree } = core;
  /** A finished search, written into the tree — at the latest tree, through `annotateTree`. */
  const writeEvaluation = useCallback(
    ({ fen, score, depth, engine: searchedBy }: FinishedSearch) => {
      const shown = shownAtRef.current;
      if (!shown.has(fen)) return;
      const nodeId = shown.get(fen) ?? null;
      annotateTree((current) =>
        recordEvaluation(current, { nodeId, fen, score, depth, annotator: annotatorOf(searchedBy) }),
      );
    },
    [annotateTree],
  );

  // The reader's engine (Settings → Engine, CTA-153): every board runs it from its next search.
  const { engineId } = useEngineChoice();
  const engine = useEngineModule({
    enabled: engineOn,
    engine: engineId,
    fen: core.fen,
    depth: settings.depth,
    moveTimeMs: settings.moveTimeMs,
    // Play needs a search that ends with a move: while it is on, the depth and time decide.
    infinite: settings.infinite && !playing,
    uciOptions: useMemo(
      () => analysisUciOptionsOf({ multiPv: settings.multiPv, threads: settings.threads, hashMb: settings.hashMb }, engineId),
      [settings.multiPv, settings.threads, settings.hashMb, engineId],
    ),
    onUciOptionsReady,
    onBestMove: play.onBestMove,
    onSearchFinished: settings.writeEvals ? writeEvaluation : undefined,
  });

  /** Play on or off — see `usePlayToggle`. */
  const togglePlaying = () => play.toggle(engine.analysis, engine.evalsByFen);

  const updateSettings = useCallback(
    (patch: Partial<AnalysisSettings>) =>
      setSettings((current) => ({ ...current, ...patch })),
    [],
  );

  /** The tree kept: it is the baseline now, and the additions stop being additions. */
  const rebase = useCallback((kept: GameTree) => setBaseline(kept), []);

  /** **Discard**: back to the baseline, on the last of its positions on the way here. */
  const discard = () => {
    const path = pathTo(core.tree, core.nodeId);
    let back: string | null = null;
    for (let index = path.length - 1; index >= 0; index -= 1) {
      if (findNode(baseline, path[index].id) !== null) {
        back = path[index].id;
        break;
      }
    }
    loadTree(baseline);
    if (back !== null) goToNode(back);
  };

  return {
    core,
    engine,
    settings,
    updateSettings,
    engineOn,
    setEngineOn,
    playing,
    thinking,
    togglePlaying,
    showEvalBar,
    setShowEvalBar,
    baseline,
    changed,
    extensionIds,
    rebase,
    discard,
  };
};
