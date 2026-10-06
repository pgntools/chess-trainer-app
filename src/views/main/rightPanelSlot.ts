import { createContext, useContext, useSyncExternalStore } from 'react';

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
    /** How many mounted screens asked for no aside (`NoRightPanel`, CTA-142). */
    getHiders: () => number;
    hide: () => void;
    unhide: () => void;
    getHost: () => HTMLElement | null;
    setHost: (element: HTMLElement | null) => void;
    acquire: () => void;
    release: () => void;
};

export const createPanelSlot = (): PanelSlot => {
    let occupants = 0;
    let hiders = 0;
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

/** Whether a mounted screen asked for no aside (`NoRightPanel`) — the shell's end of it. */
export const useRightPanelHidden = (): boolean => {
    const slot = useContext(PanelSlotContext);
    return useSyncExternalStore(slot?.subscribe ?? noSlot, slot?.getHiders ?? none, slot?.getHiders ?? none) > 0;
};
