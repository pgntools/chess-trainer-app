import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { EngineOption } from "../../../lib/engine";
import { expectNoAxeViolations } from "../../../test/axe";
import { engineOptionState, optionSlug } from "./engineOptionState";
import EngineSettingsForm from "./EngineSettingsForm";
import { ADJUSTABLE_OPTIONS, NO_OPTIONS, SETTINGS, SHIPPED_OPTIONS, SPARSE_OPTIONS } from "./fixtures";

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
    for (const name of ["Strength", "Search depth", "Move time", "Variations to show", "Threads", "Hash (MB)"]) {
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

  it("leaves every knob live on a build that takes them, and before the handshake", () => {
    mount(ADJUSTABLE_OPTIONS);
    expect(screen.getByRole("slider", { name: "Threads" })).toBeEnabled();
    expect(screen.getByRole("slider", { name: "Threads" })).toHaveAttribute("max", "8");
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

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
