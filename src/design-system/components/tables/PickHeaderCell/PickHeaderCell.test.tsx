import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import PickHeaderCell from "./PickHeaderCell";

const mount = (total: number, picked: number, onToggleAll = vi.fn()) => {
  render(
    <Table>
      <TableHead>
        <TableRow>
          <PickHeaderCell total={total} picked={picked} onToggleAll={onToggleAll} label="Select all" testId="probe" />
        </TableRow>
      </TableHead>
    </Table>,
  );
  return screen.getByRole("checkbox", { name: "Select all" }) as HTMLInputElement;
};

describe("PickHeaderCell", () => {
  it("is unticked with no picks, and selects all on a click", () => {
    const onToggleAll = vi.fn();
    const box = mount(3, 0, onToggleAll);
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it("is indeterminate with some picks, ticked with all", () => {
    expect(mount(3, 1).dataset.indeterminate).toBe("true");
  });

  it("is ticked when every covered row is picked", () => {
    const box = mount(3, 3);
    expect(box.checked).toBe(true);
    expect(box.dataset.indeterminate).toBe("false");
  });

  it("is off with nothing to pick", () => {
    expect(mount(0, 0)).toBeDisabled();
  });
});
