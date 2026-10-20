import { useCallback, useEffect, useRef } from "react";

/** How long each of the game's moves between two positions stays on the board as they are played out. */
const STEP_DELAY_MS = 1000;

/**
 * **The stepped replay — the replay unit** (CTA-244, the design note §4.4,
 * §7): the board put on `start`, then each node of `steps` gone to in turn,
 * one every `stepDelayMs`; a step that finds the board moved by the reader
 * stops the rest. No chess: the nodes are the plan's (`replayPlan`), found on
 * the board by the caller.
 */
export const useReplay = ({
  nodeId,
  goToNode,
  stepDelayMs = STEP_DELAY_MS,
}: {
  /** The node on screen. */
  nodeId: string | null;
  goToNode: (nodeId: string | null) => void;
  stepDelayMs?: number;
}) => {
  const timers = useRef<number[]>([]);
  // The node on screen, as the timers read it — kept after each render.
  const onScreen = useRef(nodeId);
  useEffect(() => {
    onScreen.current = nodeId;
  });

  const stop = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }, []);
  useEffect(() => stop, [stop]);

  /** Put the board on `start` and play `steps` out — straight to the last with no delay. */
  const play = useCallback(
    (start: string | null, steps: readonly (string | null)[]) => {
      stop();
      if (stepDelayMs <= 0 || steps.length === 0) {
        goToNode(steps.at(-1) ?? start);
        return;
      }
      goToNode(start);
      let expected = start;
      steps.forEach((target, index) => {
        const timer = window.setTimeout(() => {
          // The reader went somewhere else meanwhile: the rest is theirs.
          if (onScreen.current !== expected) return stop();
          expected = target;
          goToNode(target);
        }, (index + 1) * stepDelayMs);
        timers.current.push(timer);
      });
    },
    [goToNode, stepDelayMs, stop],
  );

  return { play, stop };
};
