import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../test/axe";
import FenInput from "./FenInput";
import { FEN, PROBLEM } from "./fixtures";

describe("FenInput", () => {
  it("reads a FEN on Enter or the button, and not while blank", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(<FenInput label="Paste a FEN" submitLabel="Set position" value="" onChange={() => {}} onSubmit={onSubmit} error={null} testId="probe" />);
    expect(screen.getByRole("button", { name: "Set position" })).toBeDisabled();
    rerender(<FenInput label="Paste a FEN" submitLabel="Set position" value={FEN} onChange={() => {}} onSubmit={onSubmit} error={null} testId="probe" />);
    await user.click(screen.getByRole("textbox", { name: "Paste a FEN" }));
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Set position" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("probe-fen-input")).toHaveAttribute("dir", "ltr");
  });

  it("says what was wrong, describing the field", async () => {
    render(<FenInput label="Paste a FEN" submitLabel="Set position" value="x" onChange={() => {}} onSubmit={() => {}} error={PROBLEM} errorTestId="old-error" testId="probe" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not read this FEN.");
    expect(screen.getByTestId("old-error")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Paste a FEN" })).toHaveAttribute("aria-invalid", "true");
    await expectNoAxeViolations(document.body);
  });
});
