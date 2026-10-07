import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Theme } from '@mui/material/styles';

/*
  The board's own left-hand panel slot's store and context (`boardLeftPanel.tsx`
  holds its components; CTA-145) — apart, so that file exports components only
  (react-refresh's rule), and the shell can read the slot with a hook.
*/

/** The column's width in pixels when it is open — what the shell subtracts, with the gap, from the square's. */
export const BOARD_LEFT_PANEL_WIDTH_PX = 400;

/** The column's width when the screen has folded it away to a rail at the start edge. */
export const BOARD_LEFT_PANEL_COLLAPSED_PX = 48;

/** What the registered panel asks of the shell: how wide the column is, and — under the shell's breakpoint — the drawer. */
type BoardLeftPanelRequest = {
    /** Wide: the column is a thin rail, the panel folded away. */
    collapsed: boolean;
    /** Under the breakpoint: whether the drawer is open. */
    drawerOpen: boolean;
    /** The drawer's accessible name. */
    drawerLabel: string;
    onDrawerClose: () => void;
};

/**
 * The slot's mutable state, kept outside React and read with
 * `useSyncExternalStore`: how many panels are registered, the host element the
 * outlet renders (`null` while none is on screen), and the panel's request.
 */
export type BoardLeftPanelSlot = {
    subscribe: (onStoreChange: () => void) => () => void;
    getOccupants: () => number;
    getHost: () => HTMLElement | null;
    setHost: (element: HTMLElement | null) => void;
    getRequest: () => BoardLeftPanelRequest | null;
    setRequest: (request: BoardLeftPanelRequest | null) => void;
    acquire: () => void;
    release: () => void;
};

export const createBoardLeftPanelSlot = (): BoardLeftPanelSlot => {
    let occupants = 0;
    let host: HTMLElement | null = null;
    let request: BoardLeftPanelRequest | null = null;
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
        getRequest: () => request,
        setRequest: (next) => {
            request = next;
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

/** The shell's theme — what the panel is drawn in, whatever theme the screen that registered it sits under. */
export const ShellThemeContext = createContext<Theme | null>(null);

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

/**
 * The column's width now, in pixels — `0` while no screen has a panel
 * registered — the shell's end of it: it makes the room (and, wide, gives the
 * screen the whole window while it is there).
 */
export const useBoardLeftPanelWidth = (): number => {
    const slot = useContext(BoardLeftPanelSlotContext);
    const width = () =>
        slot === null || slot.getOccupants() === 0
            ? 0
            : slot.getRequest()?.collapsed === true
              ? BOARD_LEFT_PANEL_COLLAPSED_PX
              : BOARD_LEFT_PANEL_WIDTH_PX;
    return useSyncExternalStore(slot?.subscribe ?? noSlot, width, width);
};
