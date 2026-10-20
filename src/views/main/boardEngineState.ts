import { useEffect, useState, useSyncExternalStore } from "react";

import { searchingTabs } from "../../lib/searchingTabs";

/**
 * **The board on screen's engine, for the top bar** (CTA-181) — off, on, or
 * searching — what the header's Engine icon shows: neutral while off (or on a
 * screen with no board), the theme's colour while on, and a pulse while a
 * search runs.
 *
 * A board publishes it (`usePublishBoardEngineState`, from its session —
 * `useAnalysisSession`, `usePlayGame`, the repertoire player) and takes it
 * back when it unmounts; the top bar reads it (`useBoardEngineState`). The
 * last board to publish owns it, so a board that replaces another — a remount
 * under a new key — is the one shown. A store of the shell's beside
 * `rightPanelSlot.ts` and `boardLeftPanelSlot.ts`, kept outside React.
 *
 * Whether it searches is told to the other tabs too (CTA-242,
 * `lib/searchingTabs.ts`), so their Engine button breathes with it; the
 * button reads every source together through `useEngineSearching`
 * (`engineSearching.ts`).
 */
export type BoardEngineState = "off" | "on" | "searching";

type Published = { owner: object; state: BoardEngineState };

let published: Published | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  searchingTabs().setSearching(published?.state === "searching");
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = (): BoardEngineState | undefined => published?.state;

/** The board on screen's engine — `undefined` where no board says. */
export const useBoardEngineState = (): BoardEngineState | undefined =>
  useSyncExternalStore(subscribe, snapshot, () => undefined);

/** Say what this board's engine is doing, for as long as the board is mounted. */
export const usePublishBoardEngineState = (state: BoardEngineState): void => {
  const [owner] = useState(() => ({}));
  useEffect(() => {
    if (published?.owner === owner && published.state === state) return;
    published = { owner, state };
    emit();
  }, [owner, state]);
  useEffect(
    () => () => {
      if (published?.owner !== owner) return;
      published = null;
      emit();
    },
    [owner],
  );
};

/** The engine state of a board: off unless switched on, searching while a search runs. */
export const boardEngineStateOf = (engineOn: boolean, searching: boolean): BoardEngineState =>
  !engineOn ? "off" : searching ? "searching" : "on";
