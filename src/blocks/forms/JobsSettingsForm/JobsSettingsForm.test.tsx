import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";
import { expectNoAxeViolations } from "../../../test/axe";
import type { EngineServerFormStatus } from "../EngineServerForm";
import JobsSettingsForm from "./JobsSettingsForm";
import { API_URL, BOARD_DEFAULT, DEEP_DEFAULT, ENGINES, NOT_AN_EVAL_API, ONLINE, PRESETS, UNREACHABLE } from "./fixtures";

type Mount = { defaultPreset?: JobsDefaultPreset | null; enabled?: boolean; status?: EngineServerFormStatus; write?: boolean; writable?: boolean };

const mount = ({ defaultPreset = null, enabled = false, status, write = false, writable }: Mount = {}) => {
  const props = { onDefaultPresetChange: vi.fn(), onEnabledChange: vi.fn(), onAddressChange: vi.fn(), onConnect: vi.fn(), onWriteChange: vi.fn() };
  const { container } = render(
    <JobsSettingsForm
      defaultPreset={defaultPreset}
      onDefaultPresetChange={props.onDefaultPresetChange}
      initialDefault={BOARD_DEFAULT}
      engines={ENGINES}
      presets={PRESETS}
      evalApi={{
        enabled,
        onEnabledChange: props.onEnabledChange,
        address: API_URL,
        onAddressChange: props.onAddressChange,
        onConnect: props.onConnect,
        connectFeedback: "idle",
        addressInvalid: false,
        example: API_URL,
        status,
      }}
      evalApiWrite={{ checked: write, onChange: props.onWriteChange, writable }}
      testId="jobs-settings"
    />,
  );
  return { ...props, container };
};

describe("JobsSettingsForm", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("starts with no default and the API off — no address, no Connect", () => {
    mount();
    expect(screen.getByRole("switch", { name: /use a default engine and preset/i })).not.toBeChecked();
    expect(screen.queryByRole("combobox", { name: /^engine/i })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /use the lichess evaluation api/i })).not.toBeChecked();
    expect(screen.queryByRole("textbox", { name: /api address/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect" })).not.toBeInTheDocument();
  });

  it("turns a default on from the board's engine and preset", async () => {
    const user = userEvent.setup();
    const { onDefaultPresetChange } = mount();
    await user.click(screen.getByRole("switch", { name: /use a default engine and preset/i }));
    expect(onDefaultPresetChange).toHaveBeenCalledWith(BOARD_DEFAULT);
  });

  it("picks the default's preset from its select, and turns the default off again", async () => {
    const user = userEvent.setup();
    const { onDefaultPresetChange } = mount({ defaultPreset: BOARD_DEFAULT });
    expect(screen.getByRole("switch", { name: /use a default engine and preset/i })).toBeChecked();
    await user.click(screen.getByRole("combobox", { name: /preset for new jobs/i }));
    await user.click(screen.getByRole("option", { name: "Deep — depth 30" }));
    expect(onDefaultPresetChange).toHaveBeenLastCalledWith(DEEP_DEFAULT);
    await user.click(screen.getByRole("switch", { name: /use a default engine and preset/i }));
    expect(onDefaultPresetChange).toHaveBeenLastCalledWith(null);
  });

  it("lists an engine this page cannot run as disabled", async () => {
    const user = userEvent.setup();
    mount({ defaultPreset: BOARD_DEFAULT });
    await user.click(screen.getByRole("combobox", { name: /engine for new jobs/i }));
    expect(screen.getByRole("option", { name: /multi-thread/i })).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the API's address, Connect and its connection in the API's own words", async () => {
    const user = userEvent.setup();
    const { onConnect } = mount({ enabled: true, status: ONLINE });
    expect(screen.getByRole("textbox", { name: /api address/i })).toHaveValue(API_URL);
    expect(within(screen.getByTestId("jobs-settings-eval-api-indicator-region")).getByText("Connected · 31 ms")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(onConnect).toHaveBeenCalled();
  });

  it.each([
    [UNREACHABLE, /did not answer/i],
    [NOT_AN_EVAL_API, /not as the lichess evaluation api/i],
  ])("says why the API is not connected", (status, words) => {
    mount({ enabled: true, status });
    expect(screen.getByText(words)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("offers sending the engine's evaluations only while the API is on, and says when it is not in write mode", async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.queryByRole("checkbox", { name: /send the engine's evaluations/i })).not.toBeInTheDocument();
    cleanup();
    const { onWriteChange } = mount({ enabled: true, status: ONLINE });
    const send = screen.getByRole("checkbox", { name: /send the engine's evaluations/i });
    expect(send).not.toBeChecked();
    await user.click(send);
    expect(onWriteChange).toHaveBeenCalledWith(true);
    cleanup();
    mount({ enabled: true, status: ONLINE, write: true, writable: false });
    expect(screen.getByRole("checkbox", { name: /send the engine's evaluations/i })).toBeChecked();
    expect(screen.getByText(/is not in write mode/i)).toBeInTheDocument();
    cleanup();
    mount({ enabled: true, status: ONLINE, write: true, writable: true });
    expect(screen.queryByText(/is not in write mode/i)).not.toBeInTheDocument();
  });

  it("has no axe violations, on and off, in Hebrew too", async () => {
    mount({ defaultPreset: DEEP_DEFAULT, enabled: true, status: ONLINE, write: true, writable: false });
    await expectNoAxeViolations();
    cleanup();
    await i18n.changeLanguage("he");
    mount();
    await expectNoAxeViolations();
  });
});
