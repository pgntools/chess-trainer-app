import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import NavDrawer from "./NavDrawer";

/** A button and the sheet it opens — the shape every caller has. */
const Harness = ({ id }: { id?: string } = {}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-controls={id}>
        Open navigation
      </button>
      <NavDrawer open={open} onClose={() => setOpen(false)} label="Main navigation" id={id} testId="probe">
        <nav aria-label="Main navigation">
          <a href="/openings">Openings explorer</a>
        </nav>
      </NavDrawer>
    </>
  );
};

describe("NavDrawer", () => {
  it("is nothing until it is opened, and is then a named modal dialog", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByTestId("probe")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    const sheet = await screen.findByRole("dialog", { name: "Main navigation" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(sheet).toHaveAttribute("data-testid", "probe");
    expect(screen.getByRole("link", { name: "Openings explorer" })).toBeInTheDocument();
  });

  it("carries the id its opener points at", async () => {
    const user = userEvent.setup();
    render(<Harness id="shell-nav" />);
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(await screen.findByRole("dialog", { name: "Main navigation" })).toHaveAttribute("id", "shell-nav");
  });

  it("keeps the focus while open, and hands it back to its opener on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open navigation" });
    await user.click(opener);
    await screen.findByRole("dialog", { name: "Main navigation" });

    // The focus moved into the sheet — it is no longer on the page behind it.
    expect(opener).not.toHaveFocus();

    // The sheet slides out, so it is gone a transition later, not at once.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it("cannot be nameless (CTA-111)", () => {
    const nameless = (
      // @ts-expect-error — a modal dialog's label is required.
      <NavDrawer open onClose={() => {}} testId="probe">
        nothing
      </NavDrawer>
    );
    expect(nameless).toBeTruthy();
  });

  it("passes an accessibility audit while open", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await screen.findByRole("dialog", { name: "Main navigation" });
    await expectNoAxeViolations();
  });
});
