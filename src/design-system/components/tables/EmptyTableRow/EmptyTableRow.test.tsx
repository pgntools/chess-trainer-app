import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";

import EmptyTableRow from "./EmptyTableRow";

describe("EmptyTableRow", () => {
  it("spans every column with the caller's note", () => {
    render(
      <Table>
        <TableBody>
          <EmptyTableRow colSpan={5} testId="probe">
            No games yet
          </EmptyTableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("No games yet");
    expect(screen.getByRole("cell")).toHaveAttribute("colspan", "5");
  });
});
