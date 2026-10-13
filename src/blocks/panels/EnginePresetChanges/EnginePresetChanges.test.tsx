import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import EnginePresetChanges from "./EnginePresetChanges";
import { DEEP_NAME, DEFAULT_NAME } from "./fixtures";

const mount = (presetName = DEFAULT_NAME, variant: "strip" | "actions" = "strip") => {
  const onSave = vi.fn();
  const onSaveAs = vi.fn();
  render(<EnginePresetChanges presetName={presetName} variant={variant} onSave={onSave} onSaveAs={onSaveAs} testId="probe" />);
  return { onSave, onSaveAs };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EnginePresetChanges — an engine preset's unsaved changes (CTA-185)", () => {
  it("names the preset changed, says the changes are in effect, and saves them into it", async () => {
    const user = userEvent.setup();
    const { onSave, onSaveAs } = mount(DEEP_NAME);
    const strip = screen.getByRole("region", { name: `Unsaved changes to ${DEEP_NAME}` });
    expect(strip).toHaveTextContent("Every board uses them now.");
    await user.click(within(strip).getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSaveAs).not.toHaveBeenCalled();
  });

  it("saves them as a new preset under a name asked for — its copy's name to start", async () => {
    const user = userEvent.setup();
    const { onSave, onSaveAs } = mount();
    await user.click(screen.getByRole("button", { name: "Save as new preset" }));
    const dialog = screen.getByRole("dialog", { name: "Save as new preset" });
    const name = within(dialog).getByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("Default (copy)");
    await user.clear(name);
    expect(within(dialog).getByRole("button", { name: "Create" })).toBeDisabled();
    await user.type(name, "  Sharper  ");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));
    expect(onSaveAs).toHaveBeenCalledWith("Sharper");
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("saves nothing when the name is cancelled", async () => {
    const user = userEvent.setup();
    const { onSaveAs } = mount();
    await user.click(screen.getByRole("button", { name: "Save as new preset" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(onSaveAs).not.toHaveBeenCalled();
  });

  describe("the actions variant — the Engine menu's title row (CTA-189)", () => {
    it("is the two actions alone — no strip, no texts — and saves into the preset", async () => {
      const user = userEvent.setup();
      const { onSave, onSaveAs } = mount(DEEP_NAME, "actions");
      expect(screen.queryByRole("region", { name: `Unsaved changes to ${DEEP_NAME}` })).toBeNull();
      expect(screen.queryByText("Every board uses them now.")).toBeNull();
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSaveAs).not.toHaveBeenCalled();
    });

    it("still opens the naming dialog, the copy's name to start, and saves as a new preset", async () => {
      const user = userEvent.setup();
      const { onSave, onSaveAs } = mount(DEFAULT_NAME, "actions");
      await user.click(screen.getByRole("button", { name: "Save as new preset" }));
      const dialog = screen.getByRole("dialog", { name: "Save as new preset" });
      const name = within(dialog).getByRole("textbox", { name: "Name" });
      expect(name).toHaveValue("Default (copy)");
      await user.clear(name);
      await user.type(name, "Sharper{Enter}");
      expect(onSaveAs).toHaveBeenCalledWith("Sharper");
      expect(onSave).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("passes axe, in English and Hebrew", async () => {
      const { unmount } = render(
        <EnginePresetChanges presetName={DEFAULT_NAME} variant="actions" onSave={() => {}} onSaveAs={() => {}} testId="probe" />,
      );
      await expectNoAxeViolations();
      unmount();
      await i18n.changeLanguage("he");
      mount(DEFAULT_NAME, "actions");
      await expectNoAxeViolations();
    });
  });

  it("passes axe, in English and Hebrew", async () => {
    const { unmount } = render(<EnginePresetChanges presetName={DEFAULT_NAME} onSave={() => {}} onSaveAs={() => {}} testId="probe" />);
    await expectNoAxeViolations();
    unmount();
    await i18n.changeLanguage("he");
    mount(DEEP_NAME);
    await expectNoAxeViolations();
  });
});
