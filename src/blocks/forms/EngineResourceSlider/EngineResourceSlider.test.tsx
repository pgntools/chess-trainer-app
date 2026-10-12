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

  it("labels Hash's marks in gigabytes, each where its size falls, the box still in MB", () => {
    mount("hashMb", 2048, HOSTED);
    const labels = [...document.querySelectorAll(".MuiSlider-markLabel")].map((label) => label.textContent);
    expect(labels).toEqual(["1GB", "2GB", "4GB"]);
    // A linear slider: every power of two from 16 MB a mark, at its own size.
    expect(document.querySelectorAll(".MuiSlider-mark")).toHaveLength(9);
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("aria-valuenow", "2048");
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("aria-valuetext", "2048MB");
    expect(screen.getByRole("spinbutton", { name: "Hash (MB), typed" })).toHaveValue(2048);
  });

  it("snaps Hash to its marks — the next round size, not the next megabyte", async () => {
    const user = userEvent.setup();
    const { onChange } = mount("hashMb", 256, MULTI_THREAD);
    screen.getByRole("slider", { name: "Hash (MB)" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(512);
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(128);
  });

  it("shows a Hash typed between two marks where it falls, and keeps it", () => {
    const { onChange } = mount("hashMb", 96, MULTI_THREAD);
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("aria-valuenow", "96");
    expect(screen.getByRole("spinbutton", { name: "Hash (MB), typed" })).toHaveValue(96);
    expect(onChange).not.toHaveBeenCalled();
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
