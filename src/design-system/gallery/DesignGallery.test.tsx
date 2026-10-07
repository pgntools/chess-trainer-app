import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { SECTIONS } from "../components/sections";
import DesignGallery from "./DesignGallery";
import { discoverGallery, discoverPatterns } from "./discover";
import type { GalleryTier } from "./types";

/** Where the router is — the gallery's links and redirects are asserted by it. */
function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

type Props = { initialThemeId?: string; initialMode?: "light" | "dark"; tiers?: GalleryTier[] };

/** The gallery on its splat route, the way `views/dev/design/Main.tsx` mounts it. */
function GalleryRoute(props: Props) {
  return (
    <Routes>
      <Route path="/dev/design/*" element={<Page {...props} />} />
    </Routes>
  );
}

function Page(props: Props) {
  const page = useLocation().pathname.slice("/dev/design/".length);
  return (
    <DesignGallery
      section={page === "" ? undefined : page}
      sectionPath={(key) => `/dev/design/${key}`}
      startPath="/dev/design"
      {...props}
    />
  );
}

const renderGallery = (entry = "/dev/design", props: Props = {}) =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <GalleryRoute {...props} />
        <Where />
      </MemoryRouter>
    </AppThemeWithLang>,
  );

const where = () => screen.getByTestId("where").textContent;
const preview = () => screen.getByTestId("design-gallery-preview");

const base = discoverGallery();
const patterns = discoverPatterns();
const firstOf = (sectionId: string) => base.find((section) => section.id === sectionId)?.modules[0].id;

/** A made-up outside tier, as the dev route hands in Blocks. */
const BLOCKS: GalleryTier = {
  id: "blocks",
  title: "Blocks",
  sections: [
    {
      id: "trees",
      title: "Trees",
      modules: [{ id: "Probe", section: "trees", title: "Probe block", demos: [{ name: "Only", render: () => <p>probe</p> }] }],
    },
  ],
};

