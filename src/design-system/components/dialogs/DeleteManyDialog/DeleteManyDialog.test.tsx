import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import DeleteManyDialog from "./DeleteManyDialog";

describe("DeleteManyDialog", () => {
  const base = {
    open: true,
    onClose: () => {},
    title: "Delete 3 picked games?",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    testId: "probe",
  };

  it("is a destructive confirm", () => {
    const onConfirm = vi.fn();
    render(<DeleteManyDialog {...base} onConfirm={onConfirm} />);
    expect(screen.getByTestId("probe-title")).toHaveTextContent("Delete 3 picked games?");
    expect(screen.getByTestId("probe-confirm").className).toMatch(/MuiButton-colorError/);
    fireEvent.click(screen.getByTestId("probe-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows a failed delete in its error slot, and nothing there otherwise", () => {
    const { rerender } = render(<DeleteManyDialog {...base} onConfirm={() => {}} />);
    expect(screen.queryByTestId("probe-error")).toBeNull();
    rerender(<DeleteManyDialog {...base} onConfirm={() => {}} error="Storage is full." />);
    expect(screen.getByTestId("probe-error")).toHaveTextContent("Storage is full.");
    expect(screen.getByTestId("probe-error")).toHaveAttribute("role", "alert");
  });
});
