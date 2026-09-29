import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { BOTH_TAGS, NO_TAGS, OPENING_TAGS } from "./fixtures";
import OpeningTreePgnDialog from "./OpeningTreePgnDialog";

const mount = () => {
  const onSave = vi.fn();
  render(<OpeningTreePgnDialog open onClose={() => {}} onSave={onSave} testId="dialog" partsTestId="save" />);
  return onSave;
};

describe("OpeningTreePgnDialog (CTA-113)", () => {
  it("opens on Add tags with games ticked, and saves that", async () => {
    const onSave = mount();
    expect(screen.getByRole("radio", { name: "Add tags" })).toBeChecked();
    expect(screen.getByTestId("save-games")).toBeChecked();
    await expectNoAxeViolations(screen.getByRole("dialog"));
    await userEvent.click(screen.getByTestId("save-confirm"));
    expect(onSave).toHaveBeenCalledWith(OPENING_TAGS);
  });

  it("turns the boxes off under No, and Save off with neither ticked", async () => {
    const user = userEvent.setup();
    const onSave = mount();
    await user.click(screen.getByTestId("save-games"));
    expect(screen.getByTestId("save-confirm")).toBeDisabled();
    await user.click(screen.getByTestId("save-no"));
    expect(screen.getByTestId("save-prc")).toBeDisabled();
    await user.click(screen.getByTestId("save-confirm"));
    expect(onSave).toHaveBeenLastCalledWith(NO_TAGS);
  });

  it("is worked from the keyboard: the arrows choose, Space ticks, the buttons submit", async () => {
    const user = userEvent.setup();
    const onSave = mount();
    screen.getByRole("radio", { name: "Add tags" }).focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: "No" })).toBeChecked();
    await user.keyboard("{ArrowDown}");
    screen.getByTestId("save-prc").focus();
    await user.keyboard(" ");
    screen.getByTestId("save-confirm").focus();
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenLastCalledWith(BOTH_TAGS);
  });
});
