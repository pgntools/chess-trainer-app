import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import ExportCategoriesForm, { type ExportCategoriesFormProps } from "./ExportCategoriesForm";
import { COUNTS, NOTHING, READING, SHIPPED } from "./fixtures";

const mount = (props: Partial<ExportCategoriesFormProps> = {}) => {
  const onChange = vi.fn();
  render(<ExportCategoriesForm selection={NOTHING} onChange={onChange} counts={COUNTS} shippedCount={SHIPPED} testId="export" {...props} />);
  return { onChange };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ExportCategoriesForm", () => {
  it("names each box by its category and its count", () => {
    mount();
    expect(screen.getByRole("checkbox", { name: "Games (128)" })).not.toBeChecked();
    expect(screen.getByTestId("export-analyses-count")).toHaveTextContent("(42)");
  });

  it("says … while a store is read", () => {
    mount({ counts: READING });
    expect(screen.getByTestId("export-games-count")).toHaveTextContent("(…)");
  });

  it("keeps the shipped box off until Collections is ticked", () => {
    mount();
    expect(screen.getByRole("checkbox", { name: /shipped/ })).toBeDisabled();
  });

  it("ticks from the keyboard, as a patch", async () => {
    const { onChange } = mount({ selection: { ...NOTHING, collections: true } });
    screen.getByRole("checkbox", { name: /shipped/ }).focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith({ shippedCollections: true });
    await userEvent.click(screen.getByRole("checkbox", { name: /Games/ }));
    expect(onChange).toHaveBeenLastCalledWith({ games: true });
  });

  it("turns every box off while an export runs", () => {
    mount({ disabled: true });
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeDisabled();
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
