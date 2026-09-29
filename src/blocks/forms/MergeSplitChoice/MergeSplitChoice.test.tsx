import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { SOME_SKIPPED, UNMERGEABLE } from "./fixtures";
import MergeSplitChoice from "./MergeSplitChoice";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("MergeSplitChoice", () => {
  it("counts the games, says what was left out, and describes each choice", async () => {
    render(<MergeSplitChoice labelKey="repertoires.choice" testId="probe" {...SOME_SKIPPED} onMerge={() => {}} onSplit={() => {}} problem={null} />);
    expect(screen.getByTestId("probe")).toHaveTextContent("This PGN holds 12 games");
    expect(screen.getByTestId("probe-skipped")).toHaveTextContent("2 games have no moves");
    expect(screen.getByRole("button", { name: "Merge into one repertoire" })).toHaveAccessibleDescription(/One tree/);
    expect(screen.getByRole("button", { name: "Split into 12 repertoires" })).toHaveAccessibleDescription(/Each game becomes/);
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("chooses from the keyboard", async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn();
    const onSplit = vi.fn();
    render(<MergeSplitChoice labelKey="repertoires.choice" testId="probe" {...SOME_SKIPPED} onMerge={onMerge} onSplit={onSplit} problem={null} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onMerge).toHaveBeenCalledTimes(1);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onSplit).toHaveBeenCalledTimes(1);
  });

  it("turns Merge off when the games do not share a start, offers no Split without one, and shows a problem as an alert", () => {
    render(<MergeSplitChoice labelKey="repertoires.choice" testId="probe" {...UNMERGEABLE} onMerge={() => {}} problem="No room." />);
    expect(screen.getByTestId("probe-merge")).toBeDisabled();
    expect(screen.getByTestId("probe-merge")).toHaveAccessibleDescription(/different positions/);
    expect(screen.queryByTestId("probe-split")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("No room.");
  });
});
