import { useState, useRef, useEffect, useMemo, useCallback, useSyncExternalStore, type MouseEvent } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { Link as RouterLink, Outlet, useLocation, useMatches, type UIMatch } from 'react-router';
import { useTranslation } from 'react-i18next';
import { asAppLanguage } from '../../i18n';
import { NavDrawer } from '../../design-system/components/navigation';
import { IconAction } from '../../design-system/components/toolbars';
import { default as SideBar } from './Sidebar';
import { Footer } from './Footer';
import { BoardWidgetContext } from './service';
import { RightPanelOutlet, RightPanelProvider } from './rightPanel';
import { useRightPanelHidden } from './rightPanelSlot';
import { LeftPanelOutlet, LeftPanelProvider } from './leftPanel';
import { BOARD_LEFT_PANEL_WIDTH_PX, BoardLeftPanelOutlet, BoardLeftPanelProvider } from './boardLeftPanel';
import { useBoardLeftPanelOccupied } from './boardLeftPanelSlot';
import { useShellCompact } from './shellCompact';
import { ARTICLE_MAX_WIDTH_PX, descriptionKeyOf, isArticleRoute, isFullWidthRoute, pageMetaOf, pageTitleOf, screenIdOf, titleKeyOf } from './routeHandle';
import { createPageTitleStore, PageTitleContext } from './pageTitle';
import { visuallyHidden } from '../../design-system/components/a11y';
import { ForceLTR } from '../../theme/ForceLTR';
import ColorModeIconDropdown from '../../theme/ColorModeIconDropdown';
import LanguageSwitch from '../../theme/LanguageSwitch';


import chessFavicon from '../../assets/chess-favicon.svg';

/**
 * Board inset in pixels — the MUI `p: 2` (2 × the 8px spacing unit), applied
 * once here in the shell so every board screen gets the same breathing room.
 * Kept as
 * a raw number, not `theme.spacing(2)`: `cssVariables` is on, so that returns a
 * `calc(var(--mui-spacing))` string the resize maths cannot subtract.
 */
const BOARD_INSET_PX = 16;

/**
 * The gap between the board square and the right-hand panel, in pixels
 * (CTA-82) — the same 16px as the inset, for the same reason: without it a
 * screen's content ran straight up to the panel's border. A flex `gap` on the
 * row, so it is logical and needs no mirroring under RTL (the aside mirrors,
 * the square is `ForceLTR` inside its own box); and subtracted from the width
 * the square is sized against, like the panel's minimum, so the board stays
 * square and nothing overflows.
 */
const BOARD_PANEL_GAP_PX = 16;

/**
 * The nav rail's width, in pixels.
 *
 * It used to be `flex: 3` against the body's `flex: 9` — a quarter of the
 * window, which is a sensible rail at 1024px and a 460px slab at 1850px. Its
 * content is fixed-width (an icon, a label, one level of indent), so it takes a
 * fixed width and the board area keeps everything the rail does not need.
 */
const SIDEBAR_WIDTH_PX = 280;

/**
 * The right-hand panel's width bounds, in pixels.
 *
 * The panel takes whatever the board square leaves, between these two. That is
 * what keeps the row full: the square is a square, so on a wide window it runs
 * out of height long before it runs out of width, and a fixed-width panel would
 * strand the difference as a gap in the middle of the screen.
 *
 * Only the **minimum** enters the square's maths, which is what keeps the two
 * from chasing each other: the square is sized against `width - PANEL_MIN`, a
 * function of the window alone, and the panel then grows into the remainder. A
 * panel width that depended on the square — and a square measured against the
 * panel — is a cycle with no fixed point.
 *
 * The maximum stops a very wide window from turning the panel into a field of
 * empty space; past it the row centres what it has.
 */
const PANEL_MIN_WIDTH_PX = 320;
const PANEL_MAX_WIDTH_PX = 560;

/**
 * The stacked panel's least height, in pixels. Stacked, the panel has no
 * height of its own to divide — the row that gave it one is gone — and
 * `BoardPanel`'s `flex: 1` scrolling region would collapse to nothing. This is
 * what it divides instead; the board viewport scrolls as a whole.
 */
