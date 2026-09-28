import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../i18n";
import { useChessTokens } from "../../design-system/theme";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { THEME_STORAGE_KEY } from "../../theme/themeChoice";
import SettingsScreen from "./SettingsScreen";

/*
  Settings → Appearance (CTA-107). The registry ships one theme, so a second
  is registered here — a board of its own — to prove a choice applies at
  once, survives a reload and falls back when it names nothing.
*/

vi.mock("../../design-system/themes/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../design-system/themes/registry")>();
  const { defaultTheme } = await import("../../design-system/themes/default");
  const slate = {
    ...defaultTheme,
    id: "slate",
    // A catalog key the registry test does not see — the mock is this file's.
    labelKey: "appearance.themes.default",
    chess: { ...defaultTheme.chess, board: { ...defaultTheme.chess.board, lightSquare: "#dee3e6" } },
  };
  const themes = [defaultTheme, slate];
  return {
    ...actual,
    themes,
    isThemeId: (id: unknown) => typeof id === "string" && themes.some((theme) => theme.id === id),
    themeById: (id: string | null | undefined) => themes.find((theme) => theme.id === id) ?? defaultTheme,
  };
});

/** What a board would draw its light squares in, under the theme in context. */
function BoardProbe() {
  return <span data-testid="light-square">{useChessTokens().board.lightSquare}</span>;
}

const renderAppearance = () =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/settings/appearance"]}>
        <Routes>
          <Route path="/settings/:tab" element={<SettingsScreen />} />
        </Routes>
      </MemoryRouter>
      <BoardProbe />
    </AppThemeWithLang>,
  );

const radio = (id: string) => screen.getByTestId(`appearance-theme-${id}-radio`);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("Settings → Appearance", () => {
  it("is a tab of Settings, listing every registered theme with a preview", () => {
    renderAppearance();
    expect(screen.getByTestId("settings-tab-appearance")).toHaveAttribute("href", "/settings/appearance");
    expect(screen.getByTestId("appearance-tab")).toBeInTheDocument();
    for (const id of ["default", "slate"]) {
      expect(screen.getByTestId(`appearance-theme-${id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`appearance-theme-${id}-preview`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("appearance-theme-default")).toHaveTextContent("Default");
  });

  it("starts on the default theme", () => {
    renderAppearance();
    expect(radio("default")).toBeChecked();
    expect(screen.getByTestId("light-square")).toHaveTextContent("#F0D9B5");
  });

  it("applies a choice at once, board and all, and keeps it", () => {
    renderAppearance();
    fireEvent.click(radio("slate"));
    expect(radio("slate")).toBeChecked();
    expect(screen.getByTestId("light-square")).toHaveTextContent("#dee3e6");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("slate");
  });

  it("survives a reload", () => {
    const first = renderAppearance();
    fireEvent.click(radio("slate"));
    first.unmount();

    renderAppearance();
    expect(radio("slate")).toBeChecked();
    expect(screen.getByTestId("light-square")).toHaveTextContent("#dee3e6");
  });

  it("falls back to the default for a stored id that names no theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "retired-theme");
    renderAppearance();
    expect(radio("default")).toBeChecked();
    expect(screen.getByTestId("light-square")).toHaveTextContent("#F0D9B5");
  });

  it("reads under Hebrew too", async () => {
    await i18n.changeLanguage("he");
    renderAppearance();
    expect(screen.getByTestId("appearance-theme-default")).toHaveTextContent("ברירת מחדל");
  });
});
