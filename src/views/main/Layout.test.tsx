import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  Link,
  RouterProvider,
  type RouteObject,
} from "react-router";
import i18n from "../../i18n";
import { expectNoAxeViolations, PAGE_STRUCTURE_RULES } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { DefaultLayout } from "./Layout";
import { HideRightPanel, RightPanel } from "./rightPanel";
import { LeftPanel } from "./leftPanel";
import { BoardLeftPanel } from "./boardLeftPanel";
import { BOARD_LEFT_PANEL_COLLAPSED_PX, BOARD_LEFT_PANEL_WIDTH_PX } from "./boardLeftPanelSlot";
import { ForceLTR } from "../../theme/ForceLTR";
import { ARTICLE_MAX_WIDTH_PX, ARTICLE_ROUTE, FULL_WIDTH_ROUTE } from "./routeHandle";

/** The one throwaway screen most of these tests put behind the `<Outlet />`. */
const blankScreen: RouteObject[] = [
  { index: true, element: <div data-testid="screen" /> },
];

/**
 * Mounts the real app shell over a data router (which `useMatches` inside the
 * layout needs). `children` and `initialEntries` default to a single blank
 * screen at "/"; the right-panel tests pass their own routes. The router comes
 * back alongside the render result so a test can navigate.
 */
const renderShell = (
  children: RouteObject[] = blankScreen,
  initialEntries: string[] = ["/"],
) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <DefaultLayout />,
        children,
      },
    ],
    { initialEntries },
  );

  return {
    ...render(
      <AppThemeWithLang>
        <RouterProvider router={router} />
      </AppThemeWithLang>,
    ),
    router,
  };
};

/**
 * The emotion cache prefix (`muiltr` / `muirtl`) of the nearest styled ancestor
 * — i.e. which direction the subtree is rendering through.
 */
const nearestCache = (start: Element | null) => {
  for (let n = start; n; n = n.parentElement) {
    const hit = [...n.classList].find((c) => /^mui(ltr|rtl)-/.test(c));
    if (hit) return hit.slice(0, 6);
  }
  return undefined;
};

const rect = (width: number, height: number): DOMRect =>
  ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("app shell footer", () => {
  it("is rendered once by the shell", () => {
    renderShell();
    expect(screen.getAllByTestId("layout-footer")).toHaveLength(1);
  });

  it("shows the app version injected at build time", () => {
    renderShell();
    // `__APP_VERSION__` is Vite's `define` from package.json — Vitest replaces
    // it here the same way it does in the component.
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+/);
    expect(screen.getByTestId("layout-footer")).toHaveTextContent(
      `v${__APP_VERSION__}`,
    );
  });

  it("links to the source repo, opening in a new tab", () => {
    renderShell();
    const link = screen.getByTestId("layout-footer-repo-link");
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/pgntools/chess-trainer-app",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("labels the repo link from the catalog in both languages", async () => {
    const first = renderShell();
    expect(screen.getByTestId("layout-footer-repo-link")).toHaveTextContent(
      i18n.t("footer.source"),
    );
    first.unmount();

    await i18n.changeLanguage("he");
    renderShell();
    expect(screen.getByTestId("layout-footer-repo-link")).toHaveTextContent(
      "מקור",
    );
  });

  it("links to the Privacy Policy and the Cookies Notice, in both languages (CTA-159)", async () => {
    const first = renderShell();
    const footer = within(screen.getByTestId("layout-footer"));
    expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(footer.getByRole("link", { name: "Cookies Notice" })).toHaveAttribute("href", "/cookies");
    first.unmount();

    await i18n.changeLanguage("he");
    renderShell();
    const hebrew = within(screen.getByTestId("layout-footer"));
    expect(hebrew.getByRole("link", { name: "מדיניות פרטיות" })).toHaveAttribute("href", "/privacy");
    expect(hebrew.getByRole("link", { name: "הודעת עוגיות" })).toHaveAttribute("href", "/cookies");
  });

  it("leaves the footer on the shell's direction — only the board is pinned LTR", async () => {
    await i18n.changeLanguage("he");
    renderShell();

    // The emotion cache each subtree renders through: `muirtl` is the mirrored
    // one the shell uses under Hebrew. The footer goes through it like the
    // sidebar does — it is not pinned LTR.
    expect(nearestCache(screen.getByTestId("layout-footer"))).toBe("muirtl");

    // The board area, by contrast, still has `ForceLTR`'s `dir="ltr"` wrapper
    // inside it — mirroring has not leaked in.
    const board = screen.getByTestId("layout-board-square-body");
    expect(board.querySelector('[dir="ltr"]')).not.toBeNull();
  });
});