const STACKED_PANEL_MIN_HEIGHT_PX = 420;

/**
 * The stacked board square's least side, in pixels. Stacked, the square is
 * bound by the width and by the height as it always was — but a short window
 * (320 × 256 is what reflow is measured at) would leave it nothing, so it
 * keeps at least this much and the viewport scrolls down to the panel.
 */
const STACKED_BOARD_MIN_PX = 280;

const Header = ({ compact, onOpenNav }: { compact: boolean; onOpenNav: () => void }) => {
    const { t } = useTranslation();

    return (
        <AppBar
            position="static"
            elevation={0}
            data-testid="layout-header"
            sx={{
                flexShrink: 0,
                color: 'text.primary',
                bgcolor: 'background.translucent',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Toolbar variant="dense" sx={{ gap: 2, minHeight: 56 }}>
                {/*
                    Under the breakpoint the sidebar is a drawer, and this is
                    what opens it (CTA-118) — a real button with a required
                    name, in the bar that already holds the shell's controls.
                */}
                {compact && (
                    <IconAction
                        label={t('shell.openNav')}
                        onClick={onOpenNav}
                        edge="start"
                        testId="layout-nav-button"
                    >
                        <MenuRoundedIcon fontSize="small" />
                    </IconAction>
                )}

                <Box
                    component={RouterLink}
                    to="/"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        color: 'text.primary',
                        textDecoration: 'none',
                        minWidth: 0,
                        // Pushes everything after it to the far end of the bar,
                        // in whichever direction "far end" currently means.
                        marginInlineEnd: 'auto',
                    }}
                >
                        <Box
                                component="img"
                                src={chessFavicon}
                                alt=""
                                sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '3px',
                                    display: 'block',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    overflow:"hidden"
                                }}
                            />
                    {/*
                        Under the breakpoint the name goes out of sight rather
                        than away: the mark alone is the home link, and the
                        words stay its accessible name. The bar has 288px to
                        work with at 320 and the controls need all of it.
                    */}
                    <Typography
                        component="span"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: '-0.01em',
                            ...(compact ? visuallyHidden : {}),
                        }}
                    >
                        {t('app.brandText')}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <LanguageSwitch />
                    <ColorModeIconDropdown />
                </Stack>
            </Toolbar>
        </AppBar>
    );
};

/**
 * What the right-hand aside shows until a route puts something there — see
 * `rightPanel.tsx`. Unchanged from when the shell rendered these two lines
 * inline: a route that registers nothing must see exactly this.
 */
const AnalysisPlaceholder = () => {
    const { t } = useTranslation();

    return (
        <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("panel.analysisTitle")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                {t("panel.analysisPlaceholder")}
            </Typography>
        </>
    );
};

/** The `main` landmark's id — the skip link's target. */
const MAIN_ID = 'main-content';

/**
 * **Skip to main content** (CTA-112, WCAG 2.4.1) — the first stop of the tab
 * order, out of sight until it has the focus. It moves the focus itself
 * rather than following its `#` (which would add a history entry the router
 * then reads as a navigation); the `href` keeps it a real link.
 */
const SkipLink = ({ onSkip }: { onSkip: () => void }) => {
    const { t } = useTranslation();
    return (
        <Box
            component="a"
            href={`#${MAIN_ID}`}
            onClick={(event: MouseEvent) => {
                event.preventDefault();
                onSkip();
            }}
            data-testid="layout-skip-link"
            sx={(theme) => ({
                ...visuallyHidden,
                '&:focus': {
                    clip: 'auto',
                    width: 'auto',
                    height: 'auto',
                    margin: 0,
                    overflow: 'visible',
                    zIndex: theme.zIndex.tooltip,
                    insetBlockStart: 8,
                    insetInlineStart: 8,
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: theme.shadows[4],
                    ...theme.mixins.focusRing,
                },
            })}
        >
            {t('shell.skipToMain')}
        </Box>
    );
};

