import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AnalysisEngineForm, { type AnalysisEngineFormProps } from "./AnalysisEngineForm";
import { ABSENT, BEFORE_HANDSHAKE, PINNED, SETTINGS, SHIPPED } from "./fixtures";

const mount = (props: Partial<AnalysisEngineFormProps> = {}) => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const onShowEvalBarChange = vi.fn();
  render(
    <AnalysisEngineForm
      settings={SETTINGS}
      onChange={onChange}
      engineOptions={SHIPPED}
      engineOn
      showEvalBar
      onShowEvalBarChange={onShowEvalBarChange}
      onClear={onClear}
      testId="probe"
      {...props}
    />,
  );
  return { onChange, onClear, onShowEvalBarChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("AnalysisEngineForm", () => {
  it("names each slider, shows its value, and caps the lines at ten", async () => {
    mount();
    expect(screen.getByRole("slider", { name: "Search depth" })).toHaveValue("18");
    expect(screen.getByTestId("engine-setting-movetime-value")).toHaveTextContent("1.5");
    const lines = screen.getByRole("slider", { name: "Variations to show" });
    expect(lines).toHaveAttribute("aria-valuemax", "10");
    await expectNoAxeViolations(screen.getByTestId("probe-settings"));
  });

  it("changes a setting from the keyboard, and switches the eval bar", async () => {
    const user = userEvent.setup();
    const { onChange, onShowEvalBarChange } = mount();
    screen.getByRole("slider", { name: "Search depth" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith({ depth: 19 });
    await user.click(screen.getByRole("switch", { name: "Show evaluation bar" }));
    expect(onShowEvalBarChange).toHaveBeenCalledWith(false);
  });

  it("turns the search's controls off while the engine is", () => {
    mount({ engineOn: false });
    expect(screen.getByRole("switch", { name: "Infinite analysis" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Search depth" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Move time" })).toBeDisabled();
  });

  it("switches infinite analysis, saying what it does, and offers depth to 40 and a minute (CTA-160)", async () => {
    const user = userEvent.setup();
    const { onChange } = mount();
    const infinite = screen.getByRole("switch", { name: "Infinite analysis" });
    expect(infinite).not.toBeChecked();
    expect(infinite).toHaveAccessibleDescription(/until the position changes/);
    await user.click(infinite);
    expect(onChange).toHaveBeenCalledWith({ infinite: true });

    expect(screen.getByRole("slider", { name: "Search depth" })).toHaveAttribute("aria-valuemax", "40");
    expect(screen.getByRole("slider", { name: "Move time" })).toHaveAttribute("aria-valuemax", "60000");
  });

  it("says when this build pins the lines, or has none", () => {
    mount({ engineOptions: PINNED });
    expect(screen.getByTestId("engine-setting-multipv-fixed")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Variations to show" })).toBeDisabled();
  });

  it("calls a missing option unsupported only once the handshake has landed", () => {
    mount({ engineOptions: ABSENT });
    expect(screen.getByTestId("engine-setting-multipv-unsupported")).toBeInTheDocument();
  });

  it("stays live before the handshake", () => {
    mount({ engineOptions: BEFORE_HANDSHAKE });
    expect(screen.queryByTestId("engine-setting-multipv-unsupported")).toBeNull();
    expect(screen.getByRole("slider", { name: "Variations to show" })).toBeEnabled();
  });

  it("clears, and offers no Clear when told not to", () => {
    const { onClear } = mount();
    fireEvent.click(screen.getByTestId("probe-clear"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
