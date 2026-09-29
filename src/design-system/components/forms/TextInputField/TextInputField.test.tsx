import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import TextInputField from "./TextInputField";

function Host({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <TextInputField
      label="Font family"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      helperText="A CSS font stack."
      placeholder="Roboto, sans-serif"
      dir="ltr"
      testId="probe"
    />
  );
}

describe("TextInputField", () => {
  it("is named by its label, described by its caption, and reports what is typed", async () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Font family" });
    expect(input).toBe(screen.getByTestId("probe"));
    expect(input).toHaveAccessibleDescription("A CSS font stack.");
    expect(input).toHaveAttribute("placeholder", "Roboto, sans-serif");
    expect(input).toHaveAttribute("dir", "ltr");
    await userEvent.type(input, "Inter");
    expect(onChange).toHaveBeenLastCalledWith("Inter");
    expect(input).toHaveValue("Inter");
  });

  it("marks a value it does not take, and turns off", () => {
    const { rerender } = render(<TextInputField label="Id" value="Bad id" onChange={() => {}} error helperText="Lower-case words." testId="probe" />);
    expect(screen.getByRole("textbox", { name: "Id" })).toHaveAttribute("aria-invalid", "true");
    rerender(<TextInputField label="Id" value="ocean" onChange={() => {}} disabled testId="probe" />);
    expect(screen.getByRole("textbox", { name: "Id" })).toBeDisabled();
  });

  it("passes axe", async () => {
    render(<TextInputField label="Name" value="Ocean" onChange={() => {}} helperText="Its English name." testId="probe" />);
    await expectNoAxeViolations();
  });
});
