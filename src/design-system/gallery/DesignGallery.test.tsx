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
