import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import ColorField, { type ColorFieldProps } from "./ColorField";
import { hexOf, parseColor, withPickedColor } from "./color";

const PROPS = {
  label: "Primary",
  pickerLabel: "Pick a colour for Primary",
  invalidText: "Not a colour — #rgb, #rrggbb, #rrggbbaa or rgba().",
  testId: "probe",
} as const;

/** A field that keeps its own value, as a host does. */
function Host({ initial, onChange, ...props }: Partial<ColorFieldProps> & { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <ColorField
      {...PROPS}
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("ColorField", () => {
  it("names its text input by its label and its swatch by the picker's words", () => {
    render(<ColorField {...PROPS} value="#2563eb" onChange={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Primary" })).toHaveValue("#2563eb");
    expect(screen.getByLabelText("Pick a colour for Primary")).toBe(screen.getByTestId("probe-picker"));
    expect(screen.getByTestId("probe-picker")).toHaveValue("#2563eb");
    // Machine words in a panel that may mirror: the attribute.
    expect(screen.getByTestId("probe")).toHaveAttribute("dir", "ltr");
  });

  it("reports a typed colour in every form it takes, as typed", async () => {
    const onChange = vi.fn();
    render(<Host initial="#2563eb" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Primary" });
    for (const typed of ["#abc", "#abcd", "#aabbcc", "#aabbcc80", "rgb(1, 2, 3)", "rgba(155, 199, 0, 0.41)"]) {
      await userEvent.clear(input);
      await userEvent.type(input, typed.replace(/[[{]/g, "$&$&"));
      expect(onChange).toHaveBeenLastCalledWith(typed);
    }
  });

  it("says a text that is no colour, and reports nothing until it is one", async () => {
    const onChange = vi.fn();
    render(<Host initial="#2563eb" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Primary" });
    await userEvent.clear(input);
    await userEvent.type(input, "blue");
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(PROPS.invalidText);
    await userEvent.clear(input);
    await userEvent.type(input, "#00f");
    expect(onChange).toHaveBeenLastCalledWith("#00f");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("takes the picker's colour, keeping a translucent colour's alpha", () => {
    const onChange = vi.fn();
    const { unmount } = render(<Host initial="#2563eb" onChange={onChange} />);
    fireEvent.change(screen.getByTestId("probe-picker"), { target: { value: "#ff0000" } });
    expect(onChange).toHaveBeenLastCalledWith("#ff0000");
    expect(screen.getByRole("textbox", { name: "Primary" })).toHaveValue("#ff0000");
    unmount();

    render(<Host initial="rgba(155, 199, 0, 0.41)" onChange={onChange} />);
    expect(screen.getByTestId("probe-picker")).toHaveValue("#9bc700");
    fireEvent.change(screen.getByTestId("probe-picker"), { target: { value: "#000000" } });
    expect(onChange).toHaveBeenLastCalledWith("rgba(0, 0, 0, 0.41)");
  });

  it("follows a new value from outside — an undo — over what was typed", async () => {
    const { rerender } = render(<ColorField {...PROPS} value="#2563eb" onChange={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Primary" });
    await userEvent.type(input, "zz");
    rerender(<ColorField {...PROPS} value="#111111" onChange={() => {}} />);
    expect(input).toHaveValue("#111111");
  });

  it("describes the input by its caption, in its tone", () => {
    render(<ColorField {...PROPS} value="#2563eb" onChange={() => {}} help="5.17:1 on the paper — passes AA" helpTone="success" />);
    expect(screen.getByRole("textbox", { name: "Primary" })).toHaveAccessibleDescription("5.17:1 on the paper — passes AA");
  });

  it("turns off, the swatch with it", () => {
    render(<ColorField {...PROPS} value="#2563eb" onChange={() => {}} disabled />);
    expect(screen.getByRole("textbox", { name: "Primary" })).toBeDisabled();
    expect(screen.getByTestId("probe-picker")).toBeDisabled();
  });

  it("is reached by the keyboard — the swatch, then the text — and passes axe", async () => {
    render(<ColorField {...PROPS} value="#2563eb" onChange={() => {}} help="A caption." />);
    await userEvent.tab();
    expect(screen.getByTestId("probe-picker")).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("textbox", { name: "Primary" })).toHaveFocus();
    await expectNoAxeViolations();
  });
});

describe("the colours ColorField reads", () => {
  it("reads every form it takes, and nothing else", () => {
    expect(parseColor("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor("#aabbcc80")).toEqual({ r: 170, g: 187, b: 204, a: 0.502 });
    expect(parseColor(" rgba(155, 199, 0, 0.41) ")).toEqual({ r: 155, g: 199, b: 0, a: 0.41 });
    expect(parseColor("rgb(1,2,3)")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    for (const text of ["", "blue", "#abcde", "#ggg", "rgb(256, 0, 0)", "rgba(0, 0, 0)", "rgba(0, 0, 0, 2)", "hsl(0, 0%, 0%)"]) {
      expect(parseColor(text), text).toBeNull();
    }
  });

  it("writes the picker's hex, and keeps an alpha", () => {
    expect(hexOf({ r: 1, g: 171, b: 255, a: 0.5 })).toBe("#01abff");
    expect(withPickedColor("#2563eb", "#ff0000")).toBe("#ff0000");
    expect(withPickedColor("#2563eb80", "#ff0000")).toBe("rgba(255, 0, 0, 0.502)");
  });
});
