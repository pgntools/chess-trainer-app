import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("offers Threads and Hash only up to the app's own bounds, whatever the engine declares", () => {
    // The 19 builds declare `Hash` to 33,554,432 MB and the multi-thread one 32 threads.
    mount(ADJUSTABLE_OPTIONS);
    expect(screen.getByRole("slider", { name: "Threads" })).toHaveAttribute("max", "4");
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("max", "256");
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
