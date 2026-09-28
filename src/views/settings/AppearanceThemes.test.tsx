import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../i18n";
import { useChessTokens } from "../../design-system/theme";
import { brownTheme, defaultTheme, greenTheme, highContrastTheme } from "../../design-system/themes";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { THEME_STORAGE_KEY } from "../../theme/themeChoice";
import SettingsScreen from "./SettingsScreen";

/*
  Settings → Appearance over the real registry (CTA-108): the three themes
  CTA-108 adds are listed with their previews, switch at once — the board with
  them — and survive a reload. `AppearanceTab.test.tsx` covers the choice's
  mechanics over a mocked registry.
*/

/** What a board draws under the theme in context. */
function BoardProbe() {
  const tokens = useChessTokens();
  return (
    <>
      <span data-testid="dark-square">{tokens.board.darkSquare}</span>
      <span data-testid="mainline-arrow">{tokens.arrowPalettes.classic.mainline}</span>
    </>
  );
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

describe("Settings → Appearance, with the shipped themes", () => {
  it("lists all four, each named and previewed", () => {
    renderAppearance();
    const names: Record<string, string> = { default: "Default", brown: "Brown", green: "Green", "high-contrast": "High contrast" };
    for (const [id, name] of Object.entries(names)) {
      expect(screen.getByTestId(`appearance-theme-${id}`)).toHaveTextContent(name);
      expect(screen.getByTestId(`appearance-theme-${id}-preview`)).toBeInTheDocument();
    }
  });

  it.each([brownTheme, greenTheme, highContrastTheme].map((theme) => [theme.id, theme]))(
    "switches to %s at once — the board with it — and keeps it over a reload",
    (id, theme) => {
      const { unmount } = renderAppearance();
      expect(screen.getByTestId("mainline-arrow")).toHaveTextContent(defaultTheme.chess.arrowPalettes.classic.mainline);

      fireEvent.click(radio(id));
      expect(radio(id)).toBeChecked();
      expect(screen.getByTestId("dark-square")).toHaveTextContent(theme.chess.board.darkSquare);
      expect(screen.getByTestId("mainline-arrow")).toHaveTextContent(theme.chess.arrowPalettes.classic.mainline);
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(id);

      unmount();
      renderAppearance();
      expect(radio(id)).toBeChecked();
      expect(screen.getByTestId("mainline-arrow")).toHaveTextContent(theme.chess.arrowPalettes.classic.mainline);
    },
  );

  it("names them in Hebrew too", async () => {
    await i18n.changeLanguage("he");
    renderAppearance();
    expect(screen.getByTestId("appearance-theme-high-contrast")).toHaveTextContent("ניגודיות גבוהה");
    await i18n.changeLanguage("en");
  });
});
