import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

import i18n from "../../i18n";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import { DEVELOPER_MODE_STORAGE_KEY } from "../../theme/developerMode";
import SettingsScreen from "./SettingsScreen";

const renderSystem = () =>
  render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={["/settings/system"]}>
        <Routes>
          <Route path="/settings/:tab" element={<SettingsScreen />} />
        </Routes>
      </MemoryRouter>
    </AppThemeWithLang>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
  localStorage.removeItem(DEVELOPER_MODE_STORAGE_KEY);
});

describe("Settings → System", () => {
  it("is a tab of Settings, listing the Developer mode switch", () => {
    renderSystem();
    expect(screen.getByTestId("settings-tab-system")).toHaveAttribute("href", "/settings/system");
    expect(screen.getByTestId("system-tab")).toBeInTheDocument();
    // The SwitchField's label is a Typography, not on the switch itself
    expect(screen.getByTestId("developer-mode-switch")).toBeInTheDocument();
    expect(screen.getByTestId("developer-mode-switch-help")).toHaveTextContent(
      "Show the Development section in the sidebar (Design system gallery, Theme editor). The dev routes remain unavailable in production builds."
    );
  });

  it("starts with developer mode disabled", () => {
    renderSystem();
    expect(screen.getByTestId("developer-mode-switch")).not.toBeChecked();
  });

  it("enables developer mode and stores the preference", () => {
    renderSystem();
    fireEvent.click(screen.getByTestId("developer-mode-switch"));
    expect(screen.getByTestId("developer-mode-switch")).toBeChecked();
    expect(localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY)).toBe("true");
  });

  it("disables developer mode and stores the preference", () => {
    localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, "true");
    renderSystem();
    expect(screen.getByTestId("developer-mode-switch")).toBeChecked();
    fireEvent.click(screen.getByTestId("developer-mode-switch"));
    expect(screen.getByTestId("developer-mode-switch")).not.toBeChecked();
    expect(localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY)).toBe("false");
  });

  it("survives a reload", () => {
    localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, "true");
    const first = renderSystem();
    expect(screen.getByTestId("developer-mode-switch")).toBeChecked();
    first.unmount();

    renderSystem();
    expect(screen.getByTestId("developer-mode-switch")).toBeChecked();
  });

  it("reads under Hebrew too", async () => {
    await i18n.changeLanguage("he");
    renderSystem();
    // The label is in the Typography, check the label text
    expect(screen.getByTestId("system-tab")).toHaveTextContent("מצב מפתח");
  });
});