describe("board square reflow on window resize", () => {
  afterEach(() => vi.restoreAllMocks());

  it("re-measures and re-squares when the window resizes", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    grbc.mockReturnValue(rect(800, 600));

    renderShell();
    const square = screen.getByTestId("layout-board-square-body");

    // min(800 - 320 - 16 - 32, 600 - 32): the fixed 320px panel and the 16px
    // gap before it come off the width before squaring, and the p:2 inset off
    // both edges (2 * 16px).
    await waitFor(() =>
      expect(square).toHaveStyle({ width: "432px", height: "432px" }),
    );

    grbc.mockReturnValue(rect(500, 400));
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    // min(500 - 320 - 16 - 32, 400 - 32) — width-bound at this size.
    await waitFor(() =>
      expect(square).toHaveStyle({ width: "132px", height: "132px" }),
    );
  });

  it("keeps a gap between the square and the panel (CTA-82)", () => {
    renderShell();
    // A flex gap is logical, so it holds on either side under RTL; the width
    // it takes is subtracted from the square above.
    expect(screen.getByTestId("layout-board-viewport")).toHaveStyle({ gap: "16px" });
  });

  it("never sizes the square below zero", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    grbc.mockReturnValue(rect(10, 10));

    renderShell();
    const square = screen.getByTestId("layout-board-square-body");

    await waitFor(() =>
      expect(square).toHaveStyle({ width: "0px", height: "0px" }),
    );
  });
});

