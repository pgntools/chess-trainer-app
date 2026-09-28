import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";

import PickCell from "./PickCell";

describe("PickCell", () => {
  it("toggles the row's pick without reaching the row's own click", () => {
    const onToggle = vi.fn();
    const onRowClick = vi.fn();
    render(
      <Table>
        <TableBody>
          <TableRow onClick={onRowClick}>
            <PickCell checked={false} onToggle={onToggle} label="Pick game 3" testId="probe" />
          </TableRow>
        </TableBody>
      </Table>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Pick game 3" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
    expect(screen.getByTestId("probe")).toBeInTheDocument();
  });

  it("shows whether the row is picked", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <PickCell checked onToggle={() => {}} label="Pick" testId="probe" />
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
