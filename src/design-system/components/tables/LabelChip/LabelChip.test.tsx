import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

import { expectNoAxeViolations } from "../../../../test/axe";
import LabelChip from "./LabelChip";

const inCell = (chip: React.ReactNode) =>
  render(
    <Table aria-label="Players">
      <TableBody>
        <TableRow>
          <TableCell>{chip} Ada Lovelace</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );

describe("LabelChip", () => {
  it("shows its letters in its tone, and is read by what they stand for", () => {
    inCell(<LabelChip tone="warning" label="GM" name="Grandmaster" testId="probe" />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-tone", "warning");
    expect(screen.getByTestId("probe")).toHaveAttribute("title", "Grandmaster");
    expect(screen.getByText("GM").closest("[aria-hidden]")).not.toBeNull();
    expect(screen.getByRole("cell", { name: "Grandmaster Ada Lovelace" })).toBeInTheDocument();
  });

  it("is read by its letters with no name", () => {
    inCell(<LabelChip tone="info" label="New" />);
    expect(screen.getByRole("cell", { name: "New Ada Lovelace" })).toBeInTheDocument();
  });

  it("is no control — nothing to focus or press", () => {
    inCell(<LabelChip tone="success" label="FM" name="FIDE Master" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("passes axe in every tone", async () => {
    render(
      <>
        {(["primary", "secondary", "success", "warning", "info", "error"] as const).map((tone) => (
          <LabelChip key={tone} tone={tone} label="GM" name="Grandmaster" />
        ))}
      </>,
    );
    await expectNoAxeViolations();
  });
});
