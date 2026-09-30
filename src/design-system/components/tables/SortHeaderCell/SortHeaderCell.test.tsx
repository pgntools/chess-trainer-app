import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { ReactNode } from "react";

import SortHeaderCell from "./SortHeaderCell";

const inHead = (cell: ReactNode) =>
  render(
    <Table>
      <TableHead>
        <TableRow>{cell}</TableRow>
      </TableHead>
    </Table>,
  );

describe("SortHeaderCell", () => {
  it("sorts its column on a click", () => {
    const onSort = vi.fn();
    inHead(<SortHeaderCell column="elo" label="Elo" sort="name" direction="asc" onSort={onSort} testId="probe" />);
    fireEvent.click(screen.getByTestId("probe"));
    expect(onSort).toHaveBeenCalledWith("elo");
  });

  it("says which way it is sorted only while it is the column in use", () => {
    const { unmount } = inHead(
      <SortHeaderCell column="elo" label="Elo" sort="elo" direction="desc" onSort={() => {}} testId="probe" />,
    );
    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "descending");
    unmount();
    inHead(<SortHeaderCell column="elo" label="Elo" sort="name" direction="desc" onSort={() => {}} testId="probe" />);
    expect(screen.getByRole("columnheader")).not.toHaveAttribute("aria-sort");
  });
});