const DefaultLayoutViewport = () => {

    const svc = BoardWidgetContext.useActorRef()

    /*
      The shell's one breakpoint (CTA-118). A media query rather than a CSS
      one, because what changes is not only the styling: under it the rail is
      a drawer (a different element, mounted only while it is open) and the
      board square is measured against the width alone.
    */
    const compact = useShellCompact();

    // The board area is sized in pixels because `react-chessboard` fills its
    // container and has no intrinsic size. `ref` sits on the padded board
    // viewport (the row that holds the square + the analysis aside), so the
    // measurement already excludes the header, the footer and the sidebar —
    // whatever is left is what the square has to fit inside.
    const ref = useRef<HTMLDivElement>(null)
    /*
      A screen's own left panel (`BoardLeftPanel`, CTA-145 — the Analysis
      Board's sibling list) is a column of the row, before the square, and its
      width and gap come out of the square's like the aside's: a function of
      what is registered alone, so the square stays square. **While it is open
      the screen takes the whole window** — no header, no main menu rail, no
      footer (`focused`): the room for a column, a square and the panel beside
      it is not there with the menu's 280 px taken. Closing the panel brings the
      shell back. Stacked there is no column (the screen draws a drawer, and the
      header and its menu button stay).
    */
    const leftPanelOpen = useBoardLeftPanelOccupied() && !compact
    const leftPanelPx = leftPanelOpen ? BOARD_LEFT_PANEL_WIDTH_PX + BOARD_PANEL_GAP_PX : 0
    const [bodyDimentions, setBodyDimentions] = useState<Rect>({ width: 0, height: 0 })

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const measure = () => {
            const { width, height } = el.getBoundingClientRect();
            if (width === 0 || height === 0) return;
            setBodyDimentions((prev) =>
                prev.width === width && prev.height === height
                    ? prev
                    : { width, height },
            );
        };

        measure();

        // Preferred: observe the measured element itself, so any layout change
        // that resizes it re-squares the board.
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        // Also listen for window resizes directly — cheap, and covers
        // environments whose layout engine does not drive the observer.
        window.addEventListener("resize", measure);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, []);


    const boardDimentions = useMemo<Rect>(()=>{
        const { width, height } = bodyDimentions
        if (width === 0 || height === 0) return { width: 0, height: 0 };
        // Strip the inset from both edges before squaring, and the panel's
        // minimum and the gap before it from the width: the panel is a sibling
        // inside this row, so the board never had more than
        // `width - PANEL_MIN_WIDTH_PX - BOARD_PANEL_GAP_PX` to work with. Taking it off here is what lets the square grow into the rest —
        // measured against the row alone it would be sized against space the
        // panel is standing in, and would overflow it.
        //
        // Stacked (CTA-118), the panel is no longer a sibling in the row but
        // the box below, so none of the width is spoken for: the square takes
        // what the inset leaves, still bound by the height — down to
        // `STACKED_BOARD_MIN_PX`, past which the viewport scrolls rather than
        // the board shrink away.
        const minorSide = compact
            ? Math.max(
                0,
                Math.min(
                    width - BOARD_INSET_PX * 2,
                    Math.max(height - BOARD_INSET_PX * 2, STACKED_BOARD_MIN_PX),
                ),
            )
            : Math.max(
                0,
                Math.min(
                    width - PANEL_MIN_WIDTH_PX - BOARD_PANEL_GAP_PX - BOARD_INSET_PX * 2 - leftPanelPx,
                    height - BOARD_INSET_PX * 2,
                ),
            )
        return {
            width: minorSide,
            height: minorSide,
        }

    },[bodyDimentions, compact, leftPanelPx])

    /*
      A screen that spans the aside (`HideRightPanel`, CTA-142 — the Library's
      tournament Info tab): no aside, and the screen's area the square's
      height, reaching across the gap and the aside's room — the width the
      aside would have taken (its flex share, within its bounds) — so the
      row is centred exactly as with the aside and nothing moves as it comes
      and goes. Stacked, the square is the column's width already: there is
      only no panel under it.
    */
    const asideHidden = useRightPanelHidden();
    const areaDimentions = useMemo<Rect>(() => {
        if (!asideHidden || compact || boardDimentions.width === 0) return boardDimentions;
        const inner = bodyDimentions.width - BOARD_INSET_PX * 2 - leftPanelPx;
        const aside = Math.min(
            PANEL_MAX_WIDTH_PX,
            Math.max(PANEL_MIN_WIDTH_PX, inner - boardDimentions.width - BOARD_PANEL_GAP_PX),
        );
        return { width: boardDimentions.width + BOARD_PANEL_GAP_PX + aside, height: boardDimentions.height };
    }, [asideHidden, compact, boardDimentions, bodyDimentions, leftPanelPx])




    const matches = useMatches();
    // A route whose `handle` asks for the whole body (`routeHandle.ts`) gets
    // it: no square, no aside. Every other route gets the shell below as is.
    const fullWidth = isFullWidthRoute(matches);
    // An article (the front page, the Blog — CTA-130) is that, centred.
    const article = isArticleRoute(matches);

    /*
      The navigation drawer (CTA-118), open only under the breakpoint. It
      closes on a navigation — `location.key` changes on every one, a link to
      the route already shown included — and when the window grows back past
      the breakpoint, where the rail is on screen and a sheet over it would
      only be in the way. Both are adjusted during render against what was
      last seen, React's own answer to "reset state when a value changes"
      (as `Sidebar.tsx` follows the route); an effect would paint the open
      drawer for a frame first, and `react-hooks/set-state-in-effect` rejects
      it.
    */
    const location = useLocation();
    const [navOpen, setNavOpen] = useState(false);
    const [seenLocationKey, setSeenLocationKey] = useState(location.key);
    if (seenLocationKey !== location.key) {
        setSeenLocationKey(location.key);
        if (navOpen) setNavOpen(false);
    }
    if (navOpen && !compact) setNavOpen(false);
    const openNav = useCallback(() => setNavOpen(true), []);
    const closeNav = useCallback(() => setNavOpen(false), []);

    const updateLocationFn = useCallback((match:UIMatch)=>svc.send({
        type:"EVENTS.NAVIGATION.ROUTER.MATCH.UPDATE",
        match:match
    }),[svc])


    // The last pathname the service was told about. A ref, not state: nothing
    // renders from it — it only keeps the effect from telling the service
    // about the same route twice — and holding it in state needed a setState
    // inside the effect (react-hooks/set-state-in-effect).
    const lastSentPathRef = useRef<string>("");

    useEffect(()=>{
        console.log("[TemplatesReadonlyWidgetLayout] matches update", matches);
        // Read the leaf match; do not pop it out of the router's array.
        const last_match = matches[matches.length - 1]
        if(undefined === last_match) return
        if (lastSentPathRef.current === last_match.pathname) return
        lastSentPathRef.current = last_match.pathname

        console.log("[TemplatesReadonlyWidgetLayout][updateLocationFn] called", last_match);
        updateLocationFn(last_match)
    },[matches, updateLocationFn])

    /*
      The page (CTA-112): its title from the route's handle — the page the
      address names first, for a route with `meta` (CTA-135) — and the record
      a screen reports (`pageTitle.ts`): the document's `<title>`, the `main`
      landmark's name and — unless the screen renders its own — the page's
      one `h1`, visually hidden.

      The `<title>` and the description are **rendered** (below), not written
      in an effect: React 19 hoists them into `<head>`, so a page rendered to
      HTML ahead of time carries them as the browser's does (CTA-135).
    */
    const { t, i18n } = useTranslation();
    const [pageStore] = useState(createPageTitleStore);
    const detail = useSyncExternalStore(pageStore.subscribe, pageStore.getDetail, pageStore.getDetail);
    const ownHeading = useSyncExternalStore(pageStore.subscribe, pageStore.getOwnHeadings, pageStore.getOwnHeadings) > 0;
    const titleKey = titleKeyOf(matches);
    const meta = pageMetaOf(matches, asAppLanguage(i18n.language));
    const { title, heading } = pageTitleOf(
        titleKey === undefined ? undefined : t(titleKey),
        meta?.title ?? detail,
        t('app.brandText'),
    );
    // The page's description, else its screen's (CTA-136).
    const descriptionKey = descriptionKeyOf(titleKey);
    const description = meta?.description ?? (descriptionKey !== undefined && i18n.exists(descriptionKey) ? t(descriptionKey) : undefined);

    const mainRef = useRef<HTMLElement>(null);
    /** The shell's hidden `h1` took the focus, and a screen's own may yet replace it. */
    const shellHeadingFocusedRef = useRef(false);
    const focusMain = useCallback(() => mainRef.current?.focus(), []);
    const focusPageHeading = useCallback(() => {
        const main = mainRef.current;
        if (main === null) return;
        const h1 = main.querySelector<HTMLElement>('h1');
        if (h1 === null) {
            main.focus();
            return;
        }
        // A screen's own heading is not focusable; made so for this, and only
        // by script (`-1`), so the tab order does not change.
        if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
        h1.focus();
        shellHeadingFocusedRef.current = h1.dataset.shellHeading !== undefined;
    }, []);

    /*
      A move to another screen (CTA-112) takes the focus to its heading, which
      a screen reader then reads — the page it has arrived on. Not on the first
      load (the browser announces the page), and not within a screen: the
      screen is its route's title key, so a query string (`?move=`, `?sort=`),
      a Settings tab or the next Library game leaves the focus where it was —
      but each page of a route with `meta` (a Blog article, CTA-135) is its own.
      After a tick, so the new screen has mounted and said whether it renders
      its own heading.
    */
    const screenId = screenIdOf(matches);
    const shownScreenRef = useRef<string | null>(null);
    useEffect(() => {
        const previous = shownScreenRef.current;
        shownScreenRef.current = screenId;
        if (previous === null || previous === screenId) return;
        const timer = setTimeout(focusPageHeading, 0);
        return () => clearTimeout(timer);
    }, [screenId, focusPageHeading]);

    /*
      A screen whose heading arrives after its record (a Library collection
      being read) replaces the shell's hidden one while it has the focus —
      which would drop the focus on the body. Hand it on to the new heading.
    */
    useEffect(() => {
        if (!ownHeading || !shellHeadingFocusedRef.current) return;
        shellHeadingFocusedRef.current = false;
        const active = document.activeElement;
        if (active === null || active === document.body) focusPageHeading();
    }, [ownHeading, focusPageHeading]);

    const mainProps = {
        component: 'main',
        id: MAIN_ID,
        ref: mainRef,
        tabIndex: -1,
        'aria-label': heading,
    } as const;

    const pageHeading = ownHeading ? null : (
        <Box component="h1" data-shell-heading="" data-testid="layout-page-heading" sx={{ ...visuallyHidden, '&:focus': { outline: 'none' } }}>
            {heading}
        </Box>
    );





    return (
        <PageTitleContext.Provider value={pageStore}>
        <title>{title}</title>
        {description !== undefined && <meta name="description" content={description} />}
        <Box
            data-testid="layout-root"
            component="div"
            sx={{
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.default",
                color: "text.primary",
                height: "100vh",
                width: "100vw",
                flexGrow: 0,
                overflow: "hidden",
            }}
        >
            <SkipLink onSkip={focusMain} />
            {!leftPanelOpen && <Header compact={compact} onOpenNav={openNav} />}

            <Box
                 data-testid="layout-wrapper"
                sx={{
                    display: "flex",
                    bgcolor: "background.default",
                    flexGrow: 1,
                    // Without this the row refuses to shrink below its content
                    // and pushes the shell past the viewport instead of
                    // clipping — which would also make the measurement below
                    // read a taller box than the one actually on screen.
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                {/*
                    The rail, or — under the breakpoint (CTA-118) — the drawer
                    it becomes, opened from the header and holding exactly the
                    same thing. Either way the per-route left-panel slot
                    (`leftPanel.tsx`) is what fills it, mirroring the aside's
                    `RightPanelOutlet` below: a screen may render `<LeftPanel>`
                    to replace the nav tree for as long as it is mounted (no
                    shipped screen does today); with none registered the outlet
                    renders `<SideBar/>`. The slot swaps *content*, not the
                    row's proportions.
                */}
                {leftPanelOpen ? null : compact ? (
                    <NavDrawer
                        open={navOpen}
                        onClose={closeNav}
                        label={t('nav.ariaLabel')}
                        width={SIDEBAR_WIDTH_PX}
                        testId="layout-nav-drawer"
                    >
                        <LeftPanelOutlet fallback={<SideBar />} />
                    </NavDrawer>
                ) : (
                    <Box
                        data-testid="layout-sidebar-container"
                        sx={{
                            width: `${SIDEBAR_WIDTH_PX}px`,
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: "column"
                        }}
                    >
                        <LeftPanelOutlet fallback={<SideBar />} />

                    </Box>
                )}

                <Box
                   data-testid="layout-body-container"
                    sx={{
                        // Everything the rail does not take. `minWidth: 0` so a
                        // wide board or panel cannot push this past the window.
                        flexGrow: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                   <Box
                        ref={ref}
                        data-testid="layout-board-viewport"
                        sx={{
                            display: "flex",
                            flexGrow:1,
                            minHeight: 0,
                            // Stacked (CTA-118): the panel goes under the
                            // square instead of beside it, and the column
                            // scrolls — the two together are taller than a
                            // narrow window, and downwards is the one
                            // direction WCAG 1.4.10 allows.
                            flexDirection: compact ? "column" : "row",
                            // Only bites once the panel is at its maximum and
                            // the square at its height: then, and only then, is
                            // there anything left over to centre. Stacked there
                            // is nothing to centre — the column starts at the top.
                            justifyContent: compact ? "flex-start" : "center",
                            // The shell-level board inset (was `p: 2` on one
                            // Main wrapper only). Measured together with the box
                            // in `getBoundingClientRect`, then subtracted back
                            // out when the square is computed.
                            p: `${BOARD_INSET_PX}px`,
                            // Between the square and the panel — taken off the
                            // square's width above.
                            gap: `${BOARD_PANEL_GAP_PX}px`,
                            overflowX: "hidden",
                            overflowY: compact ? "auto" : "hidden",
                        }}
                   >
                        {!fullWidth && <BoardLeftPanelOutlet compact={compact} />}
                        {fullWidth ? (
                            <Box
                                {...mainProps}
                                data-testid="layout-full-body"
                                sx={{
                                    flexGrow: 1,
                                    minWidth: 0,
                                    minHeight: 0,
                                    outline: 'none',
                                    // An article scrolls here, the body's
                                    // whole height, so the scrollbar is the
                                    // page's and not the column's.
                                    ...(article ? { overflowY: 'auto' } : {}),
                                }}
                            >
                                {article ? (
                                    /*
                                      The article's column (CTA-130): centred,
                                      at most a readable width, the whole body
                                      under it — so it reflows at 320 px. No
                                      ForceLTR: the boards an article embeds
                                      pin themselves (`DemoBoard`,
                                      `ExcerptBoard`), and the prose mirrors.
                                    */
                                    <Box
                                        data-testid="layout-article-column"
                                        sx={{
                                            width: '100%',
                                            maxWidth: `${ARTICLE_MAX_WIDTH_PX}px`,
                                            marginInline: 'auto',
                                        }}
                                    >
                                        {pageHeading}
                                        <Outlet />
                                    </Box>
                                ) : (<>
                                    {pageHeading}
                                    <Outlet />
                                </>)}
                            </Box>
                        ) : (<>
                        {/*
                            The screen — the `main` landmark (CTA-112), named
                            by the page's title. The panel beside it is a
                            landmark of its own, the complementary aside.
                        */}
                        <Box
                            {...mainProps}
                            data-testid="layout-main"
                            sx={{
                                outline: 'none',
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                // Stacked, `main` is the column's full width —
                                // the square is centred inside it — so the
                                // screen has the viewport less the shell's
                                // inset whatever the square's side works out
                                // to (CTA-118, the reflow gate).
                                ...(compact ? { alignSelf: "stretch" } : {}),
                            }}
                        >
                            {pageHeading}
                             <Box
                                data-testid="layout-board-square-body"
                                // A plain inline style, not `sx`: this is a
                                // per-pixel value with no theme token in it, and
                                // it changes on every resize — no reason to mint
                                // a fresh emotion class each time.
                                style={{
                                    width: `${areaDimentions.width}px`,
                                    height: `${areaDimentions.height}px`,
                                }}
                            >
                                {/*
                                    The board must never mirror: files run a-h left
                                    to right in every language, and flipping them
                                    would put a1 bottom-right while chess.js and the
                                    engine still report a1 as bottom-left. ForceLTR
                                    pins this subtree to the unflipped emotion cache
                                    and an LTR theme. It fills the square rather than
                                    wrapping it, so the container-sizing contract in
                                    .claude/rules/chessboard.md still holds.
                                */}
                                <ForceLTR sx={{ width: "100%", height: "100%" }}>
                                    <Outlet />
                                </ForceLTR>

                            </Box>
                        </Box>

                         {!asideHidden && <Box
                            component="aside"
                            aria-label={t('shell.sidePanel')}
                            data-testid="layout-board-square-sidebar"
                            sx={{
                                /*
                                  Takes the width the square leaves, within its
                                  bounds — so the row has no gap down the middle
                                  on a wide window, where the square is bound by
                                  height long before it is bound by width.
                                */
                                flexGrow: compact ? 0 : 1,
                                flexShrink: 0,
                                /*
                                  From nothing, not from its content (CTA-142):
                                  with an `auto` basis a panel whose content is
                                  wide (a list's long lines, a table) started at
                                  its 560 px cap whatever the square left, so on
                                  a 1500 × 900 window the row overflowed and the
                                  square was clipped under the sidebar. From 0 it
                                  grows into exactly what the square leaves,
                                  held between its min and max.
                                */
                                ...(compact ? {} : { flexBasis: 0 }),
                                /*
                                  A column, and it does not scroll itself: a
                                  panel that wants a section pinned to the foot
                                  of the aside — the board controls under the
                                  move list — needs the height to divide up, and
                                  a scrolling parent would let the pinned part
                                  slide off instead. Panels scroll their own
                                  sections; the fallback placeholder is two
                                  lines and needs neither.
                                */
                                display: "flex",
                                flexDirection: "column",
                                minHeight: 0,
                                overflow: "hidden",
                                p: 2,
                                bgcolor: "background.paper",
                                borderColor: "divider",
                                /*
                                  Stacked (CTA-118) the panel is the box under
                                  the square, not the column beside it: it takes
                                  the whole width, and a height of its own —
                                  `BoardPanel` is a flex column whose one
                                  scrolling section is `flex: 1`, which
                                  collapses to nothing without one. Last in the
                                  object, so it has the `minHeight: 0` above.
                                  The viewport scrolls down to it.
                                */
                                ...(compact
                                    ? {
                                        alignSelf: "stretch",
                                        minWidth: 0,
                                        minHeight: `${STACKED_PANEL_MIN_HEIGHT_PX}px`,
                                        borderBlockStart: "1px solid",
                                    }
                                    : {
                                        minWidth: `${PANEL_MIN_WIDTH_PX}px`,
                                        maxWidth: `${PANEL_MAX_WIDTH_PX}px`,
                                        borderInlineStart: "1px solid",
                                    }),
                            }}
                        >
                            {/*
                                The per-route panel slot. A route renders
                                `<RightPanel>` (see `rightPanel.tsx`) to fill
                                this aside with its own content; with none
                                registered — all four board screens today — the
                                outlet renders the Analysis placeholder and the
                                aside is exactly what it always was. The aside
                                itself stays outside ForceLTR and mirrors under
                                Hebrew, panel content included.
                            */}
                            <RightPanelOutlet fallback={<AnalysisPlaceholder />} />

                        </Box>}
                        </>)}



                   </Box>


                </Box>


            </Box>

            {!leftPanelOpen && <Footer />}

        </Box>
        </PageTitleContext.Provider>
    )
}



const DefaultLayout = ()=>
            <BoardWidgetContext.Provider>
                {/*
                    Above the viewport, so both outlets and every route behind
                    the `<Outlet />` share one slot each. Nesting order between
                    the two providers does not matter — the contexts are
                    independent.
                */}
                <RightPanelProvider>
                    <LeftPanelProvider>
                        <BoardLeftPanelProvider>
                            <DefaultLayoutViewport />
                        </BoardLeftPanelProvider>
                    </LeftPanelProvider>
                </RightPanelProvider>
            </BoardWidgetContext.Provider>

export { DefaultLayout }
