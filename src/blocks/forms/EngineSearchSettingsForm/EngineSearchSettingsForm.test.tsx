import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { EngineSearchSettings } from "../../../lib/engineSearchSettings";
import { expectNoAxeViolations } from "../../../test/axe";
import EngineSearchSettingsForm from "./EngineSearchSettingsForm";
import {
  HOSTED_ASKED,
  HOSTED_ENGINE,
  HOSTED_LIMITS,
  LITE,
  MULTI_THREAD_LIMITS,
  PLAIN_HOST_ENGINES,
  PRESETS,
  SERVER_ENGINES,
  SETTINGS,
  SINGLE_THREAD_LIMITS,
} from "./fixtures";

const mount = (
  settings: EngineSearchSettings = SETTINGS,
  limits: { threads: number; hashMb: number } = MULTI_THREAD_LIMITS,
  { engines = PLAIN_HOST_ENGINES, engineId = LITE.id, presetId = "default" } = {},
) => {
  const onChange = vi.fn();
  const onEngineChange = vi.fn();
  const onPresetChange = vi.fn();
  render(
    <EngineSearchSettingsForm
      settings={settings}
      onChange={onChange}
      limits={limits}
      engines={engines}
      engineId={engineId}
      onEngineChange={onEngineChange}
      presets={PRESETS}
      presetId={presetId}
      onPresetChange={onPresetChange}
      testId="engine-menu"
    />,
  );
  return { onChange, onEngineChange, onPresetChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EngineSearchSettingsForm — the top bar's Engine menu (CTA-181)", () => {
  it("offers every search setting, each named, under the engine and its preset", () => {
    mount();
    // Every search stops at its depth or move time: no infinite analysis (CTA-185).
    expect(screen.queryByRole("switch")).toBeNull();
    for (const name of ["Search depth", "Move time", "Variations to show", "Threads", "Hash (MB)"]) {
      expect(screen.getByRole("slider", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("combobox", { name: "Engine" })).toHaveTextContent("Stockfish 19 Lite (19)");
    expect(screen.getByRole("combobox", { name: "Preset" })).toHaveTextContent("Default");
  });

  describe("the engine and its preset — chosen right here (CTA-185)", () => {
    it("offers Settings → Engine's engines, one this page cannot run disabled with its reason, names pinned LTR", async () => {
      const user = userEvent.setup();
      const { onEngineChange } = mount();
      await user.click(screen.getByRole("combobox", { name: "Engine" }));
      const listbox = screen.getByRole("listbox", { name: "Engine" });
      const options = within(listbox).getAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual([
        "Stockfish 19 Lite (19)",
        "Stockfish 19 Lite (multi-thread) (19)Needs cross-origin isolation — not available on this host",
      ]);
      expect(options[1]).toHaveAttribute("aria-disabled", "true");
      expect(options[0].querySelector("bdi")).toHaveAttribute("dir", "ltr");
      // Disabled is out of the pointer's reach too (MUI's `pointer-events: none`); nothing is chosen.
      expect(onEngineChange).not.toHaveBeenCalled();
    });

    it("reports an engine chosen — the engine server's too, while it answers", async () => {
      const user = userEvent.setup();
      const { onEngineChange } = mount(SETTINGS, MULTI_THREAD_LIMITS, { engines: SERVER_ENGINES });
      await user.click(screen.getByRole("combobox", { name: "Engine" }));
      await user.click(screen.getByRole("option", { name: "Stockfish 19 (this computer) (19)" }));
      expect(onEngineChange).toHaveBeenCalledWith(HOSTED_ENGINE.id);
    });

    it("offers the engine's presets, and reports one chosen", async () => {
      const user = userEvent.setup();
      const { onPresetChange } = mount(SETTINGS, MULTI_THREAD_LIMITS, { presetId: "p-deep" });
      const preset = screen.getByRole("combobox", { name: "Preset" });
      expect(preset).toHaveTextContent("deep-search");
      await user.click(preset);
      expect(within(screen.getByRole("listbox", { name: "Preset" })).getAllByRole("option").map((option) => option.textContent)).toEqual(
        PRESETS.map((each) => each.name),
      );
      await user.click(screen.getByRole("option", { name: "Default" }));
      expect(onPresetChange).toHaveBeenCalledWith("default");
    });
  });

  it("is operated from the keyboard, each change a patch", async () => {
    const { onChange } = mount();
    screen.getByRole("slider", { name: "Search depth" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ depth: SETTINGS.depth + 1 });
    screen.getByRole("slider", { name: "Variations to show" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith({ multiPv: SETTINGS.multiPv - 1 });
  });

  describe("the move time — Play with Engine's marked slider for every board (CTA-163)", () => {
    it("offers the marks 1 … 600 seconds and ∞ (CTA-185), and says the value as words", () => {
      mount();
      const slider = screen.getByRole("slider", { name: "Move time" });
      expect(slider).toHaveAttribute("aria-valuemax", "7");
      // The default, no limit, is the ∞ mark.
      expect(slider).toHaveAttribute("aria-valuenow", "7");
      expect(slider).toHaveAttribute("aria-valuetext", "No limit");
      for (const label of ["1", "5", "10", "30", "60", "300", "600", "∞"]) {
        expect(screen.getAllByText(label).some((each) => each.classList.contains("MuiSlider-markLabel"))).toBe(true);
      }
    });

    it("snaps to a mark and leaves its seconds as a patch", () => {
      const { onChange } = mount();
      fireEvent.change(screen.getByTestId("engine-menu-movetime-input"), { target: { value: "3" } });
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 30000 });
      fireEvent.change(screen.getByTestId("engine-menu-movetime-input"), { target: { value: "0" } });
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 1000 });
    });

    it("says the instant reply as 0s, and shows it as 0 in its box", () => {
      mount({ ...SETTINGS, moveTimeMs: 1 });
      expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuetext", "0s");
      expect(screen.getByRole("spinbutton", { name: "Move time in seconds, typed" })).toHaveValue(0);
    });
  });

  describe("the number boxes at the depth and move-time sliders' ends (CTA-185)", () => {
    it("takes a depth typed, held to 1 … 99 and to whole numbers — past the slider's 50 (CTA-185)", async () => {
      const user = userEvent.setup();
      const { onChange } = mount();
      const depth = screen.getByRole("spinbutton", { name: "Search depth, typed" });
      expect(depth).toHaveValue(SETTINGS.depth);
      await user.clear(depth);
      await user.type(depth, "25");
      expect(onChange).toHaveBeenLastCalledWith({ depth: 25 });
      await user.clear(depth);
      await user.type(depth, "75");
      expect(onChange).toHaveBeenLastCalledWith({ depth: 75 });
      await user.clear(depth);
      await user.type(depth, "150");
      expect(onChange).toHaveBeenLastCalledWith({ depth: 99 });
      await user.clear(depth);
      await user.type(depth, "0");
      expect(onChange).toHaveBeenLastCalledWith({ depth: 1 });
      await user.clear(depth);
      await user.type(depth, "12.6");
      expect(onChange).toHaveBeenLastCalledWith({ depth: 13 });
    });

    it("shows the reader's text while they type, and the value once they leave it", async () => {
      const user = userEvent.setup();
      mount();
      const depth = screen.getByRole("spinbutton", { name: "Search depth, typed" });
      await user.clear(depth);
      await user.type(depth, "150");
      expect(depth).toHaveValue(150);
      await user.tab();
      // The form's settings did not change (the test holds them): the box shows them again.
      expect(depth).toHaveValue(SETTINGS.depth);
    });

    it("takes a move time typed in seconds — off the marks too, the slider showing where it falls", async () => {
      const user = userEvent.setup();
      const { onChange } = mount({ ...SETTINGS, moveTimeMs: 5000 });
      const box = screen.getByRole("spinbutton", { name: "Move time in seconds, typed" });
      expect(box).toHaveValue(5);
      await user.clear(box);
      await user.type(box, "7.5");
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 7500 });
      await user.clear(box);
      // Past the slider's 600 s, kept (CTA-185) — held to 24 hours.
      await user.type(box, "900");
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 900000 });
      await user.clear(box);
      await user.type(box, "5000");
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 5_000_000 });
      await user.clear(box);
      await user.type(box, "100000");
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 86_400_000 });
      // 0 seconds is the instant reply, never "no limit" — the ∞ mark alone is.
      await user.clear(box);
      await user.type(box, "0");
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 1 });
    });

    it("shows a time past 600 s in its box, the slider at its last time mark — and keeps it when the box is left", async () => {
      const user = userEvent.setup();
      mount({ ...SETTINGS, moveTimeMs: 900000 });
      const box = screen.getByRole("spinbutton", { name: "Move time in seconds, typed" });
      expect(box).toHaveValue(900);
      expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuenow", "6");
      box.focus();
      await user.tab();
      expect(box).toHaveValue(900);
    });

    it("follows the slider: 7.5 s sits halfway between the 5 and 10 marks", () => {
      mount({ ...SETTINGS, moveTimeMs: 7500 });
      expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuenow", "1.5");
      expect(screen.getByRole("spinbutton", { name: "Move time in seconds, typed" })).toHaveValue(7.5);
    });

    it("turns the move-time box off on the ∞ mark — never the depth's", () => {
      mount({ ...SETTINGS, moveTimeMs: 0 });
      const box = screen.getByRole("spinbutton", { name: "Move time in seconds, typed" });
      expect(box).toBeDisabled();
      expect(box).toHaveAttribute("placeholder", "∞");
      expect(screen.getByRole("spinbutton", { name: "Search depth, typed" })).toBeEnabled();
    });
  });

  describe("Threads and Hash — up to what the engine running takes", () => {
    it("fixes Threads at one on a single-thread engine, and says so", () => {
      mount(SETTINGS, SINGLE_THREAD_LIMITS);
      expect(screen.getByRole("slider", { name: "Threads" })).toBeDisabled();
      expect(screen.getByTestId("engine-menu-threads-fixed")).toHaveTextContent("This engine build fixes Threads at 1.");
      expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("max", "512");
    });

    it("offers an engine server's engine its own range, past the in-browser 1024 MB", () => {
      mount(HOSTED_ASKED, HOSTED_LIMITS, { engines: SERVER_ENGINES, engineId: HOSTED_ENGINE.id });
      expect(screen.getByRole("slider", { name: "Threads" })).toHaveAttribute("max", "15");
      expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("max", "4096");
      expect(screen.getAllByText("4096").some((label) => label.classList.contains("MuiSlider-markLabel"))).toBe(true);
      expect(screen.getByTestId("engine-menu-hash-value")).toHaveTextContent("4096");
    });

    it("shows a request past the engine's top held to it — the store keeps what was asked", () => {
      const { onChange } = mount(HOSTED_ASKED, SINGLE_THREAD_LIMITS);
      expect(screen.getByTestId("engine-menu-threads-value")).toHaveTextContent("1");
      expect(screen.getByTestId("engine-menu-hash-value")).toHaveTextContent("512");
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });

  it("passes axe in Hebrew, its move-time box off", async () => {
    await i18n.changeLanguage("he");
    mount();
    await expectNoAxeViolations();
  });
});
