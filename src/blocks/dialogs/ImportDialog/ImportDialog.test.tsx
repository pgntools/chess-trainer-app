import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { CAPS, CLASHING_APP, DUMP, EMPTY_APP, TIGHT_CAPS } from "./fixtures";
import ImportDialog, { type ImportDialogProps } from "./ImportDialog";

const mount = (props: Partial<ImportDialogProps> = {}) => {
  const onCancel = vi.fn();
  const onImport = vi.fn();
  render(
    <ImportDialog fileName="export.zip" dump={DUMP} current={CLASHING_APP} caps={CAPS} onCancel={onCancel} onImport={onImport} testId="imp" {...props} />,
  );
  return { onCancel, onImport };
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("ImportDialog", () => {
  it("is a dialog named by the file, every category the zip holds ticked with its count", () => {
    mount();
    expect(screen.getByTestId("imp-dialog")).toContainElement(screen.getByRole("dialog", { name: "Import export.zip" }));
    expect(screen.getByRole("checkbox", { name: "Games (2)" })).toBeChecked();
    expect(screen.getByTestId("imp-collections-count")).toHaveTextContent("(1)");
    expect(screen.getByTestId("imp-shipped")).toHaveTextContent("2 built-in collections");
  });

  it("offers Merge, Override or Skip for a clashing category, a named group described by the choice", () => {
    mount();
    const group = screen.getByTestId("imp-analyses-choice");
    expect(group).toHaveRole("radiogroup");
    expect(group).toHaveAccessibleName("2 folders are already here:");
    expect(within(group).getByRole("radio", { name: "Merge" })).toBeChecked();
    expect(group).toHaveAccessibleDescription(/stays as it is/);
  });

  it("lists the clashing folders, each opening to a choice of its own, the preview following", async () => {
    mount();
    const white = screen.getByTestId("imp-repertoires-conflict-1");
    expect(white).toHaveTextContent("White");
    expect(white).toHaveTextContent("1 in the file · 1 here");
    const toggle = within(white).getByRole("button", { name: "Choose for this folder" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await userEvent.click(within(screen.getByTestId("imp-repertoires-conflict-1-choice")).getByRole("radio", { name: "Override" }));
    expect(screen.getByTestId("imp-repertoires-conflict-1-effective")).toHaveTextContent("Override");
    expect(screen.getByTestId("imp-repertoires-preview")).toHaveTextContent("replace 1");
  });

  it("warns of the played games' cap and refuses a category past its own", () => {
    mount({ current: EMPTY_APP, caps: TIGHT_CAPS });
    expect(screen.getByTestId("imp-games-drops")).toHaveTextContent("the oldest game will be dropped");
    expect(screen.getByTestId("imp-repertoires-refused")).toHaveTextContent("past the limit of 1");
    expect(screen.queryByTestId("imp-repertoires-preview")).toBeNull();
  });

  it("hands back the choices on Import, and writes nothing itself", async () => {
    const { onImport, onCancel } = mount();
    await userEvent.click(screen.getByRole("checkbox", { name: /Games/ }));
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({ games: expect.objectContaining({ ticked: false }) }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("keeps Import off when every category is unticked", async () => {
    mount({ dump: { ...DUMP, categories: ["games"] } });
    await userEvent.click(screen.getByRole("checkbox", { name: /Games/ }));
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /Analyses/ })).toBeDisabled();
  });

  it("passes axe", async () => {
    mount();
    await expectNoAxeViolations();
  });
});
