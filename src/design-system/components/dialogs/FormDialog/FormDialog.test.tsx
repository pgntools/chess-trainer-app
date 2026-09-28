import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import FormDialog, { type FormDialogProps } from "./FormDialog";

const renderForm = (props: Partial<FormDialogProps> = {}) => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <FormDialog
      open
      onClose={onClose}
      onSubmit={onSubmit}
      title="Name"
      submitLabel="Save"
      cancelLabel="Cancel"
      testId="probe"
      {...props}
    >
      <input data-testid="name" defaultValue="x" />
      <textarea data-testid="comment" defaultValue="y" />
      <input type="checkbox" data-testid="tick" />
    </FormDialog>,
  );
  return { onSubmit, onClose };
};

describe("FormDialog", () => {
  it("submits from the Save button", () => {
    const { onSubmit } = renderForm();
    fireEvent.submit(screen.getByTestId("probe-form"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe-submit")).toHaveAttribute("type", "submit");
  });

  it("submits on Enter in a one-line field", () => {
    const { onSubmit } = renderForm();
    fireEvent.keyDown(screen.getByTestId("name"), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("takes Enter as a new line in a multiline field, and submits on Ctrl or ⌘ + Enter", () => {
    const { onSubmit } = renderForm();
    fireEvent.keyDown(screen.getByTestId("comment"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId("comment"), { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(screen.getByTestId("comment"), { key: "Enter", metaKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("does not submit on Shift + Enter in a one-line field, nor on Enter mid-composition", () => {
    const { onSubmit } = renderForm();
    fireEvent.keyDown(screen.getByTestId("name"), { key: "Enter", shiftKey: true });
    fireEvent.keyDown(screen.getByTestId("name"), { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits by no route while there is nothing to save", () => {
    const { onSubmit } = renderForm({ submitDisabled: true });
    expect(screen.getByTestId("probe-submit")).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId("name"), { key: "Enter" });
    fireEvent.keyDown(screen.getByTestId("comment"), { key: "Enter", ctrlKey: true });
    fireEvent.submit(screen.getByTestId("probe-form"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("holds while busy: no submit, no cancel, no Escape", () => {
    const { onSubmit, onClose } = renderForm({ busy: true });
    expect(screen.getByTestId("probe-cancel")).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId("name"), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cancels", () => {
    const { onClose } = renderForm();
    fireEvent.click(screen.getByTestId("probe-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes its submit button's own test id (CTA-113)", () => {
    const { onSubmit } = renderForm({ submitTestId: "old-save" });
    fireEvent.click(screen.getByTestId("old-save"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
