import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import SuggestAutocomplete from "./SuggestAutocomplete";

const OPTIONS = [
  { value: "/library/tal", label: "Tal", group: "Library" },
  { value: "/repertoires/caro", label: "Caro-Kann", group: "Repertoires" },
];

const Probe = ({ onPick, onSubmit }: { onPick?: (value: string) => void; onSubmit?: () => void }) => {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <SuggestAutocomplete label="The address" value={value} onChange={setValue} options={OPTIONS.filter((option) => option.label.toLowerCase().includes(value.toLowerCase()))} onPick={(option) => onPick?.(option.value)} dir="ltr" testId="probe" />
    </form>
  );
};

describe("SuggestAutocomplete", () => {
  it("is free text: what is typed stays, whether or not a suggestion fits", async () => {
    const user = userEvent.setup();
    render(<Probe />);
    await user.type(screen.getByRole("combobox", { name: "The address" }), "/library/anything");
    expect(screen.getByRole("combobox", { name: "The address" })).toHaveValue("/library/anything");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("offers the suggestions grouped, and a pick puts the option's value in the field", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Probe onPick={onPick} />);
    await user.click(screen.getByRole("combobox", { name: "The address" }));
    const listbox = screen.getByRole("listbox");
    expect(listbox.querySelectorAll(".MuiAutocomplete-groupLabel")).toHaveLength(2);
    await user.click(within(listbox).getByRole("option", { name: "Caro-Kann" }));
    expect(screen.getByRole("combobox", { name: "The address" })).toHaveValue("/repertoires/caro");
    expect(onPick).toHaveBeenCalledWith("/repertoires/caro");
  });

  it("leaves Enter to the form while nothing is highlighted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Probe onSubmit={onSubmit} />);
    await user.type(screen.getByRole("combobox", { name: "The address" }), "/library/tal{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("passes axe, open", async () => {
    const user = userEvent.setup();
    render(<Probe />);
    await user.click(screen.getByRole("combobox", { name: "The address" }));
    await expectNoAxeViolations();
  });
});
