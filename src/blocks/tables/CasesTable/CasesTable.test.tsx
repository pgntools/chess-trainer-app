import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import CasesTable, { type CasesTableProps } from "./CasesTable";
import { manyRows, ROWS } from "./fixtures";

const mount = (props: Partial<CasesTableProps> = {}) =>
  render(
    <CasesTable
      rows={ROWS}
      sort={{ column: "updated", direction: "desc" }}
      onSort={() => {}}
      caseLink={(row) => ({ href: `/case/${row.id}` })}
      onCaseAction={() => {}}
      picked={new Set()}
      onPickedChange={() => {}}
      testId="probe"
      {...props}
    />,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("CasesTable (CTA-186)", () => {
  it("shows a Game's tags in the game columns, and leaves them blank for a Position", async () => {
    const { container } = mount();
    const table = screen.getByRole("table", { name: "Cases" });
    const game = within(table).getByTestId("probe-row-cgame");
    expect(game).toHaveTextContent("Carlsen");
    expect(game).toHaveTextContent("2830");
    expect(game).toHaveTextContent("Ruy Lopez");
    expect(game).toHaveTextContent("1-0");
    const position = within(table).getByTestId("probe-row-cpos");
    const cells = within(position).getAllByRole("cell");
    // The pick, Name, Type, then the game columns — all blank — and Updated.
    expect(cells[2]).toHaveTextContent("Position");
    expect(cells.slice(3, 14).map((cell) => cell.textContent)).toEqual(Array(11).fill(""));
    expect(screen.getByRole("link", { name: "Open Carlsen – Caruana, Club Championship, 2024" })).toHaveAttribute("href", "/case/cgame");
    await expectNoAxeViolations(container);
  });

  it("sorts by any header — a Position's blank last — and asks for the sort it was given", async () => {
    const onSort = vi.fn();
    mount({ sort: { column: "whiteElo", direction: "desc" }, onSort });
    const rows = screen.getAllByTestId(/^probe-row-/).map((row) => row.getAttribute("data-testid"));
    expect(rows).toEqual(["probe-row-cgame", "probe-row-cding", "probe-row-cpos"]);
    await userEvent.click(screen.getByRole("button", { name: "White" }));
    expect(onSort).toHaveBeenCalledWith("white", "asc");
  });

  it("pages, and hands each action its Case", async () => {
    const onCaseAction = vi.fn();
    const rows = manyRows(30);
    mount({ rows, onCaseAction, canMove: false, sort: { column: "name", direction: "asc" }, paging: { page: 0, rowsPerPage: 25, onPageChange: () => {}, onRowsPerPageChange: () => {} } });
    expect(screen.getAllByTestId(/^probe-row-/)).toHaveLength(25);
    expect(screen.getByRole("button", { name: "Move Case 1" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Rename Case 1" }));
    expect(onCaseAction).toHaveBeenCalledWith("rename", rows[0].record);
  });

  it("picks a row, and every row from the header", async () => {
    const onPickedChange = vi.fn();
    mount({ onPickedChange });
    await userEvent.click(within(screen.getByTestId("probe-row-cpos")).getByRole("checkbox"));
    expect(onPickedChange).toHaveBeenLastCalledWith(new Set(["cpos"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all cases" }));
    expect(onPickedChange).toHaveBeenLastCalledWith(new Set(["cgame", "cding", "cpos"]));
  });

  it("says when the words leave nothing, with a way to clear them", async () => {
    const onClearFilter = vi.fn();
    mount({ rows: [], filtered: true, onClearFilter });
    expect(screen.getByTestId("probe-no-match")).toHaveTextContent("No case matches the filter.");
    await userEvent.click(screen.getByRole("button", { name: "Clear the filter" }));
    expect(onClearFilter).toHaveBeenCalled();
  });

  it("says when the Project has none", () => {
    mount({ rows: [] });
    expect(screen.getByTestId("probe-empty")).toHaveTextContent("No cases in this project yet.");
  });
});
