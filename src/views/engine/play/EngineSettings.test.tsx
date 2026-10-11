import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import i18n from "../../../i18n";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import type { EngineOption } from "../../../lib/engineTypes";
import EngineSettings from "./EngineSettings";
import { approximateElo, DEFAULT_ENGINE_SETTINGS } from "../../../lib/engineSettings";

/*
  The tab is presentational, so nothing here builds an `Engine` — the map of
  declared options is exactly what the real one hands over. Since CTA-181 it
  is the strength alone: the search settings are the top bar's Engine menu.
*/

const spin = (name: string, min: number, max: number): [string, EngineOption] => [name, { name, type: "spin", min, max }];

/** An engine strengthened by `Skill Level` alone — no `UCI_Elo`. */
const SKILL_ONLY_OPTIONS = new Map<string, EngineOption>([spin("MultiPV", 1, 500), spin("Skill Level", 0, 20)]);

/** The shipped builds: an Elo, with UCI_LimitStrength. */
const ELO_OPTIONS = new Map<string, EngineOption>([
  spin("Skill Level", 0, 20),
  spin("UCI_Elo", 1320, 3190),
  ["UCI_LimitStrength", { name: "UCI_LimitStrength", type: "check", defaultValue: "false" }],
]);

const renderSettings = (
  overrides: Partial<{
    settings: { skillLevel?: number; elo?: number };
    engineOptions: ReadonlyMap<string, EngineOption>;
    limitStrength: boolean;
    evalBar: boolean;
  }> = {},
) => {
  const onChange = vi.fn();
  const onEvalBar = vi.fn();
  render(
    <MemoryRouter>
      <AppThemeWithLang>
        <EngineSettings
          settings={{ skillLevel: DEFAULT_ENGINE_SETTINGS.skillLevel, elo: DEFAULT_ENGINE_SETTINGS.elo, ...overrides.settings }}
          onChange={onChange}
          engineOptions={overrides.engineOptions ?? SKILL_ONLY_OPTIONS}
          limitStrength={overrides.limitStrength ?? true}
          evalBar={overrides.evalBar === undefined ? undefined : { checked: overrides.evalBar, onChange: onEvalBar }}
        />
      </AppThemeWithLang>
    </MemoryRouter>,
  );
  return { onChange, onEvalBar };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("the Engine tab — the opponent's strength (CTA-181)", () => {
  it("is the strength alone: depth, move time, lines, Threads and Hash are the top bar's", () => {
    renderSettings();
    expect(screen.getByTestId("engine-setting-skill-level")).toBeInTheDocument();
    for (const testId of ["engine-setting-depth", "engine-setting-multipv", "engine-setting-movetime", "engine-setting-threads", "engine-setting-hash"]) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    }
    // The eval bar is the board's engine menu's; only the Lobby's form hands it one.
    expect(screen.queryByTestId("engine-setting-evalbar")).not.toBeInTheDocument();
  });

  it("takes a slider's range from the engine rather than from a guess", () => {
    renderSettings({ engineOptions: new Map([spin("Skill Level", 0, 8)]) });
    const input = screen.getByTestId("engine-setting-skill-level").querySelector("input");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "8");
  });

  it("labels strength as a level with an estimated Elo, not as an Elo setting", () => {
    renderSettings({ settings: { skillLevel: 10 } });
    expect(screen.getByTestId("engine-setting-skill-level-value")).toHaveTextContent(`Level 10 (≈${approximateElo(10)} Elo)`);
  });

  it("turns the Elo off while the engine's preset has UCI_LimitStrength off, with a link to Settings → Engine", () => {
    renderSettings({ engineOptions: ELO_OPTIONS, limitStrength: false });
    expect(screen.getByRole("slider", { name: "Strength (Elo)" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Turn it on in Settings → Engine" })).toHaveAttribute("href", "/settings/engine");
  });

  it("leaves the Elo live while the preset limits the strength", () => {
    renderSettings({ engineOptions: ELO_OPTIONS, limitStrength: true });
    expect(screen.getByRole("slider", { name: "Strength (Elo)" })).toBeEnabled();
    expect(screen.queryByTestId("engine-strength-off")).not.toBeInTheDocument();
  });

  it("toggles the evaluation bar where it is offered — the Lobby's form", async () => {
    const { onEvalBar } = renderSettings({ evalBar: true });
    await userEvent.click(screen.getByTestId("engine-setting-evalbar").querySelector("input")!);
    expect(onEvalBar).toHaveBeenCalledWith(false);
  });
});

describe("approximateElo", () => {
  it("spans the skill-level range and rises with it", () => {
    expect(approximateElo(0)).toBe(1350);
    expect(approximateElo(20)).toBe(2850);
    expect(approximateElo(10)).toBeGreaterThan(approximateElo(5));
  });
});
