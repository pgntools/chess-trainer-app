import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";

import LoadingTableRow from "./LoadingTableRow";

describe("LoadingTableRow", () => {
  it("spans every column, busy, with a status line and a spinner", () => {
    render(
      <Table>
        <TableBody>
          <LoadingTableRow colSpan={4} testId="probe">
            Reading…
          </LoadingTableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Reading…");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("cell")).toHaveAttribute("colspan", "4");
  });
});
