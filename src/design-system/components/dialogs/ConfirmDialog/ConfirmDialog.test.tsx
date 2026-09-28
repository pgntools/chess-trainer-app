import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import ConfirmDialog, { type ConfirmDialogProps } from "./ConfirmDialog";

const renderConfirm = (props: Partial<ConfirmDialogProps> = {}) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete?"
      message="It cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      testId="probe"
      {...props}
    />,
  );
  return { onClose, onConfirm };
};

describe("ConfirmDialog", () => {
  it("asks, and answers through its two buttons", () => {
    const { onClose, onConfirm } = renderConfirm();
    expect(screen.getByTestId("probe-message")).toHaveTextContent("It cannot be undone.");
    fireEvent.click(screen.getByTestId("probe-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("probe-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("paints a destructive confirm in the error colour, contained by default", () => {
    renderConfirm({ tone: "destructive" });
    const confirm = screen.getByTestId("probe-confirm");
    expect(confirm.className).toMatch(/MuiButton-contained/);
    expect(confirm.className).toMatch(/MuiButton-colorError/);
  });

  it("takes a text confirm", () => {
    renderConfirm({ tone: "destructive", confirmVariant: "text" });
    expect(screen.getByTestId("probe-confirm").className).toMatch(/MuiButton-text/);
  });

  it("holds both buttons and ignores Escape while busy", () => {
    const { onClose } = renderConfirm({ busy: true });
    expect(screen.getByTestId("probe-confirm")).toBeDisabled();
    expect(screen.getByTestId("probe-cancel")).toBeDisabled();
    expect(screen.getByTestId("probe-confirm")).toHaveAttribute("aria-busy", "true");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("turns only the confirm off while its choice is not valid", () => {
    renderConfirm({ confirmDisabled: true });
    expect(screen.getByTestId("probe-confirm")).toBeDisabled();
    expect(screen.getByTestId("probe-cancel")).toBeEnabled();
  });
});
