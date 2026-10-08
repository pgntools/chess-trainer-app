import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { EngineOption } from "../../../lib/engineTypes";
import { expectNoAxeViolations } from "../../../test/axe";
import { engineOptionState, optionSlug } from "./engineOptionState";
import EngineSettingsForm from "./EngineSettingsForm";
import {
  ADJUSTABLE_OPTIONS,
  ELO_WITHOUT_LIMIT_OPTIONS,
  NO_OPTIONS,
  SETTINGS,
  SHIPPED_OPTIONS,
  SKILL_ONLY_OPTIONS,
  SPARSE_OPTIONS,
} from "./fixtures";

const mount = (engineOptions: ReadonlyMap<string, EngineOption> = SHIPPED_OPTIONS) => {
  const onChange = vi.fn();
  const onShowEvalBarChange = vi.fn();
  render(
    <EngineSettingsForm
      settings={SETTINGS}
      onChange={onChange}
      engineOptions={engineOptions}
      showEvalBar
      onShowEvalBarChange={onShowEvalBarChange}
      testId="engine"
    />,
  );
  return { onChange, onShowEvalBarChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("engineOptionState", () => {
  it("tells absent, pinned and adjustable apart", () => {
    expect(engineOptionState(undefined, { min: 1, max: 4 })).toEqual({ kind: "absent", min: 1, max: 4 });
    expect(engineOptionState({ name: "Threads", type: "spin", min: 1, max: 1 }, { min: 1, max: 4 })).toEqual({
      kind: "pinned",
      min: 1,
      max: 1,
      fixedAt: 1,
    });
    expect(engineOptionState({ name: "MultiPV", type: "spin", min: 1, max: 500 }, { min: 1, max: 10 }, 10)).toEqual({
      kind: "adjustable",
      min: 1,
      max: 10,
    });
  });

  it("serves the fallbacks before the handshake, and only ever narrows the top", () => {
    expect(engineOptionState({ name: "Hash", type: "spin" }, { min: 1, max: 256 })).toEqual({ kind: "adjustable", min: 1, max: 256 });
    expect(engineOptionState({ name: "MultiPV", type: "spin", min: 1, max: 3 }, { min: 1, max: 10 }, 10).max).toBe(3);
    expect(optionSlug("Skill Level")).toBe("skill-level");
  });
});

describe("EngineSettingsForm", () => {
  it("renders every setting, each a named slider, and the eval bar switch", () => {
    mount();
    for (const name of ["Strength (Elo)", "Search depth", "Move time", "Variations to show", "Threads", "Hash (MB)"]) {
      expect(screen.getByRole("slider", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("switch", { name: "Show evaluation bar" })).toBeChecked();
    expect(screen.getByTestId("engine-settings")).toBeInTheDocument();
  });

  it("turns a pinned option off and says what it is fixed at", () => {
    mount();
    expect(screen.getByRole("slider", { name: "Threads" })).toBeDisabled();
    expect(screen.getByTestId("engine-setting-threads-fixed")).toHaveTextContent("This engine build fixes Threads at 1.");
    expect(screen.queryByTestId("engine-setting-threads-unsupported")).toBeNull();
  });

  it("turns an absent option off and says the build lacks it", () => {
    mount(SPARSE_OPTIONS);
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toBeDisabled();
    expect(screen.getByTestId("engine-setting-hash-unsupported")).toHaveTextContent('This engine build has no "Hash" option.');
    expect(screen.getByRole("slider", { name: "Strength" })).toHaveAttribute("max", "8");
  });

  it("leaves every knob live on a build that takes them", () => {
    mount(ADJUSTABLE_OPTIONS);
    expect(screen.getByRole("slider", { name: "Threads" })).toBeEnabled();
  });

  it("offers Threads and Hash only up to the app's ceilings, whatever the engine declares", () => {
    // The 19 builds declare `Hash` to 33,554,432 MB (2048 crashed the tab) and the multi-thread one 32 threads.
    mount(ADJUSTABLE_OPTIONS);
    expect(screen.getByRole("slider", { name: "Threads" })).toHaveAttribute("max", "32");
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("max", "1024");
  });

  it("offers Threads and Hash only up to what this device can give", () => {
    render(
      <EngineSettingsForm
        settings={SETTINGS}
        onChange={vi.fn()}
        engineOptions={ADJUSTABLE_OPTIONS}
        showEvalBar
        onShowEvalBarChange={vi.fn()}
        deviceLimits={{ threads: 3, hashMb: 128 }}
        testId="engine"
      />,
    );
    expect(screen.getByRole("slider", { name: "Threads" })).toHaveAttribute("max", "3");
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("max", "128");
  });

  it("calls nothing unsupported before the handshake", () => {
    mount(NO_OPTIONS);
    expect(screen.queryByTestId(/-unsupported$|-fixed$/)).toBeNull();
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toBeEnabled();
  });

  it("is operated from the keyboard: an arrow moves a slider, Space the switch", async () => {
    const { onChange, onShowEvalBarChange } = mount();
    screen.getByRole("slider", { name: "Search depth" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ depth: SETTINGS.depth + 1 });
    screen.getByRole("switch", { name: "Show evaluation bar" }).focus();
    await userEvent.keyboard(" ");
    expect(onShowEvalBarChange).toHaveBeenCalledWith(false);
  });

  describe("the Hash slider's RAM marks and the help captions (CTA-163)", () => {
    it("marks the round RAM points within the offered range", () => {
      mount(ADJUSTABLE_OPTIONS);
      for (const label of ["128", "256", "512", "1024"]) {
        expect(screen.getByText(label)).toHaveClass("MuiSlider-markLabel");
      }
    });

    it("adapts the marks to what this device can give", () => {
      render(
        <EngineSettingsForm
          settings={SETTINGS}
          onChange={vi.fn()}
          engineOptions={ADJUSTABLE_OPTIONS}
          showEvalBar
          onShowEvalBarChange={vi.fn()}
          deviceLimits={{ threads: 3, hashMb: 512 }}
          testId="engine"
        />,
      );
      for (const label of ["128", "256", "512"]) {
        expect(screen.getByText(label)).toHaveClass("MuiSlider-markLabel");
      }
      expect(screen.queryByText("1024")).toBeNull();
    });

    it("explains Hash in terms of RAM and Threads in terms of CPU cores", () => {
      mount(ADJUSTABLE_OPTIONS);
      expect(screen.getByTestId("engine-setting-hash-help")).toHaveTextContent("Engine memory (RAM)");
      expect(screen.getByTestId("engine-setting-threads-help")).toHaveTextContent("Engine CPU cores");
    });
  });

  describe("the move-time slider — lichess's snap marks (CTA-163)", () => {
    it("offers the marks 0 … 300 seconds and ∞, and tells a screen reader the value as words", () => {
      mount();
      const slider = screen.getByRole("slider", { name: "Move time" });
      expect(slider).toHaveAttribute("aria-valuemin", "0");
      expect(slider).toHaveAttribute("aria-valuemax", "8");
      expect(slider).toHaveAttribute("aria-valuenow", "0.2");
      expect(slider).toHaveAttribute("aria-valuetext", "1.0s");
      for (const label of ["0", "5", "10", "20", "30", "60", "120", "300", "∞"]) {
        expect(screen.getByText(label)).toHaveClass("MuiSlider-markLabel");
      }
      // The default's 1000 ms is shown where it falls, between "0" and "5".
      expect(screen.getByTestId("engine-setting-movetime-value")).toHaveTextContent("1.0s");
    });

    it("keeps the ∞ mark the reader's stored unlimited: moveTimeMs 0, said as No limit", () => {
      render(
        <EngineSettingsForm
          settings={{ ...SETTINGS, moveTimeMs: 0 }}
          onChange={vi.fn()}
          engineOptions={SHIPPED_OPTIONS}
          showEvalBar
          onShowEvalBarChange={vi.fn()}
          testId="engine"
        />,
      );
      const slider = screen.getByRole("slider", { name: "Move time" });
      expect(slider).toHaveAttribute("aria-valuenow", "8");
      expect(slider).toHaveAttribute("aria-valuetext", "No limit");
      expect(screen.getByTestId("engine-setting-movetime-value")).toHaveTextContent("No limit");
    });

    it("says the instant reply as 0s, not 0.0s", () => {
      render(
        <EngineSettingsForm
          settings={{ ...SETTINGS, moveTimeMs: 1 }}
          onChange={vi.fn()}
          engineOptions={SHIPPED_OPTIONS}
          showEvalBar
          onShowEvalBarChange={vi.fn()}
          testId="engine"
        />,
      );
      expect(screen.getByTestId("engine-setting-movetime-value")).toHaveTextContent("0s");
      expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuenow", "0");
    });

    it("snaps a drag to a mark: a slot arrives, its seconds leave as a patch", () => {
      const { onChange } = mount();
      // Slot 4 is the 30-seconds mark.
      fireEvent.change(screen.getByTestId("engine-setting-movetime-input"), { target: { value: "4" } });
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 30000 });
      fireEvent.change(screen.getByTestId("engine-setting-movetime-input"), { target: { value: "8" } });
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 0 });
      fireEvent.change(screen.getByTestId("engine-setting-movetime-input"), { target: { value: "0" } });
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 1 });
    });

    it("steps a mark at a time from the keyboard", async () => {
      const onChange = vi.fn();
      render(
        <EngineSettingsForm
          settings={{ ...SETTINGS, moveTimeMs: 0 }}
          onChange={onChange}
          engineOptions={SHIPPED_OPTIONS}
          showEvalBar
          onShowEvalBarChange={vi.fn()}
          testId="engine"
        />,
      );
      // Unlimited is the ∞ mark; an arrow steps onto the 300 s mark.
      screen.getByRole("slider", { name: "Move time" }).focus();
      await userEvent.keyboard("{ArrowLeft}");
      expect(onChange).toHaveBeenLastCalledWith({ moveTimeMs: 300000 });
    });
  });

  describe("the strength control — Skill Level or Elo, by what the running engine declared (CTA-153)", () => {
    it("is Skill Level, with its Elo an estimate, on an engine without UCI_Elo", () => {
      mount(SKILL_ONLY_OPTIONS);
      const strength = screen.getByRole("slider", { name: "Strength" });
      expect(strength).toHaveAttribute("max", "20");
      expect(screen.queryByRole("slider", { name: "Strength (Elo)" })).toBeNull();
      expect(screen.getByTestId("engine-setting-skill-level-value")).toHaveTextContent("≈");
    });

    it("is an Elo, in the engine's own range, on an engine that has UCI_Elo and UCI_LimitStrength", () => {
      mount(SHIPPED_OPTIONS);
      const strength = screen.getByRole("slider", { name: "Strength (Elo)" });
      expect(strength).toHaveAttribute("min", "1320");
      expect(strength).toHaveAttribute("max", "3190");
      expect(strength).toBeEnabled();
      // The Skill Level slider is not offered beside it: the engine ignores it while limited.
      expect(screen.queryByRole("slider", { name: "Strength" })).toBeNull();
      expect(screen.getByTestId("engine-setting-elo-value")).toHaveTextContent(`${SETTINGS.elo} Elo`);
    });

    it("sends the Elo the reader moves to, as a patch", async () => {
      const { onChange } = mount(SHIPPED_OPTIONS);
      screen.getByRole("slider", { name: "Strength (Elo)" }).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(onChange).toHaveBeenLastCalledWith({ elo: SETTINGS.elo + 1 });
    });

    it("stays Skill Level where UCI_Elo has no UCI_LimitStrength to go with it", () => {
      mount(ELO_WITHOUT_LIMIT_OPTIONS);
      expect(screen.getByRole("slider", { name: "Strength" })).toBeInTheDocument();
      expect(screen.queryByRole("slider", { name: "Strength (Elo)" })).toBeNull();
    });

    it("is the Elo — every shipped engine's — until the handshake lands, nothing called unsupported meanwhile", () => {
      mount(NO_OPTIONS);
      expect(screen.getByRole("slider", { name: "Strength (Elo)" })).toBeEnabled();
      expect(screen.queryByRole("slider", { name: "Strength" })).toBeNull();
    });

    it("passes axe in Elo mode", async () => {
      mount(SHIPPED_OPTIONS);
      await expectNoAxeViolations();
    });
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
