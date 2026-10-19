import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import EngineJobRunningDialog from "./EngineJobRunningDialog";
import { ANALYSIS_JOB } from "./fixtures";

const mount = () => {
  const onPause = vi.fn();
  const onWait = vi.fn();
  render(<EngineJobRunningDialog open jobTitle={ANALYSIS_JOB} onPause={onPause} onWait={onWait} testId="probe" />);
  return { onPause, onWait };
};

describe("EngineJobRunningDialog", () => {
  it("is a dialog named by its title, naming the running job", async () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "An engine job is running" });
    expect(screen.getByTestId("probe-message")).toHaveTextContent(`“${ANALYSIS_JOB}” is running`);
    expect(screen.getByRole("button", { name: "Pause the job" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wait for it to finish" })).toBeInTheDocument();
    await expectNoAxeViolations(dialog);
  });

  it("answers Pause the job and Wait for it to finish — Escape waits", async () => {
    const user = userEvent.setup();
    const { onPause, onWait } = mount();
    await user.click(screen.getByRole("button", { name: "Pause the job" }));
    expect(onPause).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Wait for it to finish" }));
    expect(onWait).toHaveBeenCalledTimes(1);
    await user.keyboard("{Escape}");
    expect(onWait).toHaveBeenCalledTimes(2);
  });

  it("is operated by the keyboard alone", async () => {
    const user = userEvent.setup();
    const { onPause } = mount();
    const pause = screen.getByRole("button", { name: "Pause the job" });
    for (let tab = 0; tab < 4 && document.activeElement !== pause; tab += 1) await user.tab();
    expect(pause).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onPause).toHaveBeenCalledTimes(1);
  });
});
