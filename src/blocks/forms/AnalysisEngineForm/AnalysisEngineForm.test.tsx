import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AnalysisEngineForm, { type AnalysisEngineFormProps } from "./AnalysisEngineForm";
import { ABSENT, BEFORE_HANDSHAKE, MULTI_THREAD, PINNED, SETTINGS, SHIPPED } from "./fixtures";

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

  it("has Play with Engine's Threads and Hash, by what the engine declared and what the device can give (CTA-160)", async () => {
    const user = userEvent.setup();
    mount();
    // The single-thread build pins Threads.
    expect(screen.getByRole("slider", { name: "Threads" })).toBeDisabled();
    expect(screen.getByTestId("engine-setting-threads-fixed")).toHaveTextContent("This engine build fixes Threads at 1.");
    // Hash is declared to 33,554,432 MB; offered to the 1024 ceiling.
    expect(screen.getByRole("slider", { name: "Hash (MB)" })).toHaveAttribute("aria-valuemax", "1024");

    const { onChange } = mount({ engineOptions: MULTI_THREAD, deviceLimits: { threads: 6, hashMb: 512 } });
    const threads = screen.getAllByRole("slider", { name: "Threads" }).at(-1)!;
    expect(threads).toBeEnabled();
    expect(threads).toHaveAttribute("aria-valuemax", "6");
    expect(screen.getAllByRole("slider", { name: "Hash (MB)" }).at(-1)).toHaveAttribute("aria-valuemax", "512");
    threads.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ threads: SETTINGS.threads + 1 });
  });

  it("offers Write evaluations into the game only when asked, and switches it (CTA-167)", async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.queryByRole("switch", { name: "Write evaluations into the game" })).toBeNull();

    const { onChange } = mount({ offerWriteEvals: true, engineOn: false });
    const write = screen.getByRole("switch", { name: "Write evaluations into the game" });
    // A recording preference, not a search control: live with the engine off.
    expect(write).toBeEnabled();
    expect(write).not.toBeChecked();
    await user.click(write);
    expect(onChange).toHaveBeenCalledWith({ writeEvals: true });
    await expectNoAxeViolations(screen.getAllByTestId("probe-settings").at(-1)!);
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
