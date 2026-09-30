import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import TableFrame from "./TableFrame";

const body = (
  <>
    <TableHead>
      <TableRow>
        <TableCell>Name</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>Tal</TableCell>
      </TableRow>
    </TableBody>
  </>
);

describe("TableFrame", () => {
  it("is the scrolling region around a small table with a sticky header", () => {
    render(
      <TableFrame testId="probe" ariaLabel="Games">
        {body}
      </TableFrame>,
    );
    expect(screen.getByTestId("probe")).toContainElement(screen.getByTestId("probe-table"));
    expect(screen.getByRole("table", { name: "Games" })).toHaveClass("MuiTable-stickyHeader");
    expect(screen.getByTestId("probe-table")).toHaveClass("MuiTable-root");
    expect(screen.getByRole("cell", { name: "Tal" })).toHaveClass("MuiTableCell-sizeSmall");
  });

  it("marks its density and can drop the sticky header", () => {
    render(
      <TableFrame testId="probe" ariaLabel="Games" density="dense" stickyHeader={false}>
        {body}
      </TableFrame>,
    );
    expect(screen.getByTestId("probe-table")).toHaveAttribute("data-density", "dense");
    expect(screen.getByTestId("probe-table")).not.toHaveClass("MuiTable-stickyHeader");
  });

  it("puts what comes after the table inside the scrolling region", () => {
    render(
      <TableFrame testId="probe" ariaLabel="Games" after={<p data-testid="note">note</p>}>
        {body}
      </TableFrame>,
    );
    expect(screen.getByTestId("probe")).toContainElement(screen.getByTestId("note"));
  });

  it("is named by a visible caption instead of a label, if the caller gives one (CTA-111)", () => {
    render(
      <TableFrame testId="probe" caption="Recent games">
        {body}
      </TableFrame>,
    );
    expect(screen.getByRole("table", { name: "Recent games" })).toBeInTheDocument();
    expect(screen.getByTestId("probe-caption")).toBeVisible();
  });

  it("is a named region the keyboard can reach and scroll, and marks itself busy while its rows are read (CTA-111)", () => {
    render(
      <TableFrame testId="probe" ariaLabel="Games" busy>
        {body}
      </TableFrame>,
    );
    const region = screen.getByRole("region", { name: "Games" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("table", { name: "Games" })).toHaveAttribute("aria-busy", "true");
  });

  it("takes no name at all only by failing to compile (CTA-111)", () => {
    // @ts-expect-error — a table is named by an ariaLabel or a caption.
    const nameless = <TableFrame testId="probe">{body}</TableFrame>;
    // @ts-expect-error — one or the other, not both.
    const both = <TableFrame testId="probe" ariaLabel="Games" caption="Games">{body}</TableFrame>;
    expect([nameless, both]).toHaveLength(2);
  });
});
