import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { ENGINE_OFF, PAUSED, THINKING } from "./fixtures";
import PlayToggleButton from "./PlayToggleButton";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("PlayToggleButton", () => {
  it("is a toggle named for what it will do, pressed from the keyboard", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<PlayToggleButton {...PAUSED} onToggle={onToggle} testId="probe" />);
    const button = screen.getByRole("button", { name: i18n.t("analysis.play.start") });
    expect(button).toHaveAttribute("aria-pressed", "false");
    button.focus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("rings a named progress bar while the engine thinks", async () => {
    render(<PlayToggleButton {...THINKING} onToggle={() => {}} testId="probe" />);
    expect(screen.getByRole("progressbar", { name: i18n.t("analysis.play.thinking") })).toBe(screen.getByTestId("probe-spinner"));
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-pressed", "true");
    await expectNoAxeViolations(document.body);
  });

  it("is off while the engine is", () => {
    render(<PlayToggleButton {...ENGINE_OFF} onToggle={() => {}} testId="probe" />);
    expect(screen.getByTestId("probe")).toBeDisabled();
  });
});
