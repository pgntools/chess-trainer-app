import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import type { ReactNode } from "react";

import NumberCell from "./NumberCell";

const inRow = (cell: ReactNode) =>
  render(
    <Table>
      <TableBody>
        <TableRow>{cell}</TableRow>
      </TableBody>
    </Table>,
  );

describe("NumberCell", () => {
  it("writes the number as it is, pinned left to right", () => {
    inRow(<NumberCell value={-2850} testId="probe" />);
    expect(screen.getByTestId("probe")).toHaveTextContent("-2850");
    expect(screen.getByTestId("probe").querySelector("bdi")).toHaveAttribute("dir", "ltr");
  });

  it("formats it the caller's way", () => {
    inRow(<NumberCell value={2048} format={(value) => `${value / 1024} KB`} testId="probe" />);
    expect(screen.getByTestId("probe")).toHaveTextContent("2 KB");
  });

  it("reads a missing value as a dash, or the caller's text", () => {
    inRow(
      <>
        <NumberCell value={undefined} testId="a" />
        <NumberCell value={Number.NaN} empty="unknown" testId="b" />
      </>,
    );
    expect(screen.getByTestId("a")).toHaveTextContent("–");
    expect(screen.getByTestId("b")).toHaveTextContent("unknown");
  });
});
