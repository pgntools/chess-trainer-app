import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CopyField from "./CopyField";

const WORDS = { copyLabel: "Copy", copiedLabel: "Copied.", failedLabel: "Could not copy." };

describe("CopyField", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is a labelled, read-only, left-to-right field with a named copy button", () => {
    render(<CopyField label="FEN" value="8/8 w" {...WORDS} testId="probe" />);
    const field = screen.getByRole("textbox", { name: "FEN" });
    expect(field).toBe(screen.getByTestId("probe"));
    expect(field).toHaveAttribute("readonly");
    expect(field).toHaveAttribute("dir", "ltr");
    expect(field).toHaveValue("8/8 w");
    expect(screen.getByRole("button", { name: "Copy: FEN" })).toBe(screen.getByTestId("probe-copy"));
  });

  it("copies from the keyboard and says so as a status", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CopyField label="FEN" value="8/8 w" {...WORDS} testId="probe" />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Copy: FEN" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(writeText).toHaveBeenCalledWith("8/8 w");
    expect(await screen.findByRole("status")).toHaveTextContent("Copied.");
  });

  it("says a refused copy as an alert", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<CopyField label="FEN" value="8/8 w" {...WORDS} testId="probe" />);
    await user.click(screen.getByTestId("probe-copy"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not copy.");
  });

  it("turns the copy off with its reason, the value still shown", () => {
    render(<CopyField label="FEN" value="8/8 w" disabled disabledHint="Not legal yet." {...WORDS} testId="probe" />);
    expect(screen.getByTestId("probe-copy")).toBeDisabled();
    expect(screen.getByTestId("probe-copy-disabled")).toHaveTextContent("Not legal yet.");
    expect(screen.getByTestId("probe")).toHaveValue("8/8 w");
  });
});
