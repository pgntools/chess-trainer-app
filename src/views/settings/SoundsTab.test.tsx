import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../i18n";
import { readSoundSettings, resetSoundSettings, SOUND_SETTINGS_STORAGE_KEY, storeSoundSettings } from "../../lib/soundSettings";
import { expectNoAxeViolations } from "../../test/axe";
import AppThemeWithLang from "../../theme/AppThemeWithLang";
import SoundsTab from "./SoundsTab";

vi.mock("../../lib/moveSoundPlayer", () => ({ playMoveSound: vi.fn(), preloadMoveSounds: vi.fn() }));
const { playMoveSound } = await import("../../lib/moveSoundPlayer");

const mount = () =>
  render(
    <AppThemeWithLang>
      <SoundsTab />
    </AppThemeWithLang>,
  );

const stored = () => JSON.parse(localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY) ?? "null") as unknown;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.mocked(playMoveSound).mockClear();
});

/* Settings → Sounds (CTA-260): the move sounds' switch, volume and stepping switch. */
describe("Settings → Sounds", () => {
  it("shows the defaults — sounds on, 70%, stepping on — each control named", () => {
    mount();
    expect(screen.getByRole("switch", { name: "Move sounds" })).toBeChecked();
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveValue("70");
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuetext", "70%");
    expect(screen.getByRole("switch", { name: "Sounds while stepping through moves" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Play a sample" })).toBeEnabled();
  });

  it("keeps a change at once — the master switch off disables the rest", async () => {
    mount();
    await userEvent.click(screen.getByRole("switch", { name: "Move sounds" }));
    expect(stored()).toEqual({ enabled: false, volume: 70, stepping: true });
    expect(screen.getByRole("slider", { name: "Volume" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Sounds while stepping through moves" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Play a sample" })).toBeDisabled();
  });

  it("turns stepping off alone, from the keyboard", async () => {
    mount();
    screen.getByRole("switch", { name: "Sounds while stepping through moves" }).focus();
    await userEvent.keyboard(" ");
    expect(stored()).toEqual({ enabled: true, volume: 70, stepping: false });
  });

  it("sets the volume from the slider, and plays a sample at it", async () => {
    mount();
    const slider = screen.getByRole("slider", { name: "Volume" });
    fireEvent.change(slider, { target: { value: 30 } });
    expect(readSoundSettings().volume).toBe(30);
    expect(screen.getByTestId("sounds-volume-value")).toHaveTextContent("30%");
    await userEvent.click(screen.getByRole("button", { name: "Play a sample" }));
    expect(playMoveSound).toHaveBeenCalledWith("move", 0.3);
  });

  it("shows what is stored, and follows a change made elsewhere", async () => {
    storeSoundSettings({ volume: 55, stepping: false });
    resetSoundSettings();
    mount();
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveValue("55");
    expect(screen.getByRole("switch", { name: "Sounds while stepping through moves" })).not.toBeChecked();
  });

  it("speaks Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount();
    expect(screen.getByRole("switch", { name: "צלילי מסעים" })).toBeChecked();
    expect(screen.getByRole("slider", { name: "עוצמה" })).toBeInTheDocument();
  });

  it("passes axe", async () => {
    const { container } = mount();
    await expectNoAxeViolations(container);
  });
});
