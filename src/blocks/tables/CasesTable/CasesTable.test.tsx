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
    // The pick, #, Name, Type, then the game columns — all blank — and Updated.
    expect(cells[1]).toHaveTextContent("3");
    expect(cells[3]).toHaveTextContent("Position");
    expect(cells.slice(4, 15).map((cell) => cell.textContent)).toEqual(Array(11).fill(""));
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
    mount({ rows, onCaseAction, sort: { column: "name", direction: "asc" }, paging: { page: 0, rowsPerPage: 25, onPageChange: () => {}, onRowsPerPageChange: () => {} } });
    expect(screen.getAllByTestId(/^probe-row-/)).toHaveLength(25);
    // Moving to another Project is the picks' (CTA-226): no row moves itself.
    expect(screen.queryByRole("button", { name: "Move Case 1" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Rename Case 1" }));
    expect(onCaseAction).toHaveBeenCalledWith("rename", rows[0].record);
  });

  it("shows the Project's order as '#', named Order, and sorts by it (CTA-203)", async () => {
    const onSort = vi.fn();
    mount({ sort: { column: "order", direction: "asc" }, onSort });
    expect(screen.getAllByTestId(/^probe-row-/).map((row) => row.getAttribute("data-testid"))).toEqual([
      "probe-row-cding",
      "probe-row-cgame",
      "probe-row-cpos",
    ]);
    const header = screen.getByRole("columnheader", { name: "Order" });
    expect(header).toHaveTextContent("#");
    expect(header).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(within(header).getByRole("button"));
    expect(onSort).toHaveBeenCalledWith("order", "desc");
  });

  it("moves a Case in the order from its row — never past an end — and deletes none (CTA-203)", async () => {
    const onCaseAction = vi.fn();
    const { container } = mount({ sort: { column: "order", direction: "asc" }, onCaseAction });
    const first = "Ding – Nepomniachtchi, Club Championship, 2024";
    expect(screen.getByRole("button", { name: `Move ${first} up` })).toBeDisabled();
    expect(screen.getByRole("button", { name: `Move ${first} to the top` })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Black to move, move 41 down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Black to move, move 41 to the bottom" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^Delete / })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: `Move ${first} down` }));
    expect(onCaseAction).toHaveBeenLastCalledWith("down", ROWS[1].record);
    // The keyboard reaches them too.
    screen.getByRole("button", { name: "Move Black to move, move 41 up" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onCaseAction).toHaveBeenLastCalledWith("up", ROWS[2].record);
    await userEvent.click(screen.getByRole("button", { name: "Move Black to move, move 41 to the top" }));
    expect(onCaseAction).toHaveBeenLastCalledWith("top", ROWS[2].record);
    await userEvent.click(screen.getByRole("button", { name: `Move ${first} to the bottom` }));
    expect(onCaseAction).toHaveBeenLastCalledWith("bottom", ROWS[1].record);
    await expectNoAxeViolations(container);
  });

  it("turns reordering off under another sort or a filter, saying why (CTA-203)", async () => {
    const { rerender } = mount({ sort: { column: "order", direction: "desc" } });
    const action = "Move Black to move, move 41 up";
    expect(screen.getByRole("button", { name: `${action} — sort by # ascending to reorder` })).toBeDisabled();
    const props = {
      rows: ROWS,
      caseLink: (row: { id: string }) => ({ href: `/case/${row.id}` }),
      onSort: () => {},
      onCaseAction: () => {},
      picked: new Set<string>(),
      onPickedChange: () => {},
      testId: "probe",
    };
    rerender(<CasesTable {...props} sort={{ column: "order", direction: "asc" }} filtered />);
    expect(screen.getByRole("button", { name: `${action} — clear the filter to reorder` })).toBeDisabled();
    rerender(<CasesTable {...props} sort={{ column: "name", direction: "asc" }} filtered />);
    expect(screen.getByRole("button", { name: `${action} — sort by # ascending and clear the filter to reorder` })).toBeDisabled();
    // Rename, Move and Duplicate stay.
    expect(screen.getByRole("button", { name: "Rename Black to move, move 41" })).toBeEnabled();
    await expectNoAxeViolations(document.body);
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
