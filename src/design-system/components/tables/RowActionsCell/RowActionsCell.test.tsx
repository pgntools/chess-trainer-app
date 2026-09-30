import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";

import RowActionsCell from "./RowActionsCell";

const mount = (reveal?: "always" | "hover") => {
  const onRowClick = vi.fn();
  const onAction = vi.fn();
  render(
    <Table>
      <TableBody>
        <TableRow onClick={onRowClick}>
          <RowActionsCell reveal={reveal} testId="probe">
            <button onClick={onAction}>Delete</button>
          </RowActionsCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
  return { onRowClick, onAction };
};

describe("RowActionsCell", () => {
  it("runs an action without the click reaching the row", () => {
    const { onRowClick, onAction } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("shows its actions always by default, and hides them until hover or focus when asked", () => {
    mount();
    expect(screen.getByTestId("probe")).toHaveAttribute("data-reveal", "always");
    expect(getComputedStyle(screen.getByTestId("probe")).opacity).not.toBe("0");
  });

  it("hides hover-revealed actions at rest", () => {
    mount("hover");
    expect(screen.getByTestId("probe")).toHaveAttribute("data-reveal", "hover");
    expect(getComputedStyle(screen.getByTestId("probe")).opacity).toBe("0");
  });
});
