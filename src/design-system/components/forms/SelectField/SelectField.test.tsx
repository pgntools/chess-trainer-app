import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import SelectField from "./SelectField";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("SelectField", () => {
  it("offers its choices after the “any” one, and reports the pick", () => {
    const onChange = vi.fn();
    render(<SelectField label="Opening" value="" onChange={onChange} options={OPTIONS} emptyOption="All" testId="probe" />);
    fireEvent.mouseDown(screen.getByRole("combobox"));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["All", "Alpha", "Beta"]);
    fireEvent.click(options[2]);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("shows the “any” choice's words while nothing is chosen", () => {
    render(<SelectField label="Opening" value="" onChange={() => {}} options={OPTIONS} emptyOption="All openings" testId="probe" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("All openings");
    expect(screen.getByTestId("probe").tagName).toBe("INPUT");
  });

  it("still shows a chosen value its options no longer hold", () => {
    render(<SelectField label="Opening" value="gone" onChange={() => {}} options={OPTIONS} testId="probe" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("gone");
  });

  it("is at least 160 px wide, or as wide as a container that is narrower (CTA-116)", () => {
    render(<SelectField label="Opening" value="a" onChange={() => {}} options={OPTIONS} testId="probe" />);
    // jsdom lays nothing out, so the floor is read off the rule emotion wrote.
    const css = [...document.querySelectorAll("style")].map((style) => style.textContent).join("");
    expect(css).toMatch(/min-width:\s*min\(160px,\s*100%\)/);
  });

  it("can put its test id on the visible select instead (CTA-113)", async () => {
    render(<SelectField label="Square" value="" onChange={() => {}} options={[{ value: "e6", label: "e6" }]} testIdOn="display" testId="probe" />);
    expect(screen.getByTestId("probe")).toHaveAttribute("role", "combobox");
  });
});
