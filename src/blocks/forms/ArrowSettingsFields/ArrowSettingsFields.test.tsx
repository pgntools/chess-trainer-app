import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import ArrowSettingsFields from "./ArrowSettingsFields";
import { EVAL_AND_GAMES, UNTAGGED } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ArrowSettingsFields", () => {
  it("offers every source and palette, each named, as two named groups", async () => {
    render(<ArrowSettingsFields widthSource="none" onWidthSourceChange={() => {}} palette="classic" onPaletteChange={() => {}} testId="probe" />);
    expect(screen.getByRole("radiogroup", { name: i18n.t("analysis.arrows.widthSource") })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: i18n.t("analysis.arrows.palette") })).toBeInTheDocument();
    expect(screen.getByTestId("probe-width-none")).toBeChecked();
    expect(screen.getByTestId("probe-palette-classic")).toBeChecked();
    await expectNoAxeViolations(document.body);
  });

  it("turns off a source the tree lacks, and says when the chosen one is gone", () => {
    const { rerender } = render(<ArrowSettingsFields widthSource="eval" onWidthSourceChange={() => {}} available={EVAL_AND_GAMES} palette="classic" onPaletteChange={() => {}} testId="probe" />);
    expect(screen.getByTestId("probe-width-prc")).toBeDisabled();
    expect(screen.queryByTestId("probe-width-drawn-as-none")).toBeNull();
    rerender(<ArrowSettingsFields widthSource="eval" onWidthSourceChange={() => {}} available={UNTAGGED} palette="classic" onPaletteChange={() => {}} testId="probe" />);
    expect(screen.getByRole("status")).toHaveTextContent(i18n.t("analysis.arrows.drawnAsNone"));
  });

  it("chooses with the arrow keys", async () => {
    const user = userEvent.setup();
    const onPaletteChange = vi.fn();
    render(<ArrowSettingsFields widthSource="none" onWidthSourceChange={() => {}} palette="classic" onPaletteChange={onPaletteChange} testId="probe" />);
    screen.getByTestId("probe-palette-classic").focus();
    await user.keyboard("{ArrowDown}");
    expect(onPaletteChange).toHaveBeenCalledWith("lichess");
  });
});
