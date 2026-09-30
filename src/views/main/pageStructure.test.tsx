import { useEffect, useState } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import i18n from "../../i18n";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { expectNoAxeViolations, PAGE_STRUCTURE_RULES } from "../../test/axe";
import { DefaultLayout } from "./Layout";
import { useOwnPageHeading, usePageTitle } from "./pageTitle";
import { FULL_WIDTH_ROUTE } from "./routeHandle";

/*
  The page a screen reader walks (CTA-112): the title, the landmarks, the skip
  link, the one `h1` and where the focus goes on a move to another screen —
  the shell's, over throwaway screens that use the two hooks as the real ones
  do. `routes.test.tsx` holds every real route to a title.
*/

/** A screen with nothing of its own to say — the shell's hidden `h1` is its heading. */
const Plain = () => <button type="button">Plain action</button>;

/** A screen with a record open — a Settings tab, a collection. */
const WithRecord = ({ name }: { name: string }) => {
  usePageTitle(name);
  return <button type="button">Record action</button>;
};

/** A screen whose design has a visible title: it renders the `h1`. */
const OwnHeading = () => {
  useOwnPageHeading();
  return <h1>The lobby's own title</h1>;
};

/** A screen that reads its record first: no heading of its own until it lands. */
const Late = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 30);
    return () => clearTimeout(timer);
  }, []);
  return ready ? <Collection /> : <p>Reading…</p>;
};
const Collection = () => {
  useOwnPageHeading();
  usePageTitle("Carlsen games");
  return <h1>Carlsen games</h1>;
};

/** A full-width screen — the design gallery's kind. */
const Wide = () => <p>The gallery</p>;

const routes: RouteObject[] = [
  { index: true, element: <Plain />, handle: { title: "pages.home" } },
  { path: "/engine/games", element: <OwnHeading />, handle: { title: "pages.lobby" } },
  { path: "/settings/export", element: <WithRecord name="Export" />, handle: { title: "pages.settings" } },
  { path: "/settings/import", element: <WithRecord name="Import" />, handle: { title: "pages.settings" } },
  { path: "/library/c", element: <Late />, handle: { title: "pages.collection" } },
  { path: "/dev/design", element: <Wide />, handle: { ...FULL_WIDTH_ROUTE, title: "pages.designSystem" } },
];

const renderShell = (initialEntries: string[] = ["/"]) => {
  const router = createMemoryRouter([{ path: "/", element: <DefaultLayout />, children: routes }], { initialEntries });
  render(
    <AppThemeWithLang>
      <RouterProvider router={router} />
    </AppThemeWithLang>,
  );
  return router;
};

/** Lets the shell's after-a-tick focus move land. */
const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 5)));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the page title (CTA-112)", () => {
  it("names the page by its screen, then the app", () => {
    renderShell(["/engine/games"]);
    expect(document.title).toBe("Lobby — Chess Trainer App");
  });

  it("puts the open record's name first", async () => {
    renderShell(["/settings/export"]);
    await waitFor(() => expect(document.title).toBe("Export — Settings — Chess Trainer App"));
  });

  it("follows the record and the screen as the reader moves", async () => {
    const router = renderShell(["/settings/export"]);
    await act(() => router.navigate("/settings/import"));
    expect(document.title).toBe("Import — Settings — Chess Trainer App");
    await act(() => router.navigate("/"));
    expect(document.title).toBe("Home — Chess Trainer App");
  });

  it("is in the reader's language", async () => {
    await i18n.changeLanguage("he");
    renderShell(["/settings/export"]);
    await waitFor(() => expect(document.title).toBe("Export — הגדרות — אפליקציית אימון שחמט"));
  });
});

describe("landmarks and the skip link (CTA-112)", () => {
  it("has a banner, the named navigation, one main named by the page, the named panel and the footer", async () => {
    renderShell(["/settings/export"]);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: i18n.t("nav.ariaLabel") })).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole("main", { name: "Export — Settings" })).toBeInTheDocument());
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    // The screen is inside `main`, the panel beside it.
    expect(within(screen.getByRole("main")).getByRole("button", { name: "Record action" })).toBeInTheDocument();
  });

  it("gives a full-width screen the one main, and no panel", () => {
    renderShell(["/dev/design"]);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("main", { name: "Design system" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("puts the skip link first in the tab order; it takes the focus to main", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.tab();
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("main")).toHaveFocus();
    // Tab goes on into the screen, not back to the header.
    await user.tab();
    expect(screen.getByRole("button", { name: "Plain action" })).toHaveFocus();
  });

  it("names the skip link and the panel in Hebrew", async () => {
    await i18n.changeLanguage("he");
    renderShell();
    expect(screen.getByRole("link", { name: "דילוג לתוכן הראשי" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "לוח צד" })).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "דף הבית" })).toBeInTheDocument();
  });

  it("passes axe's page-structure rules — board layout and full width", async () => {
    renderShell();
    await expectNoAxeViolations(document.documentElement, { enable: PAGE_STRUCTURE_RULES });
  });

  it("passes them on a full-width screen too", async () => {
    renderShell(["/dev/design"]);
    await expectNoAxeViolations(document.documentElement, { enable: PAGE_STRUCTURE_RULES });
  });
});

describe("the page's one h1 (CTA-112)", () => {
  it("is the shell's, out of sight, where the screen has no title of its own", () => {
    renderShell();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Home");
    expect(headings[0]).toHaveStyle({ position: "absolute" });
  });

  it("is the screen's own where it renders one — the shell's steps aside", () => {
    renderShell(["/engine/games"]);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("The lobby's own title");
  });

  it("carries the record's name", async () => {
    renderShell(["/settings/export"]);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Export — Settings"));
  });
});

describe("moving to another screen (CTA-112)", () => {
  it("leaves the focus alone on the first load", async () => {
    renderShell();
    await tick();
    expect(document.body).toHaveFocus();
  });

  it("takes the focus to the new screen's heading, which a screen reader then reads", async () => {
    const router = renderShell();
    await act(() => router.navigate("/settings/export"));
    await tick();
    const heading = screen.getByRole("heading", { level: 1, name: "Export — Settings" });
    expect(heading).toHaveFocus();
    await act(() => router.navigate("/engine/games"));
    await tick();
    const own = screen.getByRole("heading", { level: 1, name: "The lobby's own title" });
    expect(own).toHaveFocus();
    // Focusable by script only: the tab order is as it was.
    expect(own).toHaveAttribute("tabindex", "-1");
  });

  it("leaves the focus where it was within a screen — another tab, a query string", async () => {
    const router = renderShell(["/settings/export"]);
    const button = screen.getByRole("button", { name: "Record action" });
    button.focus();
    await act(() => router.navigate("/settings/import"));
    await tick();
    expect(screen.getByRole("button", { name: "Record action" })).toHaveFocus();
    await act(() => router.navigate("/settings/import?page=2"));
    await tick();
    expect(screen.getByRole("button", { name: "Record action" })).toHaveFocus();
  });

  it("hands the focus on to a heading that arrives with its record", async () => {
    const router = renderShell();
    await act(() => router.navigate("/library/c"));
    await tick();
    expect(screen.getByRole("heading", { level: 1, name: "Collection" })).toHaveFocus();
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "Carlsen games" })).toHaveFocus());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
