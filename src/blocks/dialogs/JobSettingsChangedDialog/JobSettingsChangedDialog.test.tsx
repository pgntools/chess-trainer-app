import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import JobSettingsChangedDialog, { type JobSettingsChangedDialogProps } from "./JobSettingsChangedDialog";
import { DEPTH_ONLY, EVERYTHING_CHANGED, TOO_MANY } from "./fixtures";

const mount = (props: Partial<JobSettingsChangedDialogProps> = {}, themed = false) => {
  const onKeep = vi.fn();
  const onCurrent = vi.fn();
  const onClose = vi.fn();
  const dialog = (
    <JobSettingsChangedDialog
      open
      name="Carlsen – Nakamura"
      changes={EVERYTHING_CHANGED}
      onKeep={onKeep}
      onCurrent={onCurrent}
      onClose={onClose}
      testId="probe"
      {...props}
    />
  );
  render(themed ? <AppThemeWithLang>{dialog}</AppThemeWithLang> : dialog);
  return { onKeep, onCurrent, onClose };
};

describe("JobSettingsChangedDialog (CTA-236)", () => {
  it("is a dialog named by its title, listing each setting that differs — the job's value, then the current one", async () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "Engine settings changed" });
    expect(within(dialog).getByTestId("probe-message")).toHaveTextContent("“Carlsen – Nakamura” was queued with other engine settings");
    const rows = within(within(dialog).getByRole("list")).getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual([
      "Engine: Stockfish 19 (engine server) → Stockfish 19 (single-threaded)",
      "Preset: Deep analysis → Default",
      "Contempt: 20 → not set",
      "UCI_ShowWDL: on → off",
      "Depth: 30 → 20",
      "Time per move: No limit → 5 s",
      "Threads: 8 → 1",
      "Hash: 1024 MB → 16 MB",
    ]);
    expect(within(dialog).getByTestId("probe-note")).toHaveTextContent("the positions it has analysed are kept");
    await expectNoAxeViolations(dialog);
  });

  it("answers each of its three actions — and Escape is Cancel", async () => {
    const user = userEvent.setup();
    const { onKeep, onCurrent, onClose } = mount({ changes: DEPTH_ONLY });
    await user.click(screen.getByRole("button", { name: "Continue with current settings" }));
    expect(onCurrent).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Continue with the job's settings" }));
    expect(onKeep).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("is locked while the new job is queued, and says a refusal in the dialog", async () => {
    const user = userEvent.setup();
    const { onClose } = mount({ changes: DEPTH_ONLY, busy: true, error: TOO_MANY });
    for (const name of ["Cancel", "Continue with the job's settings", "Continue with current settings"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(TOO_MANY);
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("reads in Hebrew, right to left", async () => {
    await i18n.changeLanguage("he");
    try {
      mount({ changes: DEPTH_ONLY }, true);
      const dialog = screen.getByRole("dialog", { name: "הגדרות המנוע השתנו" });
      expect(dialog.closest("[dir]")).toHaveAttribute("dir", "rtl");
      expect(within(dialog).getByRole("listitem")).toHaveTextContent("עומק: 20 ← 24");
      expect(within(dialog).getByRole("button", { name: "המשך בהגדרות הנוכחיות" })).toBeInTheDocument();
      await expectNoAxeViolations(dialog);
    } finally {
      await i18n.changeLanguage("en");
    }
  });
});
