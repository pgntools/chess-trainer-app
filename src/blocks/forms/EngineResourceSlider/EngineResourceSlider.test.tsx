import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import EngineResourceSlider, { type EngineResource } from "./EngineResourceSlider";
import { HOSTED, MULTI_THREAD, SINGLE_THREAD, type ResourceLimits } from "./fixtures";

const mount = (resource: EngineResource, value: number, limits: ResourceLimits = MULTI_THREAD) => {
  const onChange = vi.fn();
  render(
    <EngineResourceSlider
      resource={resource}
      value={value}
      sliderMax={limits.slider[resource]}
      typedMax={limits.typed[resource]}
      onChange={onChange}
      testId="probe"
    />,
  );
  return { onChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EngineResourceSlider — Threads or Hash, a slider and a number box (CTA-185)", () => {
  it("stops the slider at the device's top and lets the box go to the engine's", async () => {
    const user = userEvent.setup();
    const { onChange } = mount("threads", 4);
    expect(screen.getByRole("slider", { name: "Threads" })).toHaveAttribute("aria-valuemax", "7");
    const box = screen.getByRole("spinbutton", { name: "Threads, typed" });
    expect(box).toHaveValue(4);
    await user.clear(box);
    await user.type(box, "16");
    expect(onChange).toHaveBeenLastCalledWith(16);
    await user.clear(box);
    await user.type(box, "64");
    expect(onChange).toHaveBeenLastCalledWith(32);
  });

  it("shows a request past the slider's top at its end, the number in the box", () => {
    mount("threads", 16);
    expect(screen.getByRole("slider", { name: "Threads" })).toHaveAttribute("aria-valuenow", "7");
    expect(screen.getByRole("spinbutton", { name: "Threads, typed" })).toHaveValue(16);
  });

  it("shows a request past what the engine takes held to it — the store keeps what was asked", () => {
    const { onChange } = mount("hashMb", 4096, SINGLE_THREAD);
    expect(screen.getByRole("spinbutton", { name: "Hash (MB), typed" })).toHaveValue(1024);
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("aria-valuenow", "512");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("fixes a single-thread build's Threads at one, and says so", () => {
    mount("threads", 4, SINGLE_THREAD);
    expect(screen.getByRole("slider", { name: "Threads" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Threads, typed" })).toBeDisabled();
    expect(screen.getByTestId("probe-fixed")).toHaveTextContent("This engine build fixes Threads at 1.");
  });

  it("marks Hash's round sizes within the slider", () => {
    mount("hashMb", 2048, HOSTED);
    for (const label of ["128", "1024", "4096"]) {
      expect(screen.getAllByText(label).some((each) => each.classList.contains("MuiSlider-markLabel"))).toBe(true);
    }
  });

  it("passes axe, in English and Hebrew", async () => {
    const { unmount } = render(
      <EngineResourceSlider resource="hashMb" value={256} sliderMax={1024} typedMax={1024} onChange={() => {}} testId="probe" />,
    );
    await expectNoAxeViolations();
    unmount();
    await i18n.changeLanguage("he");
    mount("threads", 4);
    await expectNoAxeViolations();
  });
});