describe("a screen that spans the aside (CTA-142)", () => {
  afterEach(() => vi.restoreAllMocks());

  /** One screen that spans the aside while its switch is on, and keeps its own state either way. */
  const Toggling = () => {
    const [hidden, setHidden] = useState(true);
    const [count, setCount] = useState(0);
    return (
      <div data-testid="screen">
        <button onClick={() => setHidden((on) => !on)}>toggle</button>
        <button onClick={() => setCount((c) => c + 1)}>bump {count}</button>
        {hidden && <HideRightPanel />}
      </div>
    );
  };

  it("draws no aside; the area keeps the square's start and height and reaches across the aside's room — without a remount", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    grbc.mockReturnValue(rect(800, 600));
    renderShell([{ index: true, element: <Toggling /> }]);

    expect(screen.queryByTestId("layout-board-square-sidebar")).toBeNull();
    const area = screen.getByTestId("layout-board-square-body");
    // The square (432), the gap (16) and the aside's 320: 768 wide, the square's 432 high.
    await waitFor(() => expect(area).toHaveStyle({ width: "768px", height: "432px" }));
    expect(area).toContainElement(screen.getByTestId("screen"));

    fireEvent.click(screen.getByRole("button", { name: "bump 0" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    // The aside is back, the square too — and the screen kept its state: it was not remounted.
    expect(screen.getByTestId("layout-board-square-sidebar")).toBeInTheDocument();
    await waitFor(() => expect(area).toHaveStyle({ width: "432px", height: "432px" }));
    expect(screen.getByRole("button", { name: "bump 1" })).toBeInTheDocument();
  });

  it("takes the aside's width within its bounds — on a wide window, its 560 px at most", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    grbc.mockReturnValue(rect(1400, 600));
    renderShell([{ index: true, element: <HideRightPanel /> }]);
    // The square min(1400 - 320 - 16 - 32, 600 - 32) = 568, the gap, and the aside's 560 cap.
    await waitFor(() => expect(screen.getByTestId("layout-board-square-body")).toHaveStyle({ width: "1144px", height: "568px" }));
  });

  it("does nothing outside the shell", () => {
    render(<HideRightPanel />);
  });

  it("grows the aside from nothing, so wide content never sets its width and overflows the row", () => {
    renderShell();
    expect(screen.getByTestId("layout-board-square-sidebar")).toHaveStyle({ flexBasis: "0" });
  });
});

describe("a full-width route (CTA-107)", () => {
  const routes: RouteObject[] = [
    { index: true, element: <div data-testid="screen" /> },
    { path: "wide", element: <div data-testid="wide-screen" />, handle: FULL_WIDTH_ROUTE },
  ];

  it("gives a route that asks for it the whole body: no board square, no aside", () => {
    renderShell(routes, ["/wide"]);
    expect(screen.getByTestId("layout-full-body")).toContainElement(screen.getByTestId("wide-screen"));
    expect(screen.queryByTestId("layout-board-square-body")).toBeNull();
    expect(screen.queryByTestId("layout-board-square-sidebar")).toBeNull();
    // Not a board, so not pinned LTR: it mirrors with the app.
    // The nearest `dir` is the document's own, which follows the language.
    expect(screen.getByTestId("wide-screen").closest("[dir]")).toBe(document.body);
    // The nav rail stays.
    expect(screen.getByTestId("layout-sidebar-container")).toBeInTheDocument();
  });

  it("leaves every other route the square and the aside", async () => {
    const { router } = renderShell(routes, ["/wide"]);
    await act(() => router.navigate("/"));
    expect(screen.queryByTestId("layout-full-body")).toBeNull();
    expect(screen.getByTestId("layout-board-square-body")).toContainElement(screen.getByTestId("screen"));
    expect(screen.getByTestId("layout-board-square-sidebar")).toBeInTheDocument();
  });
});

describe("an article route — the front page, the Blog (CTA-130)", () => {
  /** An article's kind of screen: prose, and a board that pins itself as `DemoBoard` does. */
  const Article = () => (
    <div data-testid="article-screen">
      <p data-testid="article-prose">Prose</p>
      <ForceLTR>
        <div data-testid="article-board" />
      </ForceLTR>
    </div>
  );
  const routes: RouteObject[] = [
    { index: true, element: <div data-testid="screen" /> },
    { path: "article", element: <Article />, handle: ARTICLE_ROUTE },
    { path: "wide", element: <div data-testid="wide-screen" />, handle: FULL_WIDTH_ROUTE },
  ];

  it("is the whole body, the content in one centred column at a readable width — no square, no aside", () => {
    renderShell(routes, ["/article"]);
    const body = screen.getByTestId("layout-full-body");
    const column = screen.getByTestId("layout-article-column");
    expect(body).toContainElement(column);
    expect(column).toContainElement(screen.getByTestId("article-screen"));
    expect(column).toHaveStyle({ width: "100%", maxWidth: `${ARTICLE_MAX_WIDTH_PX}px` });
    // The body scrolls the article, so the scrollbar is the page's.
    expect(body).toHaveStyle({ overflowY: "auto" });
    expect(screen.queryByTestId("layout-board-square-body")).toBeNull();
    expect(screen.queryByTestId("layout-board-square-sidebar")).toBeNull();
    expect(screen.getByRole("main")).toBe(body);
    // The nav rail stays.
    expect(screen.getByTestId("layout-sidebar-container")).toBeInTheDocument();
  });

  it("leaves a full-width route its whole width, and a board route its square and aside", async () => {
    const { router } = renderShell(routes, ["/wide"]);
    expect(screen.getByTestId("layout-full-body")).toContainElement(screen.getByTestId("wide-screen"));
    expect(screen.queryByTestId("layout-article-column")).toBeNull();
    await act(() => router.navigate("/"));
    expect(screen.queryByTestId("layout-full-body")).toBeNull();
    expect(screen.getByTestId("layout-board-square-body")).toContainElement(screen.getByTestId("screen"));
    expect(screen.getByTestId("layout-board-square-sidebar")).toBeInTheDocument();
  });

  it("mirrors under Hebrew — no shell ForceLTR — while a board it embeds stays left to right", async () => {
    await i18n.changeLanguage("he");
    renderShell(routes, ["/article"]);
    expect(nearestCache(screen.getByTestId("layout-article-column"))).toBe("muirtl");
    expect(screen.getByTestId("article-prose").closest("[dir]")).toBe(document.body);
    expect(screen.getByTestId("article-board").closest("[dir]")).toHaveAttribute("dir", "ltr");
    expect(nearestCache(screen.getByTestId("article-board"))).toBe("muiltr");
  });
});

describe("route-driven right panel slot", () => {
  const aside = () => screen.getByTestId("layout-board-square-sidebar");

  /** A screen that fills the shell's aside, and owns the state it shows there. */
  const PanelScreen = () => {
    const [count, setCount] = useState(0);

    return (
      <div data-testid="screen">
        <Link to="/plain">away</Link>
        <button onClick={() => setCount((c) => c + 1)}>bump</button>
        <RightPanel>
          <div data-testid="panel-content">panel {count}</div>
        </RightPanel>
      </div>
    );
  };

  /** Index route registers a panel; "/plain" registers nothing. */
  const panelRoutes: RouteObject[] = [
    { index: true, element: <PanelScreen /> },
    { path: "plain", element: <div data-testid="screen" /> },
  ];

  it("shows the Analysis placeholder when no route registers a panel", () => {
    renderShell();

    expect(aside()).toHaveTextContent(i18n.t("panel.analysisTitle"));
    expect(aside()).toHaveTextContent(i18n.t("panel.analysisPlaceholder"));
    // The host element only exists while the slot is occupied, so an
    // unregistered aside is the placeholder and nothing else.
    expect(screen.queryByTestId("layout-right-panel")).toBeNull();
  });

  it("renders a route's registered panel in the aside, in place of the placeholder", () => {
    renderShell(panelRoutes);

    const content = screen.getByTestId("panel-content");
    expect(aside()).toContainElement(content);
    expect(aside()).not.toHaveTextContent(i18n.t("panel.analysisPlaceholder"));
  });

  it("keeps the panel live: it re-renders with the screen that owns it", async () => {
    renderShell(panelRoutes);

    expect(screen.getByTestId("panel-content")).toHaveTextContent("panel 0");

    fireEvent.click(screen.getByRole("button", { name: "bump" }));

    await waitFor(() =>
      expect(screen.getByTestId("panel-content")).toHaveTextContent("panel 1"),
    );
  });

  it("restores the placeholder when the registering route is navigated away from", async () => {
    const { router } = renderShell(panelRoutes);
    expect(screen.getByTestId("panel-content")).toBeInTheDocument();

    await act(() => router.navigate("/plain"));

    expect(screen.queryByTestId("panel-content")).toBeNull();
    expect(screen.queryByTestId("layout-right-panel")).toBeNull();
    expect(aside()).toHaveTextContent(i18n.t("panel.analysisPlaceholder"));

    // …and back again: the slot is reusable, not a one-shot.
    await act(() => router.navigate("/"));
    expect(screen.getByTestId("panel-content")).toBeInTheDocument();
  });

  it("keeps the panel's DOM node in place across shell re-renders", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    grbc.mockReturnValue(rect(800, 600));

    renderShell(panelRoutes);
    const before = screen.getByTestId("panel-content");

    // A window resize re-renders the whole shell, the outlet included. The
    // panel's own DOM has to survive that untouched — it may hold a scroll
    // position or the focused element — so the host is never re-created and
    // the portal is never torn down and rebuilt.
    grbc.mockReturnValue(rect(500, 400));
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("layout-board-square-body")).toHaveStyle({
        width: "132px",
      }),
    );

    expect(screen.getByTestId("panel-content")).toBe(before);
    grbc.mockRestore();
  });

  it("mirrors panel content under Hebrew — the aside is not pinned LTR", async () => {
    await i18n.changeLanguage("he");
    renderShell(panelRoutes);

    expect(nearestCache(screen.getByTestId("panel-content"))).toBe("muirtl");
  });
});

