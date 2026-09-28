import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { SECTIONS } from "../components/sections";
import DesignGallery from "./DesignGallery";

const renderGallery = () =>
  render(
    <AppThemeWithLang>
      <DesignGallery />
    </AppThemeWithLang>,
  );

describe("the design gallery", () => {
  it("shows every section's demos", () => {
    renderGallery();
    for (const { id } of SECTIONS) {
      const section = screen.getByTestId(`design-gallery-section-${id}`);
      expect(within(section).getAllByTestId(`design-gallery-demo-${id}`).length).toBeGreaterThan(0);
    }
  });

  it("lists every section in a menu down the left, the first marked current", () => {
    renderGallery();
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const links = within(nav).getAllByRole("button");
    expect(links.map((link) => link.textContent?.replace(/\d+$/, ""))).toEqual(
      SECTIONS.map((section) => section.title),
    );
    expect(screen.getByTestId(`design-gallery-nav-${SECTIONS[0].id}`)).toHaveAttribute("aria-current", "true");
  });

  it("scrolls the preview to a section picked in the menu, and marks it current", () => {
    const scrolled: string[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.getAttribute("data-testid") ?? "");
    };
    try {
      renderGallery();
      fireEvent.click(screen.getByTestId("design-gallery-nav-tables"));
      expect(scrolled).toEqual(["design-gallery-section-tables"]);
      expect(screen.getByTestId("design-gallery-nav-tables")).toHaveAttribute("aria-current", "true");
      expect(screen.getByTestId("design-gallery-nav-dialogs")).not.toHaveAttribute("aria-current");
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("opens on the default theme, light, left to right", () => {
    renderGallery();
    const preview = screen.getByTestId("design-gallery-preview");
    expect(preview).toHaveAttribute("data-theme", "default");
    expect(preview).toHaveAttribute("data-mode", "light");
    expect(preview).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("design-gallery-theme")).toHaveValue("default");
  });

  it("switches the preview's scheme and direction, and leaves the page's alone", () => {
    renderGallery();
    const preview = screen.getByTestId("design-gallery-preview");
    const lightBackground = getComputedStyle(preview).backgroundColor;

    fireEvent.click(screen.getByTestId("design-gallery-mode-dark"));
    expect(preview).toHaveAttribute("data-mode", "dark");
    expect(getComputedStyle(preview).backgroundColor).not.toBe(lightBackground);

    fireEvent.click(screen.getByTestId("design-gallery-direction-rtl"));
    expect(preview).toHaveAttribute("dir", "rtl");
    expect(document.documentElement.dir).toBe("ltr");

    fireEvent.click(screen.getByTestId("design-gallery-mode-light"));
    fireEvent.click(screen.getByTestId("design-gallery-direction-ltr"));
    expect(preview).toHaveAttribute("data-mode", "light");
    expect(preview).toHaveAttribute("dir", "ltr");
  });

  it("falls back to the default theme for an unknown one", () => {
    render(
      <AppThemeWithLang>
        <DesignGallery initialThemeId="no-such-theme" initialMode="dark" />
      </AppThemeWithLang>,
    );
    const preview = screen.getByTestId("design-gallery-preview");
    expect(preview).toHaveAttribute("data-theme", "default");
    expect(preview).toHaveAttribute("data-mode", "dark");
  });
});
