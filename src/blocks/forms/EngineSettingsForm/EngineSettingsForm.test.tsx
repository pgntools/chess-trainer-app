import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { EngineOption } from "../../../lib/engineTypes";
import { expectNoAxeViolations } from "../../../test/axe";
import { engineOptionState, optionSlug } from "./engineOptionState";
import EngineSettingsForm from "./EngineSettingsForm";
import {
  ELO_WITHOUT_LIMIT_OPTIONS,
  NO_OPTIONS,
  PINNED_SKILL_OPTIONS,
  SETTINGS,
  SETTINGS_LINK,
  SHIPPED_OPTIONS,
  SKILL_ONLY_OPTIONS,
} from "./fixtures";

const mount = (engineOptions: ReadonlyMap<string, EngineOption> = SHIPPED_OPTIONS, strengthOff = false) => {
  const onChange = vi.fn();
  render(
    <EngineSettingsForm
      settings={SETTINGS}
      onChange={onChange}
      engineOptions={engineOptions}
      strengthOff={strengthOff ? { settingsLink: SETTINGS_LINK } : undefined}
      testId="engine"
    />,
  );
  return { onChange };
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

describe("EngineSettingsForm — the opponent's strength (CTA-181: the strength alone)", () => {
  it("is the strength alone: no depth, move time, lines, Threads or Hash — the top bar's Engine menu has them", () => {
    mount();
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(screen.getByRole("slider", { name: "Strength (Elo)" })).toBeInTheDocument();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByTestId("engine-settings")).toBeInTheDocument();
  });

  it("offers the eval bar's switch where a screen hands it one — the Lobby's form", async () => {
    const onEvalBar = vi.fn();
    render(
      <EngineSettingsForm
        settings={SETTINGS}
        onChange={vi.fn()}
        engineOptions={SHIPPED_OPTIONS}
        evalBar={{ checked: true, onChange: onEvalBar }}
        testId="engine"
      />,
    );
    screen.getByRole("switch", { name: "Show evaluation bar" }).focus();
    await userEvent.keyboard(" ");
    expect(onEvalBar).toHaveBeenCalledWith(false);
  });

  it("turns a pinned strength off and says what it is fixed at", () => {
    mount(PINNED_SKILL_OPTIONS);
    expect(screen.getByRole("slider", { name: "Strength" })).toBeDisabled();
    expect(screen.getByTestId("engine-setting-skill-level-fixed")).toHaveTextContent("This engine build fixes Skill Level at 8.");
  });

  describe("Skill Level or Elo, by what the running engine declared (CTA-153)", () => {
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
      expect(screen.queryByTestId("engine-setting-elo-unsupported")).toBeNull();
    });
  });

  describe("the preset's UCI_LimitStrength off (CTA-181)", () => {
    it("turns the Elo off, says why, and links to Settings → Engine", () => {
      mount(SHIPPED_OPTIONS, true);
      expect(screen.getByRole("slider", { name: "Strength (Elo)" })).toBeDisabled();
      expect(screen.getByTestId("engine-strength-off")).toHaveTextContent("UCI_LimitStrength off");
      expect(screen.getByRole("link", { name: "Turn it on in Settings → Engine" })).toHaveAttribute("href", "/settings/engine");
    });

    it("leaves a Skill Level live — it is always Play's", () => {
      mount(SKILL_ONLY_OPTIONS, true);
      expect(screen.getByRole("slider", { name: "Strength" })).toBeEnabled();
      expect(screen.queryByTestId("engine-strength-off")).toBeNull();
    });

    it("passes axe with the Elo off", async () => {
      mount(SHIPPED_OPTIONS, true);
      await expectNoAxeViolations();
    });
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