describe("route-driven left panel slot", () => {
  const sidebarContainer = () => screen.getByTestId("layout-sidebar-container");

  /** A screen that claims the sidebar's slot, and owns the state it shows there. */
  const LeftPanelScreen = () => {
    const [count, setCount] = useState(0);

    return (
      <div data-testid="screen">
        <Link to="/plain">away</Link>
        <button onClick={() => setCount((c) => c + 1)}>bump</button>
        <LeftPanel>
          <div data-testid="left-panel-content">sibling nav {count}</div>
        </LeftPanel>
      </div>
    );
  };

  /** Index route claims the slot; "/plain" claims nothing. */
  const leftPanelRoutes: RouteObject[] = [
    { index: true, element: <LeftPanelScreen /> },
    { path: "plain", element: <div data-testid="screen" /> },
  ];

  it("shows the ordinary sidebar when no route claims the slot", () => {
    renderShell();

    expect(screen.getByTestId("layout-sidebar")).toBeInTheDocument();
    expect(screen.queryByTestId("layout-left-panel")).toBeNull();
  });

  it("replaces the sidebar with a route's registered panel", () => {
    renderShell(leftPanelRoutes);

    const content = screen.getByTestId("left-panel-content");
    expect(sidebarContainer()).toContainElement(content);
    expect(screen.queryByTestId("layout-sidebar")).toBeNull();
  });

  it("keeps the panel live: it re-renders with the screen that owns it", async () => {
    renderShell(leftPanelRoutes);

    expect(screen.getByTestId("left-panel-content")).toHaveTextContent(
      "sibling nav 0",
    );

    fireEvent.click(screen.getByRole("button", { name: "bump" }));

    await waitFor(() =>
      expect(screen.getByTestId("left-panel-content")).toHaveTextContent(
        "sibling nav 1",
      ),
    );
  });

  it("restores the ordinary sidebar when the registering route is navigated away from", async () => {
    const { router } = renderShell(leftPanelRoutes);
    expect(screen.getByTestId("left-panel-content")).toBeInTheDocument();

    await act(() => router.navigate("/plain"));

    expect(screen.queryByTestId("left-panel-content")).toBeNull();
    expect(screen.queryByTestId("layout-left-panel")).toBeNull();
    expect(screen.getByTestId("layout-sidebar")).toBeInTheDocument();

    // …and back again: the slot is reusable, not a one-shot.
    await act(() => router.navigate("/"));
    expect(screen.getByTestId("left-panel-content")).toBeInTheDocument();
  });

  it("keeps the same fixed width whichever content occupies the slot", () => {
    renderShell(leftPanelRoutes);

    // The sidebar box swaps *content*, not the row's proportions — the board
    // square's own maths (bound only by the panel's aside on the right) does
    // not have to change for this slot.
    expect(sidebarContainer()).toHaveStyle({
      width: "280px",
      flexShrink: "0",
    });
  });

  it("does not disturb the right panel while the left one is claimed", () => {
    const bothPanelsRoute: RouteObject[] = [
      {
        index: true,
        element: (
          <div data-testid="screen">
            <LeftPanel>
              <div data-testid="left-panel-content">siblings</div>
            </LeftPanel>
            <RightPanel>
              <div data-testid="panel-content">analysis</div>
            </RightPanel>
          </div>
        ),
      },
    ];

    renderShell(bothPanelsRoute);

    expect(screen.getByTestId("left-panel-content")).toBeInTheDocument();
    expect(screen.getByTestId("panel-content")).toBeInTheDocument();
  });
});

