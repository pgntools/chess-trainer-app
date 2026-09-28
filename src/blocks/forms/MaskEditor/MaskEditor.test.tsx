import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { MASK_PRESETS } from "../../../lib/pieceMask";
import { expectNoAxeViolations } from "../../../test/axe";
import { CUSTOM, NON_PAWNS } from "./fixtures";
import MaskEditor, { type MaskEditorProps } from "./MaskEditor";

const mount = (props: Partial<MaskEditorProps> = {}) => {
  const handlers = { onMaskChange: vi.fn(), onNotationChange: vi.fn(), onShowLinesChange: vi.fn() };
  render(<MaskEditor mask={NON_PAWNS} notation showLines={false} testId="mask" {...handlers} {...props} />);
  return handlers;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("MaskEditor", () => {
  it("presses the preset the mask is, in a group named by its label", () => {
    mount();
    expect(screen.getByTestId("mask-preset-nonPawns")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Masking policy" })).toBe(screen.getByTestId("mask-presets"));
  });

  it("presses nothing for a custom mask", () => {
    mount({ mask: CUSTOM });
    for (const id of ["identity", "nonPawns", "allIdentical"]) {
      expect(screen.getByTestId(`mask-preset-${id}`)).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("hands back a preset's mask", async () => {
    const { onMaskChange } = mount();
    await userEvent.click(screen.getByTestId("mask-preset-allIdentical"));
    expect(onMaskChange).toHaveBeenCalledWith(MASK_PRESETS.allIdentical);
  });

  it("offers each piece only its own colour's six types, and hands back the edited mask", async () => {
    const { onMaskChange } = mount({ mask: MASK_PRESETS.identity });
    const black = within(screen.getByRole("group", { name: "Black" }));
    await userEvent.click(black.getByRole("combobox", { name: "Queen" }));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => option.getAttribute("data-value"))).toEqual(["bK", "bQ", "bR", "bB", "bN", "bP"]);
    await userEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Rook" }));
    expect(onMaskChange).toHaveBeenCalledWith(CUSTOM);
  });

  it("switches the notation and the lines, each described by what it hides", async () => {
    const { onNotationChange, onShowLinesChange } = mount();
    const notation = screen.getByRole("switch", { name: "Hide masked pieces in the notation" });
    expect(notation).toBeChecked();
    expect(notation).toHaveAccessibleDescription(/written as coordinates/);
    await userEvent.click(notation);
    expect(onNotationChange).toHaveBeenCalledWith(false);
    await userEvent.click(screen.getByTestId("mask-setting-lines"));
    expect(onShowLinesChange).toHaveBeenCalledWith(true);
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
