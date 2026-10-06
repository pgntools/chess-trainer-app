import { createContext, useContext, useSyncExternalStore } from 'react';

/*
  The board's own left-hand panel slot's store and context (`boardLeftPanel.tsx`
  holds its components; CTA-145) — apart, so that file exports components only
  (react-refresh's rule), and the shell can read the slot with a hook.
*/

/** How the screen asks the shell to show its panel in a drawer, under the shell's breakpoint. */
export type BoardLeftPanelDrawer = {
    open: boolean;
    /** The drawer's accessible name. */
    label: string;
    onClose: () => void;
};

/**
 * The slot's mutable state, kept outside React and read with
 * `useSyncExternalStore`: how many panels are registered, the host element the
 * outlet renders (`null` while none is on screen), and the drawer request.
 */
export type BoardLeftPanelSlot = {
    subscribe: (onStoreChange: () => void) => () => void;
    getOccupants: () => number;
    getHost: () => HTMLElement | null;
    setHost: (element: HTMLElement | null) => void;
    getDrawer: () => BoardLeftPanelDrawer | null;
    setDrawer: (drawer: BoardLeftPanelDrawer | null) => void;
    acquire: () => void;
    release: () => void;
};

export const createBoardLeftPanelSlot = (): BoardLeftPanelSlot => {
    let occupants = 0;
    let host: HTMLElement | null = null;
    let drawer: BoardLeftPanelDrawer | null = null;
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((listener) => listener());

    return {
        subscribe: (onStoreChange) => {
            listeners.add(onStoreChange);
            return () => {
                listeners.delete(onStoreChange);
            };
        },
        getOccupants: () => occupants,
        getHost: () => host,
        setHost: (element) => {
            if (host === element) return;
            host = element;
            emit();
        },
        getDrawer: () => drawer,
        setDrawer: (next) => {
            drawer = next;
            emit();
        },
        acquire: () => {
            occupants += 1;
            emit();
        },
        release: () => {
            occupants -= 1;
            emit();
        },
    };
};

export const BoardLeftPanelSlotContext = createContext<BoardLeftPanelSlot | null>(null);

export const useBoardLeftPanelSlot = (who: string): BoardLeftPanelSlot => {
    const slot = useContext(BoardLeftPanelSlotContext);
    if (slot === null) {
        throw new Error(
            `<${who}> must be rendered inside <BoardLeftPanelProvider> — the app shell provides one.`,
        );
    }
    return slot;
};

const noSlot = () => () => {};
const none = () => 0;

/** Whether a mounted screen has a left panel registered — the shell's end of it: it makes room for it. */
export const useBoardLeftPanelOccupied = (): boolean => {
    const slot = useContext(BoardLeftPanelSlotContext);
    return useSyncExternalStore(slot?.subscribe ?? noSlot, slot?.getOccupants ?? none, slot?.getOccupants ?? none) > 0;
};