describe("fixed-width rails", () => {
  it("pins the nav rail to a fixed width rather than a share of the window", () => {
    renderShell();

    expect(screen.getByTestId("layout-sidebar-container")).toHaveStyle({
      width: "280px",
      flexShrink: "0",
    });
  });

  it("lets the panel take whatever the square leaves, within its bounds", () => {
    renderShell();

    // Not a fixed width: the square is a square, so on a wide window it runs
    // out of height long before width, and a fixed panel would strand the
    // difference as a gap down the middle. Only the *minimum* is what the
    // square is sized against, which is what keeps the two from chasing
    // each other.
    expect(screen.getByTestId("layout-board-square-sidebar")).toHaveStyle({
      flexGrow: "1",
      minWidth: "320px",
      maxWidth: "560px",
    });
  });

  it("does not scroll the aside itself, so a panel can pin content to its foot", () => {
    renderShell();

    // A board's panel divides this height between a scrolling tab and the
    // controls pinned beneath it; a scrolling aside would let the controls
    // slide out of view under a long game instead.
    expect(screen.getByTestId("layout-board-square-sidebar")).toHaveStyle({
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    });
  });

  it("still squares the board against height when height is the binding side", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    // Wide and short: the panel leaves 1200 - 320 - 16 - 32 = 832 of width, but only
    // 400 - 32 = 368 of height, so the square is height-bound.
    grbc.mockReturnValue(rect(1200, 400));

    renderShell();

    await waitFor(() =>
      expect(screen.getByTestId("layout-board-square-body")).toHaveStyle({
        width: "368px",
        height: "368px",
      }),
    );
    grbc.mockRestore();
  });

  it("never sizes the square below zero when the panel outgrows the row", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    // Narrower than the panel alone — the width term goes negative.
    grbc.mockReturnValue(rect(200, 600));

    renderShell();

    await waitFor(() =>
      expect(screen.getByTestId("layout-board-square-body")).toHaveStyle({
        width: "0px",
        height: "0px",
      }),
    );
    grbc.mockRestore();
  });
});

