import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import SaveAsCollectionDialog from "./SaveAsCollectionDialog";
import { DERIVED, FULL } from "./fixtures";

const mount = (initial = DERIVED, extra: { busy?: boolean; error?: string } = {}) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <SaveAsCollectionDialog open initial={initial} count={12} onSave={onSave} onClose={onClose} testId="probe" {...extra} />,
  );
  return { onSave, onClose, ...view };
};

describe("SaveAsCollectionDialog", () => {
  it("is a dialog named by its title, its field prefilled, focused and named, the count under it", async () => {
    mount();
    expect(screen.getByRole("dialog", { name: "Save as a collection" })).toBeInTheDocument();
    const field = screen.getByRole("textbox", { name: "Collection name" });
    expect(field).toHaveFocus();
    expect(field).toHaveValue(DERIVED);
    expect(screen.getByTestId("probe-count")).toHaveTextContent("12 games will be saved as a new collection of their own.");
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("saves the name, edited or not, and stays open — the write is the caller's", async () => {
    const user = userEvent.setup();
    const { onSave, onClose } = mount();
    await user.clear(screen.getByTestId("probe-input"));
    await user.keyboard("Capablanca — white{Enter}");
    expect(onSave).toHaveBeenCalledWith("Capablanca — white");
    // Not closed here: a failure is answered in the dialog.
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps Create collection off while the name is blank, however it is typed", async () => {
    const user = userEvent.setup();
    const { onSave } = mount("");
    expect(screen.getByTestId("probe-submit")).toBeDisabled();
    await user.keyboard("   {Enter}");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("caps the name at the collection-name limit", () => {
    mount(FULL);
    expect(screen.getByTestId("probe-input")).toHaveValue(FULL);
    expect(screen.getByTestId("probe-input")).toHaveAttribute("maxLength", "100");
  });

  it("shows a failed write's problem in the dialog", async () => {
    mount(DERIVED, { error: "The collection could not be created. Nothing was created." });
    expect(screen.getByRole("alert")).toHaveTextContent("The collection could not be created. Nothing was created.");
    await expectNoAxeViolations(screen.getByRole("dialog"));
  });

  it("is re-seeded every time it opens", () => {
    const { rerender } = mount("A");
    const props = { count: 12, onSave: () => {}, onClose: () => {}, testId: "probe" };
    rerender(<SaveAsCollectionDialog open={false} initial="B" {...props} />);
    rerender(<SaveAsCollectionDialog open initial="B" {...props} />);
    expect(screen.getByTestId("probe-input")).toHaveValue("B");
  });
});
