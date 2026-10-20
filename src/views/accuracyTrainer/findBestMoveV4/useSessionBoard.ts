import { useCallback, useEffect, useRef, useState } from "react";

import { facingOf, positionFenOf, type FindBestMoveRecord, type PositionKey } from "../../../lib/findBestMove/model";
import {
  boardTreeOf,
  candidatesOf,
  isAtPosition,
  isWorkNode,
  reorderedCandidates,
  withoutCandidate,
  workOf,
  type AnswerWords,
} from "../../../lib/findBestMove/projection";
import { sessionEvents, sessionReducer, type SessionEvent } from "../../../lib/findBestMove/reducer";
import { phaseOf, replayPlan } from "../../../lib/findBestMove/selectors";
import { nodeAtSanPath } from "../../../lib/gameTree";
import { useBoardCore } from "../../board/core/useBoardCore";
import { useReplay } from "./useReplay";

/** How long the board's work waits before it is written — a burst of moves and comments is one write. */
const WORK_DELAY_MS = 600;

/** What the board shows: the position on it, its node there, and the replay that brought it (none: straight there). */
type Shown = { key: PositionKey; nodeId: string | null; replay?: { start: string | null; steps: (string | null)[] } };

/**
 * **The session's board — the board unit** (CTA-244, the design note §6.1,
 * §7): the core over **a projection of the record** (`boardTreeOf` — every
 * move before the position, its own lines alone under it), loaded when the
 * position on screen changes (and as it mounts), facing its side to move. It
 * is never written to the Case as a tree: **one thing is read back** — the
 * position's subtree, the reader's work (`workRecorded`), written a moment
 * after the board changes and always before an action moves on
 * (`flushWork`).
 *
 * - **Where the board moves**: on the position or inside a line from it
 *   (`canMove`); **where it edits**: strictly under the position
 *   (`editableAt`, the explorer's S5) — the session's own moves are never
 *   the reader's to change.
 * - **The reader's moves** (`candidates`): the first moves of their lines
 *   from the position, in their order; one moved or deleted with its line.
 * - **A first move** where the engine is needed asks for it (`firstMove`).
 * - **On to another position** with `replayFrom` set (Next, Pass): the board
 *   starts at the position just left and plays the game's moves to the next
 *   one out (`replayPlan`, capped), through the replay unit.
 */
export const useSessionBoard = ({
  record,
  dispatch,
  words,
  stepDelayMs,
}: {
  record: FindBestMoveRecord;
  dispatch: (events: readonly SessionEvent[]) => Promise<unknown>;
  words: AnswerWords;
  stepDelayMs?: number;
}) => {
  const [initial] = useState(() => boardTreeOf(record, record.current, words));
  const core = useBoardCore({ tree: initial.tree, nodeId: initial.nodeId, orientation: facingOf(record.game, record.current) });
  const [shown, setShown] = useState<Shown>({ key: record.current, nodeId: initial.nodeId });
  // The position an action moves on from (Next, Pass): the replay starts there. `null`: straight to the next.
  const [replayFrom, setReplayFrom] = useState<PositionKey | null>(null);
  const replay = useReplay({ nodeId: core.nodeId, goToNode: core.goToNode, ...(stepDelayMs === undefined ? {} : { stepDelayMs }) });

  /*
    The position on screen moved (an action, another tab): the board loads
    its projection — adjusted during render, as the core's state is this
    component's — and, moving on from `replayFrom`, starts where the replay
    does; the replay itself runs from an effect.
  */
  if (record.current !== shown.key) {
    const key = record.current;
    const view = boardTreeOf(record, key, words);
    const plan = replayFrom === null ? undefined : replayPlan(record, replayFrom, key);
    const nodeAt = (plies: number) => nodeAtSanPath(view.tree, record.game.moves.slice(0, plies));
    const replayed =
      plan === undefined || plan.sans.length === 0
        ? undefined
        : { start: nodeAt(plan.start), steps: plan.sans.map((_, index) => nodeAt(plan.start + index + 1)) };
    core.loadTree(view.tree);
    core.setOrientation(facingOf(record.game, key));
    core.goToNode(replayed?.start ?? view.nodeId);
    setShown({ key, nodeId: view.nodeId, ...(replayed === undefined ? {} : { replay: replayed }) });
    setReplayFrom(null);
  }
  const { play, stop } = replay;
  useEffect(() => {
    if (shown.replay !== undefined) play(shown.replay.start, shown.replay.steps);
  }, [shown, play]);

  const fen = positionFenOf(record.game, shown.key) ?? record.game.startFen;

  /** **The reader's work, as an event** — the position's subtree on the board, read back. */
  const flushWork = useCallback(
    (): SessionEvent => sessionEvents.workRecorded(shown.key, workOf(core.tree, shown.nodeId, fen)),
    [shown, core.tree, fen],
  );

  // A moment after the board changes, its work is written; a burst is one write. And once more as the screen goes.
  useEffect(() => {
    const event = flushWork();
    const timer = window.setTimeout(() => void dispatch([event]), WORK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [flushWork, dispatch]);
  const lastWork = useRef<() => void>(() => {});
  useEffect(() => {
    lastWork.current = () => void dispatch([flushWork()]);
  });
  useEffect(() => () => lastWork.current(), []);

  const phase = phaseOf(record, shown.key);
  const answering = phase === "answering";
  const atPosition = isAtPosition(core.tree, shown.nodeId, core.nodeId);

  // A first move at a position whose engine is needed asks for it — only where the reducer would take it.
  const askEngine = () => {
    const event = sessionEvents.firstMove(shown.key);
    if (sessionReducer(record, event) !== record) void dispatch([event]);
  };
  const onPieceDrop: typeof core.onPieceDrop = (args) => {
    const accepted = core.onPieceDrop(args);
    if (accepted && answering && atPosition) askEngine();
    return accepted;
  };
  const resolvePromotion: typeof core.resolvePromotion = (piece) => {
    core.resolvePromotion(piece);
    if (piece !== null && answering && atPosition) askEngine();
  };

  const editableAt = useCallback((nodeId: string | null) => isWorkNode(core.tree, shown.nodeId, nodeId), [core.tree, shown.nodeId]);

  return {
    core,
    /** The position the board is loaded on, and its node. */
    shownKey: shown.key,
    positionNodeId: shown.nodeId,
    /** The reader's moves at the position, in their order. */
    candidates: candidatesOf(core.tree, shown.nodeId),
    moveCandidate: (index: number, move: "up" | "down") => core.replaceTree(reorderedCandidates(core.tree, shown.nodeId, index, move)),
    removeCandidate: (index: number) => core.replaceTree(withoutCandidate(core.tree, shown.nodeId, index)),
    /** **New move**: the board back on the position, so the next move played there starts a new line. */
    newMove: () => core.goToNode(shown.nodeId),
    /** On the position's own node — New move has nowhere to go back to. */
    onPosition: core.nodeId === shown.nodeId,
    /** Whether a piece may move: on the position, or inside a line from it. */
    canMove: atPosition,
    editableAt,
    flushWork,
    /** The next load plays the game's moves from this position out (Next, Pass); `null` goes straight there. */
    setReplayFrom,
    stopReplay: stop,
    board: { onPieceDrop, resolvePromotion },
  };
};