/*
  Under the shell's breakpoint (CTA-118, WCAG 1.4.10): the rail becomes a
  drawer opened from the header, and the board's panel stacks under the
  square. jsdom answers every media query `false`, which is the desktop shell
  — what every test above renders; these stub the narrow window instead.
*/
describe("the board's own left panel (CTA-145)", () => {
  afterEach(() => vi.restoreAllMocks());

  /** A screen with a panel of its own beside the board — shown or not, its drawer opened or not — keeping a count of its own. */
  const WithPanel = () => {
    const [shown, setShown] = useState(true);
    const [open, setOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [count, setCount] = useState(0);
    return (
      <div data-testid="screen">
        <button onClick={() => setShown((on) => !on)}>toggle</button>
        <button onClick={() => setCollapsed((on) => !on)}>fold</button>
        <button onClick={() => setOpen(true)}>open drawer</button>
        <button onClick={() => setCount((c) => c + 1)}>bump {count}</button>
        {shown && (
          <BoardLeftPanel collapsed={collapsed} open={open} onClose={() => setOpen(false)} drawerLabel="Folder analyses">
            <p data-testid="panel-content">The folder</p>
          </BoardLeftPanel>
        )}
      </div>
    );
  };

  it("draws no column while no screen registers one", () => {
    renderShell();
    expect(screen.queryByTestId("layout-board-left-panel")).toBeNull();
  });

  it("puts a registered panel in its own column before the square, in the board's row", async () => {
    renderShell([{ index: true, element: <WithPanel /> }]);
    const column = await screen.findByTestId("layout-board-left-panel");
    expect(within(column).getByTestId("panel-content")).toBeInTheDocument();
    expect(column).toHaveStyle({ width: `${BOARD_LEFT_PANEL_WIDTH_PX}px` });
    const viewport = screen.getByTestId("layout-board-viewport");
    const order = [...viewport.children].map((child) => child.getAttribute("data-testid"));
    expect(order).toEqual(["layout-board-left-panel", "layout-main", "layout-board-square-sidebar"]);
  });

  it("gives the screen the whole window while open — no header, no main menu, no footer — and the shell back when closed, without a remount", async () => {
    renderShell([{ index: true, element: <WithPanel /> }]);
    await screen.findByTestId("layout-board-left-panel");
    expect(screen.queryByTestId("layout-header")).toBeNull();
    expect(screen.queryByTestId("layout-sidebar-container")).toBeNull();
    expect(screen.queryByRole("navigation", { name: i18n.t("nav.ariaLabel") })).toBeNull();
    expect(screen.queryByTestId("layout-footer")).toBeNull();
    // The page keeps its landmarks and its skip link.
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByTestId("layout-skip-link")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "bump 0" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("layout-header")).toBeInTheDocument();
    expect(within(screen.getByTestId("layout-sidebar-container")).getByRole("navigation", { name: i18n.t("nav.ariaLabel") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "bump 1" })).toBeInTheDocument();
  });

  it("takes its width and the gap out of the square's, and gives them back — without a remount", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    grbc.mockReturnValue(rect(1000, 600));
    renderShell([{ index: true, element: <WithPanel /> }]);
    const square = screen.getByTestId("layout-board-square-body");

    // min(1000 - 320 - 16 - 32 - 400 - 16, 600 - 32): the column and the gap before it come off the width too.
    await waitFor(() => expect(square).toHaveStyle({ width: "216px", height: "216px" }));

    fireEvent.click(screen.getByRole("button", { name: "bump 0" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.queryByTestId("layout-board-left-panel")).toBeNull();
    // min(1000 - 320 - 16 - 32, 568) = 568.
    await waitFor(() => expect(square).toHaveStyle({ width: "568px", height: "568px" }));
    expect(screen.getByRole("button", { name: "bump 1" })).toBeInTheDocument();
  });

  it("folds to a rail and opens again — the square takes the width back and gives it up, without a remount", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    grbc.mockReturnValue(rect(1200, 600));
    renderShell([{ index: true, element: <WithPanel /> }]);
    const square = screen.getByTestId("layout-board-square-body");
    const column = await screen.findByTestId("layout-board-left-panel");
    // min(1200 - 320 - 16 - 32 - 400 - 16, 568) = 416.
    await waitFor(() => expect(square).toHaveStyle({ width: "416px" }));

    fireEvent.click(screen.getByRole("button", { name: "fold" }));
    expect(column).toHaveStyle({ width: `${BOARD_LEFT_PANEL_COLLAPSED_PX}px` });
    // The rail's own 48 and the gap: min(1200 - 320 - 16 - 32 - 48 - 16, 568) = 568.
    await waitFor(() => expect(square).toHaveStyle({ width: "568px" }));
    // The shell stays away while the panel is folded: it is the same window.
    expect(screen.queryByTestId("layout-header")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "fold" }));
    expect(column).toHaveStyle({ width: `${BOARD_LEFT_PANEL_WIDTH_PX}px` });
    await waitFor(() => expect(square).toHaveStyle({ width: "416px" }));
  });

  it("counts the column in the room the area reaches across when the aside is hidden", async () => {
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    grbc.mockReturnValue(rect(1000, 600));
    renderShell([
      {
        index: true,
        element: (
          <>
            <WithPanel />
            <HideRightPanel />
          </>
        ),
      },
    ]);
    // The square 216, the gap, and the aside's room: 1000 - 32 - 400 - 16 - 216 - 16 = 320 (its minimum).
    await waitFor(() => expect(screen.getByTestId("layout-board-square-body")).toHaveStyle({ width: "552px", height: "216px" }));
  });

  it("mirrors with the app: its column's border is the side the square is on, never a physical one", async () => {
    await i18n.changeLanguage("he");
    renderShell([{ index: true, element: <WithPanel /> }]);
    const column = await screen.findByTestId("layout-board-left-panel");
    expect(column.className).toMatch(/muirtl-/);
    expect(column.closest("[dir='ltr']")).toBeNull();
  });

  describe("under the breakpoint", () => {
    const wideWindow = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = ((query: string) =>
        ({
          matches: /max-width/.test(query),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList) as typeof window.matchMedia;
    });
    afterEach(() => {
      window.matchMedia = wideWindow;
    });

    it("has no column — the panel is a drawer the screen opens, named, closed on Escape", async () => {
      const user = userEvent.setup();
      renderShell([{ index: true, element: <WithPanel /> }]);

      expect(screen.queryByTestId("layout-board-left-panel")).toBeNull();
      // The shell is whole: the header and its menu button stay.
      expect(screen.getByTestId("layout-header")).toBeInTheDocument();
      // Closed, nothing of it is in the page.
      expect(screen.queryByTestId("panel-content")).toBeNull();

      await user.click(screen.getByRole("button", { name: "open drawer" }));
      const sheet = await screen.findByRole("dialog", { name: "Folder analyses" });
      expect(within(sheet).getByTestId("panel-content")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Folder analyses" })).toBeNull());
    });

    it("reserves none of the square's width for it", async () => {
      const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
      grbc.mockReturnValue(rect(500, 900));
      renderShell([{ index: true, element: <WithPanel /> }]);
      // Stacked: the width less the inset, as without a panel.
      await waitFor(() => expect(screen.getByTestId("layout-board-square-body")).toHaveStyle({ width: "468px", height: "468px" }));
    });
  });
});

