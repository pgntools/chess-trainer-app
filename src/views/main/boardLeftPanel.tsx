/**
 * **The board's own left-hand panel** (CTA-145) — a second column of the
 * board viewport, between the main menu's rail and the board square. Not the
 * rail's slot (`leftPanel.tsx` swaps the main menu's *content*, which the
 * Analysis Board's sibling list must not): the menu stays, and a screen that
 * has a list to keep beside its board registers it here for as long as it is
 * mounted — the analyses of the folder an analysis was opened from.
 *
 * **While the column is open the screen has the whole window**: the shell hides
 * its header, the main menu's rail and its footer (`Layout.tsx`), because a
 * rail, a column, a square and the aside do not fit side by side — the panel is
 * a focused view of the board, and closing it (the screen stops registering
 * the panel) brings the shell back.
 *
 * `rightPanel.tsx`'s trio again, aimed at the board's other side:
 * `BoardLeftPanelProvider` (the shell, above the router `<Outlet />`),
 * `BoardLeftPanelOutlet` (the shell, in the board viewport's row, before the
 * square) and `BoardLeftPanel` (a screen, to register content). Wide, the
 * column is drawn while a panel is registered and takes its width out of the
 * square's (`Layout.tsx`: `BOARD_LEFT_PANEL_WIDTH_PX`, with
 * `useBoardLeftPanelOccupied`), so the board stays square. **Under the shell's
 * breakpoint** there is no room for a column beside the square: the outlet
 * shows the panel in a drawer instead — the main menu's `NavDrawer`, opened
 * and closed by the screen (`open`, `onClose`) — and the shell draws it, outside
 * the board's `ForceLTR`, so it comes in from the start edge under Hebrew too.
 *
 * ```tsx
 * <BoardLeftPanel open={open} onClose={close} drawerLabel="Analyses in this folder">
 *   <SiblingAnalysesList … />   // shares this screen's state by closure
 * </BoardLeftPanel>
 * ```
 */

import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';

import { NavDrawer } from '../../design-system/components/navigation';
import {
    BoardLeftPanelSlotContext,
    createBoardLeftPanelSlot,
    useBoardLeftPanelOccupied,
    useBoardLeftPanelSlot,
} from './boardLeftPanelSlot';

/** The column's width in pixels — what the shell subtracts, with the gap, from the square's. */
export const BOARD_LEFT_PANEL_WIDTH_PX = 240;

/** Owns one slot for the subtree below it — mounted by the shell above its `<Outlet />`. */
export function BoardLeftPanelProvider({ children }: { children: ReactNode }) {
    // A lazy initializer, never written again: one slot per mounted shell (as `RightPanelProvider`).
    const [slot] = useState(createBoardLeftPanelSlot);
    return (
        <BoardLeftPanelSlotContext.Provider value={slot}>
            {children}
        </BoardLeftPanelSlotContext.Provider>
    );
}

/**
 * The slot's rendering end. Wide: the column — the aside's own look, a border
 * on the side the square is, a paper ground — holding the host a registered
 * panel portals into; nothing while the slot is empty. `compact`: a drawer the
 * screen opens and closes, holding the same host.
 */
export function BoardLeftPanelOutlet({ compact }: { compact: boolean }) {
    const slot = useBoardLeftPanelSlot('BoardLeftPanelOutlet');
    const occupied = useBoardLeftPanelOccupied();
    const drawer = useSyncExternalStore(slot.subscribe, slot.getDrawer, slot.getDrawer);
    // Stable for the life of the slot — see `rightPanel.tsx` for why this is not `slot.setHost` itself.
    const attachHost = useCallback((element: HTMLElement | null) => slot.setHost(element), [slot]);

    if (!occupied) return null;
    const host = <div ref={attachHost} style={{ display: 'contents' }} />;

    if (compact) {
        if (drawer === null) return null;
        return (
            <NavDrawer
                open={drawer.open}
                onClose={drawer.onClose}
                label={drawer.label}
                testId="layout-board-left-drawer"
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, p: 2 }}>
                    {host}
                </Box>
            </NavDrawer>
        );
    }

    return (
        <Box
            data-testid="layout-board-left-panel"
            sx={{
                width: `${BOARD_LEFT_PANEL_WIDTH_PX}px`,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                p: 2,
                bgcolor: 'background.paper',
                borderInlineEnd: '1px solid',
                borderColor: 'divider',
            }}
        >
            {host}
        </Box>
    );
}

/**
 * The slot's authoring end, for a screen: renders `children` in the column —
 * or, under the breakpoint, in the drawer while `open` — for as long as it is
 * mounted. Wide, mount it only while the panel is to show; stacked, keep it
 * mounted and say `open`. One panel at a time, as `RightPanel`.
 */
export function BoardLeftPanel({
    children,
    open,
    onClose,
    drawerLabel,
}: {
    children: ReactNode;
    /** Under the shell's breakpoint: whether the drawer is open. Wide, ignored. */
    open: boolean;
    /** The drawer asked to close (Escape, its backdrop). */
    onClose: () => void;
    /** The drawer's accessible name. */
    drawerLabel: string;
}) {
    const slot = useBoardLeftPanelSlot('BoardLeftPanel');
    // A layout effect, as `RightPanel`'s: the column is made before the browser paints.
    useLayoutEffect(() => {
        slot.acquire();
        return () => slot.release();
    }, [slot]);

    // The latest `onClose`, so the drawer request is made on `open` and the label alone — a
    // fresh callback on every render would be a fresh request, and a render loop.
    const closeRef = useRef(onClose);
    useLayoutEffect(() => {
        closeRef.current = onClose;
    });
    useLayoutEffect(() => {
        slot.setDrawer({ open, label: drawerLabel, onClose: () => closeRef.current() });
        return () => slot.setDrawer(null);
    }, [slot, open, drawerLabel]);

    const host = useSyncExternalStore(slot.subscribe, slot.getHost, slot.getHost);
    return host === null ? null : createPortal(children, host);
}