describe("the design gallery", () => {
  it("lands /dev/design on the first component of the first section", () => {
    renderGallery("/dev/design");
    expect(where()).toBe(`/dev/design/${SECTIONS[0].id}/${firstOf(SECTIONS[0].id)}`);
    expect(preview()).toHaveAttribute("data-section", SECTIONS[0].id);
  });

  it("lands an unknown page on the first", () => {
    renderGallery("/dev/design/no-such-section/Nope");
    expect(where()).toBe(`/dev/design/${SECTIONS[0].id}/${firstOf(SECTIONS[0].id)}`);
  });

  it.each(SECTIONS.map((section) => section.id))("keeps the CTA-107 link /dev/design/%s working — its first component", (id) => {
    renderGallery(`/dev/design/${id}`);
    expect(where()).toBe(`/dev/design/${id}/${firstOf(id)}`);
    expect(preview()).toHaveAttribute("data-section", id);
  });

  it("gives every component a page of its own, showing that component alone", () => {
    const tables = base.find((section) => section.id === "tables");
    const frame = tables?.modules.find((entry) => entry.id === "TableFrame");
    renderGallery("/dev/design/tables/TableFrame");
    expect(preview()).toHaveAttribute("data-component", "TableFrame");
    expect(screen.getByTestId("design-gallery-breadcrumbs-base")).toHaveTextContent("Base");
    expect(screen.getByTestId("design-gallery-breadcrumbs-tables")).toHaveTextContent("Tables");
    expect(screen.getByTestId("design-gallery-breadcrumbs-current")).toHaveTextContent("TableFrame");
    expect(screen.getByTestId("design-gallery-breadcrumbs-current")).toHaveAttribute("aria-current", "page");
    expect(within(preview()).getAllByTestId("design-gallery-demo-tables")).toHaveLength(frame?.demos.length ?? -1);
  });

  it("shows a pattern's page under the Patterns tier", () => {
    renderGallery("/dev/design/patterns/tables/DataTable");
    expect(preview()).toHaveAttribute("data-tier", "patterns");
    expect(preview()).toHaveAttribute("data-section", "patterns/tables");
    expect(screen.getByTestId("design-gallery-breadcrumbs-patterns")).toHaveTextContent("Patterns");
    expect(screen.getByTestId("design-gallery-breadcrumbs-patterns-tables")).toHaveTextContent("Tables");
    expect(within(preview()).getAllByTestId("design-gallery-demo-patterns-tables").length).toBeGreaterThan(0);
  });

  describe("the breadcrumbs trail — the page's title", () => {
    it("links the tier crumb to the gallery's start, and the section crumb to the section's landing", () => {
      renderGallery("/dev/design/tables/TableFrame");
      expect(screen.getByTestId("design-gallery-breadcrumbs-base")).toHaveAttribute("href", "/dev/design");
      expect(screen.getByTestId("design-gallery-breadcrumbs-tables")).toHaveAttribute("href", "/dev/design/tables");
    });

    it("goes where the crumbs point: up to the section's first component, and to the gallery's start", () => {
      renderGallery("/dev/design/dialogs/ConfirmDialog");
      fireEvent.click(screen.getByTestId("design-gallery-breadcrumbs-dialogs"));
      expect(where()).toBe(`/dev/design/dialogs/${firstOf("dialogs")}`);
      fireEvent.click(screen.getByTestId("design-gallery-breadcrumbs-base"));
      expect(where()).toBe(`/dev/design/${SECTIONS[0].id}/${firstOf(SECTIONS[0].id)}`);
    });
  });

  it("shows the tiers handed in after its own, and hides a tier with nothing in it", () => {
    renderGallery("/dev/design/blocks/trees/Probe", { tiers: [BLOCKS, { id: "empty", title: "Empty", sections: [] }] });
    expect(preview()).toHaveAttribute("data-tier", "blocks");
    expect(within(preview()).getByText("probe")).toBeInTheDocument();
    const tiers = [...screen.getByTestId("design-gallery-nav").children].map(
      (item) => item.querySelector("[data-testid^='design-gallery-nav-']")?.getAttribute("data-testid"),
    );
    expect(tiers).toEqual(["design-gallery-nav-base", "design-gallery-nav-patterns", "design-gallery-nav-blocks"]);
    expect(screen.queryByTestId("design-gallery-nav-empty")).toBeNull();
  });

  describe("the menu — a collapsible tree", () => {
    it("opens the chain to the page on screen, and only that chain", () => {
      renderGallery("/dev/design/patterns/tables/DataTable");
      expect(screen.getByTestId("design-gallery-nav-patterns")).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByTestId("design-gallery-nav-patterns-tables")).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByTestId("design-gallery-nav-patterns-tables-DataTable")).toHaveAttribute("aria-current", "page");
      expect(screen.getByTestId("design-gallery-nav-base")).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("design-gallery-nav-tables")).toBeNull();
    });

    it("lists a tier's sections with their component counts, and a section's components as links", () => {
      renderGallery("/dev/design/tables/TableFrame");
      const tables = base.find((section) => section.id === "tables");
      expect(screen.getByTestId("design-gallery-nav-tables")).toHaveTextContent(`Tables${tables?.modules.length}`);
      const links = within(screen.getByTestId("design-gallery-nav-tables-group")).getAllByRole("treeitem");
      expect(links.map((link) => link.getAttribute("href"))).toEqual(tables?.modules.map((entry) => `/dev/design/tables/${entry.id}`));
    });

    it("opens and closes a folder in place, leaving the page as it was", () => {
      renderGallery("/dev/design/tables/TableFrame");
      fireEvent.click(screen.getByTestId("design-gallery-nav-patterns"));
      expect(screen.getByTestId("design-gallery-nav-patterns")).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(screen.getByTestId("design-gallery-nav-patterns-trees"));
      expect(screen.getByTestId("design-gallery-nav-patterns-trees-TreeView")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("design-gallery-nav-tables"));
      expect(screen.getByTestId("design-gallery-nav-tables")).toHaveAttribute("aria-expanded", "false");
      expect(where()).toBe("/dev/design/tables/TableFrame");
    });

    it("goes to a component's page from the menu, keeping what is open and the switches as they were", () => {
      renderGallery("/dev/design/dialogs/ConfirmDialog");
      fireEvent.click(screen.getByTestId("design-gallery-mode-dark"));
      fireEvent.click(screen.getByTestId("design-gallery-direction-rtl"));
      fireEvent.click(screen.getByTestId("design-gallery-nav-patterns"));
      fireEvent.click(screen.getByTestId("design-gallery-nav-patterns-trees"));

      fireEvent.click(screen.getByTestId("design-gallery-nav-patterns-trees-TreeView"));
      expect(where()).toBe("/dev/design/patterns/trees/TreeView");
      expect(preview()).toHaveAttribute("data-component", "TreeView");
      expect(preview()).toHaveAttribute("data-mode", "dark");
      expect(preview()).toHaveAttribute("dir", "rtl");
      expect(screen.getByTestId("design-gallery-nav-dialogs")).toHaveAttribute("aria-expanded", "true");
    });

    it("counts every pattern section's components", () => {
      renderGallery("/dev/design/patterns/tables/DataTable");
      for (const section of patterns) {
        expect(screen.getByTestId(`design-gallery-nav-patterns-${section.id}`)).toHaveTextContent(String(section.modules.length));
      }
    });
  });

  it("opens on the default theme, light, left to right", () => {
    renderGallery();
    expect(preview()).toHaveAttribute("data-theme", "default");
    expect(preview()).toHaveAttribute("data-mode", "light");
    expect(preview()).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("design-gallery-theme")).toHaveValue("default");
  });

  it("switches the preview's scheme and direction, and leaves the page's alone", () => {
    renderGallery();
    const lightBackground = getComputedStyle(preview()).backgroundColor;

    fireEvent.click(screen.getByTestId("design-gallery-mode-dark"));
    expect(preview()).toHaveAttribute("data-mode", "dark");
    expect(getComputedStyle(preview()).backgroundColor).not.toBe(lightBackground);

    fireEvent.click(screen.getByTestId("design-gallery-direction-rtl"));
    expect(preview()).toHaveAttribute("dir", "rtl");
    expect(document.documentElement.dir).toBe("ltr");

    fireEvent.click(screen.getByTestId("design-gallery-mode-light"));
    fireEvent.click(screen.getByTestId("design-gallery-direction-ltr"));
    expect(preview()).toHaveAttribute("data-mode", "light");
    expect(preview()).toHaveAttribute("dir", "ltr");
  });

  it("falls back to the default theme for an unknown one", () => {
    renderGallery("/dev/design", { initialThemeId: "no-such-theme", initialMode: "dark" });
    expect(preview()).toHaveAttribute("data-theme", "default");
    expect(preview()).toHaveAttribute("data-mode", "dark");
  });
});