describe("the shell under its breakpoint (CTA-118)", () => {
  /*
    A window under the breakpoint: the `max-width` queries match, nothing else
    does (`prefers-reduced-motion`, `prefers-color-scheme` answer as they
    always do). Assigned and put back by hand rather than through `vi.spyOn`:
    `setup.ts` gives jsdom its `matchMedia` as a mock of its own, and
    restoring a spy over it leaves that one without an implementation.
  */
  const wideWindow = window.matchMedia;
  const stubCompactWindow = () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: /max-width/.test(query),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
  };

  const navButton = () => screen.getByRole("button", { name: i18n.t("shell.openNav") });

  afterEach(() => {
    window.matchMedia = wideWindow;
    vi.restoreAllMocks();
  });

  it("has no rail: the navigation is a drawer the header opens", async () => {
    stubCompactWindow();
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByTestId("layout-sidebar-container")).toBeNull();
    // Closed, nothing of it is in the page — not the tree, not the sheet.
    expect(screen.queryByTestId("layout-nav-drawer")).toBeNull();
    expect(screen.queryByRole("navigation", { name: i18n.t("nav.ariaLabel") })).toBeNull();

    await user.click(navButton());

    const sheet = await screen.findByRole("dialog", { name: i18n.t("nav.ariaLabel") });
    // The same tree the rail held, links and all.
    expect(within(sheet).getByRole("navigation", { name: i18n.t("nav.ariaLabel") })).toBeInTheDocument();
    expect(within(sheet).getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("closes the drawer on Escape and gives the focus back to its opener", async () => {
    stubCompactWindow();
    const user = userEvent.setup();
    renderShell();

    const opener = navButton();
    await user.click(opener);
    await screen.findByRole("dialog", { name: i18n.t("nav.ariaLabel") });
    expect(opener).not.toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(opener).toHaveFocus();
  });

  it("closes the drawer on a navigation", async () => {
    stubCompactWindow();
    const user = userEvent.setup();
    const { router } = renderShell();

    await user.click(navButton());
    await screen.findByRole("dialog", { name: i18n.t("nav.ariaLabel") });

    await act(() => router.navigate("/tools/analysis"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("stacks the panel under the square, and scrolls the column rather than the page", () => {
    stubCompactWindow();
    renderShell();

    const viewport = screen.getByTestId("layout-board-viewport");
    expect(viewport).toHaveStyle({ flexDirection: "column", overflowX: "hidden", overflowY: "auto" });
    // The panel is the box below, not a column beside: nothing caps its width.
    expect(screen.getByTestId("layout-board-square-sidebar")).toHaveStyle({ minHeight: "420px" });
  });

  it("gives the square the whole width, with none of it reserved for the panel", async () => {
    stubCompactWindow();
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    // A 320px window is what reflow is measured at; the shell's inset is 16px a side.
    grbc.mockReturnValue(rect(320, 600));

    renderShell();

    await waitFor(() =>
      expect(screen.getByTestId("layout-board-square-body")).toHaveStyle({ width: "288px", height: "288px" }),
    );
  });

  it("keeps the square usable in a short window, where the column scrolls to the panel", async () => {
    stubCompactWindow();
    const grbc = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    // 320 x 256 — the reflow viewport. The height would leave 224px; the floor holds.
    grbc.mockReturnValue(rect(320, 256));

    renderShell();

    await waitFor(() =>
      expect(screen.getByTestId("layout-board-square-body")).toHaveStyle({ width: "280px", height: "280px" }),
    );
  });

  it("names the home link by the brand even with the words out of sight", () => {
    stubCompactWindow();
    renderShell();
    expect(screen.getByRole("link", { name: i18n.t("app.brandText") })).toHaveAttribute("href", "/");
  });

  it("passes an accessibility audit, drawer open", async () => {
    stubCompactWindow();
    const user = userEvent.setup();
    renderShell();

    await user.click(navButton());
    await screen.findByRole("dialog", { name: i18n.t("nav.ariaLabel") });

    await expectNoAxeViolations(document.documentElement, { enable: PAGE_STRUCTURE_RULES });
  });

  it("still gives a full-width route the whole body, with the drawer to reach the rest by", () => {
    stubCompactWindow();
    renderShell(
      [
        { index: true, element: <div data-testid="screen" /> },
        { path: "wide", element: <div data-testid="wide-screen" />, handle: FULL_WIDTH_ROUTE },
      ],
      ["/wide"],
    );

    expect(screen.getByTestId("layout-full-body")).toContainElement(screen.getByTestId("wide-screen"));
    expect(screen.queryByTestId("layout-board-square-body")).toBeNull();
    // The shell's page structure (CTA-112) is untouched by the breakpoint.
    expect(screen.getByTestId("layout-skip-link")).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(navButton()).toBeInTheDocument();
  });

  it("gives an article the body's whole width under the breakpoint, its column still the page", () => {
    stubCompactWindow();
    renderShell(
      [
        { index: true, element: <div data-testid="screen" /> },
        { path: "article", element: <p data-testid="article-screen">Prose</p>, handle: ARTICLE_ROUTE },
      ],
      ["/article"],
    );

    // A maximum, not a width: under it the column is the whole body (the reflow gate).
    expect(screen.getByTestId("layout-article-column")).toHaveStyle({ width: "100%", maxWidth: `${ARTICLE_MAX_WIDTH_PX}px` });
    expect(screen.getByTestId("layout-article-column")).toContainElement(screen.getByTestId("article-screen"));
    expect(screen.queryByTestId("layout-board-square-sidebar")).toBeNull();
    expect(navButton()).toBeInTheDocument();
  });

  it("is the desktop shell again above the breakpoint", () => {
    renderShell();
    expect(screen.getByTestId("layout-sidebar-container")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: i18n.t("shell.openNav") })).toBeNull();
    expect(screen.getByTestId("layout-board-viewport")).toHaveStyle({ flexDirection: "row" });
  });
});
