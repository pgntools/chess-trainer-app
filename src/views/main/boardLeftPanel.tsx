/**
 * **The board's own left-hand panel** (CTA-145) — a second column of the
 * board viewport, between the main menu's rail and the board square. Not the
 * rail's slot (`leftPanel.tsx` swaps the main menu's *content*, which the
 * Analysis Board's workspace must not): the menu stays, and a screen that has
 * a list to keep beside its board registers it here for as long as it is
 * mounted — the saved list's tree, for an analysis opened from the list.
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
 * column is drawn while a panel is registered — a wide column, or a thin rail
 * when the screen folds the panel away (`collapsed`) — and takes its width out
 * of the square's (`Layout.tsx`, `useBoardLeftPanelWidth`), so the board stays
 * square. **Under the shell's breakpoint** there is no room for a column beside the square: the outlet
 * shows the panel in a drawer instead — the main menu's `NavDrawer`, opened
 * and closed by the screen (`open`, `onClose`) — and the shell draws it, outside
 * the board's `ForceLTR`, so it comes in from the start edge under Hebrew too.
 *
 * ```tsx
 * <BoardLeftPanel collapsed={folded} open={open} onClose={close} drawerLabel="Saved analyses">
 *   <AnalysesTree … />   // shares this screen's state by closure
 * </BoardLeftPanel>
 * ```
 */

import {
    useCallback,
    useContext,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CacheProvider } from '@emotion/react';
import Box from '@mui/material/Box';
import { ThemeProvider, useTheme } from '@mui/material/styles';

import { NavDrawer } from '../../design-system/components/navigation';
import { ltrCache, rtlCache } from '../../design-system/theme';
import {
    BoardLeftPanelSlotContext,
    ShellThemeContext,
    createBoardLeftPanelSlot,
    BOARD_LEFT_PANEL_WIDTH_PX,
    useBoardLeftPanelSlot,
    useBoardLeftPanelWidth,
} from './boardLeftPanelSlot';

/**
 * Owns one slot for the subtree below it — mounted by the shell above its
 * `<Outlet />`. It also holds the **shell's theme**: a screen sits inside the
 * board's `ForceLTR`, whose theme and emotion cache are left to right, and the
 * panel it registers is drawn in the shell's column — so `BoardLeftPanel` puts
 * the shell's own theme back around its content, and the panel mirrors (its
 * styles, a tree's arrow keys) with the app.
 */
export function BoardLeftPanelProvider({ children }: { children: ReactNode }) {
    // A lazy initializer, never written again: one slot per mounted shell (as `RightPanelProvider`).
    const [slot] = useState(createBoardLeftPanelSlot);
    const shellTheme = useTheme();
    return (
        <BoardLeftPanelSlotContext.Provider value={slot}>
            <ShellThemeContext.Provider value={shellTheme}>
                {children}
            </ShellThemeContext.Provider>
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
    const width = useBoardLeftPanelWidth();
    const request = useSyncExternalStore(slot.subscribe, slot.getRequest, slot.getRequest);
    // Stable for the life of the slot — see `rightPanel.tsx` for why this is not `slot.setHost` itself.
    const attachHost = useCallback((element: HTMLElement | null) => slot.setHost(element), [slot]);

    if (width === 0) return null;
    const host = <div ref={attachHost} style={{ display: 'contents' }} />;

    if (compact) {
        if (request === null) return null;
        return (
            <NavDrawer
                open={request.drawerOpen}
                onClose={request.onDrawerClose}
                label={request.drawerLabel}
                testId="layout-board-left-drawer"
                width={BOARD_LEFT_PANEL_WIDTH_PX}
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
                width: `${width}px`,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                // A rail holds two buttons; an open column, the tree.
                p: width === BOARD_LEFT_PANEL_WIDTH_PX ? 2 : 0.5,
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
 * mounted. Wide it is a column of `BOARD_LEFT_PANEL_WIDTH_PX`, or a rail of
 * `BOARD_LEFT_PANEL_COLLAPSED_PX` while `collapsed` — the children then draw
 * the rail themselves; stacked, the panel is a drawer, `open` or not. One
 * panel at a time, as `RightPanel`.
 */
export function BoardLeftPanel({
    children,
    collapsed,
    open,
    onClose,
    drawerLabel,
}: {
    children: ReactNode;
    /** Wide: the column is folded to a rail. */
    collapsed: boolean;
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

    // The latest `onClose`, so the request is made on `collapsed`, `open` and the label alone — a
    // fresh callback on every render would be a fresh request, and a render loop.
    const closeRef = useRef(onClose);
    useLayoutEffect(() => {
        closeRef.current = onClose;
    });
    useLayoutEffect(() => {
        slot.setRequest({ collapsed, drawerOpen: open, drawerLabel, onDrawerClose: () => closeRef.current() });
        return () => slot.setRequest(null);
    }, [slot, collapsed, open, drawerLabel]);

    const host = useSyncExternalStore(slot.subscribe, slot.getHost, slot.getHost);
    const shellTheme = useContext(ShellThemeContext);
    if (host === null) return null;
    return createPortal(
        shellTheme === null ? (
            children
        ) : (
            <CacheProvider value={shellTheme.direction === 'rtl' ? rtlCache : ltrCache}>
                <ThemeProvider theme={shellTheme}>{children}</ThemeProvider>
            </CacheProvider>
        ),
        host,
    );
}
