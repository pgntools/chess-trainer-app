import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { TABLE_PAGE_SIZES } from "./pageSizes";
import TablePager from "./TablePager";

describe("TablePager", () => {
  it("turns pages", () => {
    const onPageChange = vi.fn();
    render(
      <TablePager
        count={120}
        page={0}
        rowsPerPage={25}
        onPageChange={onPageChange}
        onRowsPerPageChange={() => {}}
        labelRowsPerPage="Rows per page"
        testId="probe"
      />,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("Rows per page");
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("offers the one page-size set, and reports a new size as a number", () => {
    const onRowsPerPageChange = vi.fn();
    render(
      <TablePager
        count={120}
        page={0}
        rowsPerPage={25}
        onPageChange={() => {}}
        onRowsPerPageChange={onRowsPerPageChange}
        labelRowsPerPage="Rows per page"
        testId="probe"
      />,
    );
    fireEvent.mouseDown(screen.getByRole("combobox"));
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => Number(option.getAttribute("data-value")))).toEqual([...TABLE_PAGE_SIZES]);
    fireEvent.click(options[2]);
    expect(onRowsPerPageChange).toHaveBeenCalledWith(TABLE_PAGE_SIZES[2]);
  });

  it("words the count the caller's way when asked", () => {
    render(
      <TablePager
        count={57}
        page={1}
        rowsPerPage={25}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
        labelRowsPerPage="Rows"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        testId="probe"
      />,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("26-50 / 57");
  });
});
