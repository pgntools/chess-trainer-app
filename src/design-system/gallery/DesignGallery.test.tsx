import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { SECTIONS } from "../components/sections";
import DesignGallery from "./DesignGallery";

/** Where the router is — the gallery's links and redirects are asserted by it. */
function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

/** The gallery on its route, the way `views/dev/design/Main.tsx` mounts it. */
function GalleryRoute(props: { initialThemeId?: string; initialMode?: "light" | "dark" }) {
  return (
    <Routes>
      <Route
        path="/dev/design/:section?"
        element={<SectionPage {...props} />}
      />
    </Routes>
  );
}

function SectionPage(props: { initialThemeId?: string; initialMode?: "light" | "dark" }) {
  const section = useLocation().pathname.split("/")[3];
  return <DesignGallery section={section} sectionPath={(id) => `/dev/design/${id}`} {...props} />;
}

const renderGallery = (entry = "/dev/design", props = {}) =>
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

describe("the design gallery", () => {
  it("lands /dev/design on the first section's page", () => {
    renderGallery("/dev/design");
    expect(where()).toBe(`/dev/design/${SECTIONS[0].id}`);
    expect(preview()).toHaveAttribute("data-section", SECTIONS[0].id);
  });

  it("lands an unknown section on the first", () => {
    renderGallery("/dev/design/no-such-section");
    expect(where()).toBe(`/dev/design/${SECTIONS[0].id}`);
  });

  it.each(SECTIONS.map((section) => [section.id, section.title]))(
    "gives %s a page of its own, showing that section alone",
    (id, title) => {
      renderGallery(`/dev/design/${id}`);
      expect(preview()).toHaveAttribute("data-section", id);
      expect(within(preview()).getAllByTestId(`design-gallery-demo-${id}`).length).toBeGreaterThan(0);
      for (const other of SECTIONS.filter((section) => section.id !== id)) {
        expect(within(preview()).queryByTestId(`design-gallery-demo-${other.id}`)).toBeNull();
      }
      expect(screen.getByTestId("design-gallery-title")).toHaveTextContent(title);
    },
  );

  it("links every section's page from a menu down the left, the one on screen current", () => {
    renderGallery("/dev/design/tables");
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      SECTIONS.map((section) => `/dev/design/${section.id}`),
    );
    expect(screen.getByTestId("design-gallery-nav-tables")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("design-gallery-nav-dialogs")).not.toHaveAttribute("aria-current");
  });

  it("goes to a section's page from the menu, keeping the switches as they were", () => {
    renderGallery("/dev/design/dialogs");
    fireEvent.click(screen.getByTestId("design-gallery-mode-dark"));
    fireEvent.click(screen.getByTestId("design-gallery-direction-rtl"));

    fireEvent.click(screen.getByTestId("design-gallery-nav-forms"));
    expect(where()).toBe("/dev/design/forms");
    expect(preview()).toHaveAttribute("data-section", "forms");
    expect(preview()).toHaveAttribute("data-mode", "dark");
    expect(preview()).toHaveAttribute("dir", "rtl");
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
