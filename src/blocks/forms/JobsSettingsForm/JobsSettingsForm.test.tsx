import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";
import { expectNoAxeViolations } from "../../../test/axe";
import JobsSettingsForm from "./JobsSettingsForm";
import { BOARD_DEFAULT, DEEP_DEFAULT, ENGINES, EVAL_SOURCES_LINK, PRESETS } from "./fixtures";

const mount = ({ defaultPreset = null }: { defaultPreset?: JobsDefaultPreset | null } = {}) => {
  const onDefaultPresetChange = vi.fn();
  render(
    <JobsSettingsForm
      defaultPreset={defaultPreset}
      onDefaultPresetChange={onDefaultPresetChange}
      initialDefault={BOARD_DEFAULT}
      engines={ENGINES}
      presets={PRESETS}
      evalSourcesLink={EVAL_SOURCES_LINK}
      testId="jobs-settings"
    />,
  );
  return { onDefaultPresetChange };
};

describe("JobsSettingsForm", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("starts with no default — no engine or preset select", () => {
    mount();
    expect(screen.getByRole("switch", { name: /use a default engine and preset/i })).not.toBeChecked();
    expect(screen.queryByRole("combobox", { name: /^engine/i })).not.toBeInTheDocument();
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

  it("holds no API controls — it says the eval sources are set in Settings → Engine, and links there (CTA-196)", () => {
    mount();
    expect(screen.queryByRole("switch", { name: /lichess evaluation api/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /api address/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evaluation sources" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings → Engine" })).toHaveAttribute("href", EVAL_SOURCES_LINK.href);
  });

  it("has no axe violations, on and off, in Hebrew too", async () => {
    mount({ defaultPreset: DEEP_DEFAULT });
    await expectNoAxeViolations();
    cleanup();
    await i18n.changeLanguage("he");
    mount();
    await expectNoAxeViolations();
  });
});
