import { createContext, useContext, useSyncExternalStore } from 'react';

/**
 * The aside's width while the registered panel is folded to a rail at the
 * inline end (CTA-230) — the board's own left panel's rail
 * (`BOARD_LEFT_PANEL_COLLAPSED_PX`) on the other side.
 */
export const RIGHT_PANEL_COLLAPSED_PX = 48;

/*
  The right-hand panel slot's store and context (`rightPanel.tsx` holds its
  components) — apart, so that file exports components only (react-refresh's
  rule), and the shell can read the slot with a hook (CTA-142).
*/

/**
 * The slot's mutable state, kept outside React: how many panels are currently
 * registered, and the host element the outlet is rendering (`null` while the
 * fallback is up). Both are read with `useSyncExternalStore`.
 */
export type PanelSlot = {
    subscribe: (onStoreChange: () => void) => () => void;
    getOccupants: () => number;
    /** How many mounted screens asked to span the aside (`HideRightPanel`, CTA-142). */
    getHiders: () => number;
    hide: () => void;
    unhide: () => void;
    /** How many mounted panels asked to be folded to a rail (`RightPanel`'s `collapsed`, CTA-230). */
    getCollapsers: () => number;
    collapse: () => void;
    uncollapse: () => void;
    getHost: () => HTMLElement | null;
    setHost: (element: HTMLElement | null) => void;
    acquire: () => void;
    release: () => void;
};

export const createPanelSlot = (): PanelSlot => {
    let occupants = 0;
    let hiders = 0;
    let collapsers = 0;
    let host: HTMLElement | null = null;
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
        getHiders: () => hiders,
        hide: () => {
            hiders += 1;
            emit();
        },
        unhide: () => {
            hiders -= 1;
            emit();
        },
        getCollapsers: () => collapsers,
        collapse: () => {
            collapsers += 1;
            emit();
        },
        uncollapse: () => {
            collapsers -= 1;
            emit();
        },
        getHost: () => host,
        setHost: (element) => {
            if (host === element) return;
            host = element;
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

export const PanelSlotContext = createContext<PanelSlot | null>(null);

export const usePanelSlot = (who: string): PanelSlot => {
    const slot = useContext(PanelSlotContext);
    if (slot === null) {
        throw new Error(
            `<${who}> must be rendered inside <RightPanelProvider> — the app shell provides one.`,
        );
    }
    return slot;
};

const noSlot = () => () => {};
const none = () => 0;

/** Whether a mounted screen asked to span the aside (`HideRightPanel`) — the shell's end of it. */
export const useRightPanelHidden = (): boolean => {
    const slot = useContext(PanelSlotContext);
    return useSyncExternalStore(slot?.subscribe ?? noSlot, slot?.getHiders ?? none, slot?.getHiders ?? none) > 0;
};

/**
 * Whether the registered panel asked to be folded to a rail (`RightPanel`'s
 * `collapsed`, CTA-230) — the shell's end of it; it draws the rail only wide.
 */
export const useRightPanelCollapsed = (): boolean => {
    const slot = useContext(PanelSlotContext);
    return useSyncExternalStore(slot?.subscribe ?? noSlot, slot?.getCollapsers ?? none, slot?.getCollapsers ?? none) > 0;
};
