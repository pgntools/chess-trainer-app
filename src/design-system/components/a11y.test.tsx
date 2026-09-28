import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "@mui/material/Button";

import { BaseDialog, ConfirmDialog } from "./dialogs";
import { StatusText } from "./feedback";
import { CheckboxField, SelectField, SliderField, SwitchField } from "./forms";
import { PickerList } from "./lists";
import { LoadingLine } from "./states";
import { PanelTabs } from "./tabs";
import { IconAction, ToggleIconAction } from "./toolbars";

/*
  The base tier's accessibility contract (CTA-111, ACCESSIBILITY.md,
  docs/design/hierarchy.md's "Accessibility"): what a component must be
  named by, how it announces, and that the keyboard operates it — asked by
  role and name, driven by the keyboard. Each component's own test covers
  the rest; the gallery's every-theme tests run axe over every demo.
*/

describe("an accessible name is required", () => {
  it("by the types: none of these compiles without the words that name it", () => {
    const noop = () => {};
    const unnamed = [
      // @ts-expect-error — an icon-only action is named by its label.
      <IconAction onClick={noop} testId="t">x</IconAction>,
      // @ts-expect-error — so is the Save-style toggle.
      <ToggleIconAction onClick={noop} active={false} testId="t">x</ToggleIconAction>,
      // @ts-expect-error — a dialog is named by its title.
      <BaseDialog open onClose={noop} testId="t" />,
      // @ts-expect-error — and it cannot be switched off with `undefined`.
      <BaseDialog open onClose={noop} title={undefined} testId="t" />,
      // @ts-expect-error — a switch by its label.
      <SwitchField checked onChange={noop} testId="t" />,
      // @ts-expect-error — a checkbox by its label.
      <CheckboxField checked onChange={noop} testId="t" />,
      // @ts-expect-error — a slider by its label.
      <SliderField value={1} onChange={noop} min={0} max={2} testId="t" />,
      // @ts-expect-error — a select by its label.
      <SelectField value="" onChange={noop} options={[]} testId="t" />,
      // @ts-expect-error — a list of choices by its ariaLabel.
      <PickerList items={[]} value={undefined} onChange={noop} testId="t" />,
    ];
    expect(unnamed).toHaveLength(9);
  });

  it("and each is found by its role and that name", () => {
    render(
      <>
        <IconAction label="Flip the board" onClick={vi.fn()} testId="flip">
          ↻
        </IconAction>
        <SwitchField label="Engine" checked onChange={vi.fn()} testId="engine" />
        <CheckboxField label="Show arrows" checked={false} onChange={vi.fn()} testId="arrows" />
        <SliderField label="Depth" value={12} onChange={vi.fn()} min={1} max={24} testId="depth" />
        <SelectField label="Opening" value="" onChange={vi.fn()} options={[{ value: "b20", label: "Sicilian" }]} emptyOption="Any" testId="opening" />
      </>,
    );
    expect(screen.getByRole("button", { name: "Flip the board" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Engine" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Show arrows" })).not.toBeChecked();
    expect(screen.getByRole("slider", { name: "Depth" })).toHaveValue("12");
    expect(screen.getByRole("combobox", { name: "Opening" })).toBeInTheDocument();
  });
});

describe("live regions", () => {
  it("announce an outcome politely, an error at once", () => {
    const { rerender } = render(
      <StatusText tone="success" testId="s">
        Saved.
      </StatusText>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    rerender(
      <StatusText tone="error" testId="s">
        The save failed.
      </StatusText>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The save failed.");
  });

  it("announce a store still being read", () => {
    render(<LoadingLine testId="l">Reading your games…</LoadingLine>);
    expect(screen.getByRole("status")).toHaveTextContent("Reading your games…");
  });

  it("mark a busy confirm button, its spinner hidden from the name", () => {
    render(
      <ConfirmDialog open onClose={vi.fn()} onConfirm={vi.fn()} title="Delete?" confirmLabel="Delete" cancelLabel="Cancel" busy testId="c" />,
    );
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});

describe("the keyboard", () => {
  it("presses an icon action with Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconAction label="Flip the board" onClick={onClick} testId="flip">
        ↻
      </IconAction>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Flip the board" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("ticks a checkbox and a switch with Space, and reads a partial checkbox as mixed", async () => {
    const user = userEvent.setup();
    const onArrows = vi.fn();
    const onEngine = vi.fn();
    render(
      <>
        <CheckboxField label="Show arrows" checked={false} indeterminate onChange={onArrows} testId="arrows" />
        <SwitchField label="Engine" checked={false} onChange={onEngine} testId="engine" />
      </>,
    );
    expect(screen.getByRole("checkbox", { name: "Show arrows" })).toBePartiallyChecked();
    await user.tab();
    await user.keyboard(" ");
    expect(onArrows).toHaveBeenCalledWith(true);
    await user.tab();
    await user.keyboard(" ");
    expect(onEngine).toHaveBeenCalledWith(true);
  });

  it("moves a slider with the arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SliderField label="Depth" value={12} onChange={onChange} min={1} max={24} testId="depth" />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(13);
  });

  it("chooses from a select without a pointer", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField
        label="Opening"
        value=""
        onChange={onChange}
        options={[
          { value: "b20", label: "Sicilian" },
          { value: "c00", label: "French" },
        ]}
        emptyOption="Any"
        testId="opening"
      />,
    );
    await user.tab();
    await user.keyboard("{ArrowDown}");
    const french = await screen.findByRole("option", { name: "French" });
    french.focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("c00");
  });

  it("picks from a list of choices with Enter, each choice an item of the named list", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PickerList
        items={[
          { id: null, label: "Unfiled" },
          { id: "openings", label: "Openings" },
        ]}
        value={null}
        onChange={onChange}
        ariaLabel="Folder"
        testId="p"
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Openings" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("openings");
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PanelTabs
        tabs={[
          { id: "moves", label: "Moves" },
          { id: "engine", label: "Engine" },
        ]}
        value="moves"
        onChange={onChange}
        ariaLabel="Panel"
        testId="tabs"
      />,
    );
    await user.tab();
    expect(screen.getByRole("tab", { name: "Moves" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Engine" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("engine");
  });
});

/** A button that opens a dialog, as a screen's would. */
function Opener() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Rename</Button>
      <BaseDialog open={open} onClose={() => setOpen(false)} title="Rename the folder" testId="d" actions={<Button onClick={() => setOpen(false)}>Done</Button>}>
        <input aria-label="Name" />
      </BaseDialog>
    </>
  );
}

describe("a dialog", () => {
  it("is named by its title, keeps the focus inside while open, and gives it back to what opened it", async () => {
    const user = userEvent.setup();
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Rename" });
    await user.tab();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Rename the folder" });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    // No way out by Tab alone: the focus cycles inside.
    for (let step = 0; step < 4; step += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(opener).toHaveFocus();
  });
});
