import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
  SETTINGS,
  SETTINGS_LINK,
  SINGLE_THREAD_LIMITS,
} from "./fixtures";

const mount = (
  settings: EngineSearchSettings = SETTINGS,
  limits: { threads: number; hashMb: number } = MULTI_THREAD_LIMITS,
  engine: { name: string; version: string } = LITE,
) => {
  const onChange = vi.fn();
  render(
    <EngineSearchSettingsForm
      settings={settings}
      onChange={onChange}
      limits={limits}
      engine={engine}
      presetName="Default"
      settingsLink={SETTINGS_LINK}
      testId="engine-menu"
    />,
  );
  return { onChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EngineSearchSettingsForm — the top bar's Engine menu (CTA-181)", () => {
  it("offers every search setting, each named, under the engine, its preset and the way to Settings", () => {
    mount();
    expect(screen.getByRole("switch", { name: "Infinite analysis" })).not.toBeChecked();
    for (const name of ["Search depth", "Move time", "Variations to show", "Threads", "Hash (MB)"]) {
      expect(screen.getByRole("slider", { name })).toBeInTheDocument();
    }
    expect(screen.getByTestId("engine-menu-engine")).toHaveTextContent("Stockfish 19 Lite (19)");
    expect(screen.getByTestId("engine-menu-preset")).toHaveTextContent("Default");
    expect(screen.getByRole("link", { name: "Change the engine or its preset in Settings → Engine" })).toHaveAttribute(
      "href",
      "/settings/engine",
    );
  });

  it("is operated from the keyboard, each change a patch", async () => {
    const { onChange } = mount();
    screen.getByRole("slider", { name: "Search depth" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ depth: SETTINGS.depth + 1 });
    screen.getByRole("slider", { name: "Variations to show" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith({ multiPv: SETTINGS.multiPv - 1 });
    screen.getByRole("switch", { name: "Infinite analysis" }).focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith({ infinite: true });
  });

  describe("the move time — Play with Engine's marked slider for every board (CTA-163)", () => {
    it("offers the marks 0 … 300 seconds and ∞, and says the value as words", () => {
      mount();
      const slider = screen.getByRole("slider", { name: "Move time" });
      expect(slider).toHaveAttribute("aria-valuemax", "8");
      // The default, no limit, is the ∞ mark.
      expect(slider).toHaveAttribute("aria-valuenow", "8");
      expect(slider).toHaveAttribute("aria-valuetext", "No limit");
      for (const label of ["0", "5", "300", "∞"]) expect(screen.getByText(label)).toHaveClass("MuiSlider-markLabel");
    });

    it("snaps to a mark and leaves its seconds as a patch", () => {
      const { onChange } = mount();
      fireEvent.change(screen.getByTestId("engine-menu-movetime-input"), { target: { value: "4" } });
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 30000 });
      fireEvent.change(screen.getByTestId("engine-menu-movetime-input"), { target: { value: "0" } });
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 1 });
    });

    it("says the instant reply as 0s", () => {
      mount({ ...SETTINGS, moveTimeMs: 1 });
      expect(screen.getByTestId("engine-menu-movetime-value")).toHaveTextContent("0s");
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
      mount(HOSTED_ASKED, HOSTED_LIMITS, HOSTED_ENGINE);
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
});
