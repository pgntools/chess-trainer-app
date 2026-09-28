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
      <TableFrame testId="probe" density="dense" stickyHeader={false}>
        {body}
      </TableFrame>,
    );
    expect(screen.getByTestId("probe-table")).toHaveAttribute("data-density", "dense");
    expect(screen.getByTestId("probe-table")).not.toHaveClass("MuiTable-stickyHeader");
  });

  it("puts what comes after the table inside the scrolling region", () => {
    render(
      <TableFrame testId="probe" after={<p data-testid="note">note</p>}>
        {body}
      </TableFrame>,
    );
    expect(screen.getByTestId("probe")).toContainElement(screen.getByTestId("note"));
  });
});
