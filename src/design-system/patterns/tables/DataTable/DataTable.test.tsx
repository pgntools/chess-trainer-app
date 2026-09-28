import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link as RouterLink, useLocation } from "react-router";

import type { SortDirection } from "../../../components/tables";
import { firstDirectionOf, nextSort, type DataTableColumn } from "./columns";
import DataTable, { type DataTableBaseProps, type DataTableProps, type DataTableRowActions } from "./DataTable";

type Row = { id: string; name?: string; elo?: number };
type Column = "name" | "elo";

const ROWS: Row[] = [
  { id: "a", name: "Tal", elo: 2700 },
  { id: "b", name: "Capablanca" },
  { id: "c", name: "Petrosian", elo: 2650 },
  { id: "d", elo: 2720 },
];

const COLUMNS: DataTableColumn<Row, Column>[] = [
  { id: "name", header: "Player", sortable: true, dir: "auto", sortValue: (row) => row.name, render: (row) => row.name ?? "–" },
  {
    id: "elo",
    header: "Elo",
    sortable: true,
    align: "end",
    firstDirection: "desc",
    sortValue: (row) => row.elo,
    render: (row) => row.elo ?? "–",
  },
];

const mount = (props: Partial<DataTableBaseProps<Row, Column>> & DataTableRowActions<Row> = {}) =>
  render(
    <DataTable<Row, Column>
      columns={COLUMNS}
      rows={ROWS}
      rowId={(row) => row.id}
      emptyLabel="No players"
      ariaLabel="Players"
      testId="t"
      {...props}
    />,
  );

const shownIds = () => screen.getAllByTestId(/^t-row-/).map((row) => row.getAttribute("data-testid")?.slice("t-row-".length));

describe("DataTable", () => {
  describe("columns", () => {
    it("renders a header and a cell per column, in the one scrolling frame", () => {
      mount();
      expect(screen.getByTestId("t")).toContainElement(screen.getByTestId("t-frame"));
      const table = screen.getByRole("table", { name: "Players" });
      expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Player", "Elo"]);
      expect(within(screen.getByTestId("t-row-a")).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Tal", "2700"]);
    });

    it("end-aligns a number column, and gives a cell its direction", () => {
      mount();
      const [name, elo] = within(screen.getByTestId("t-row-a")).getAllByRole("cell");
      expect(name).toHaveAttribute("dir", "auto");
      expect(elo).toHaveStyle({ textAlign: "end" });
    });

    it("leaves a column without `sortable` as a plain header", () => {
      mount({ columns: [{ ...COLUMNS[0], sortable: false }, COLUMNS[1]], onSort: vi.fn() });
      expect(screen.queryByTestId("t-sort-name")).toBeNull();
      expect(screen.getByTestId("t-sort-elo")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("shows the rows as they come with no sort", () => {
      mount();
      expect(shownIds()).toEqual(["a", "b", "c", "d"]);
    });

    it("sorts by the column's value, a missing value last either way", () => {
      const { rerender } = mount({ sort: { column: "elo", direction: "desc" } });
      expect(shownIds()).toEqual(["d", "a", "c", "b"]);
      rerender(
        <DataTable<Row, Column>
          columns={COLUMNS}
          rows={ROWS}
          rowId={(row) => row.id}
          emptyLabel=""
          ariaLabel="Players"
          testId="t"
          sort={{ column: "elo", direction: "asc" }}
        />,
      );
      expect(shownIds()).toEqual(["c", "a", "d", "b"]);
    });

    it("leaves rows that arrive `sorted` in their order", () => {
      mount({ sort: { column: "elo", direction: "desc" }, sorted: true });
      expect(shownIds()).toEqual(["a", "b", "c", "d"]);
    });

    it("asks for a new column's first direction, and the same column's other", () => {
      const onSort = vi.fn();
      mount({ sort: { column: "name", direction: "asc" }, onSort });
      fireEvent.click(screen.getByTestId("t-sort-elo"));
      expect(onSort).toHaveBeenLastCalledWith("elo", "desc");
      fireEvent.click(screen.getByTestId("t-sort-name"));
      expect(onSort).toHaveBeenLastCalledWith("name", "desc");
    });

    it("marks the sorted column's header", () => {
      mount({ sort: { column: "elo", direction: "desc" }, onSort: vi.fn() });
      const headers = screen.getAllByRole("columnheader");
      expect(headers[1]).toHaveAttribute("aria-sort", "descending");
      expect(headers[0]).not.toHaveAttribute("aria-sort");
    });

    it("reads the columns' first directions for useTableUrlState", () => {
      const first = firstDirectionOf(COLUMNS);
      expect(first("elo")).toBe("desc");
      expect(first("name")).toBe("asc");
    });

    it("turns a sort the way a header click asks", () => {
      const asc: SortDirection = "asc";
      expect(nextSort(undefined, "elo", "desc")).toEqual({ column: "elo", direction: "desc" });
      expect(nextSort({ column: "elo", direction: asc }, "elo")).toEqual({ column: "elo", direction: "desc" });
      expect(nextSort({ column: "name", direction: asc }, "elo")).toEqual({ column: "elo", direction: "asc" });
    });
  });

  describe("paging", () => {
    const many = Array.from({ length: 120 }, (_, index) => ({ id: `r${index}`, name: `Player ${index}`, elo: index }));
    const paging = (page: number, extra = {}) => ({
      page,
      rowsPerPage: 50,
      onPageChange: vi.fn(),
      onRowsPerPageChange: vi.fn(),
      labelRowsPerPage: "Rows per page",
      ...extra,
    });

    it("shows one page, and the pager under the frame", () => {
      mount({ rows: many, paging: paging(1) });
      expect(shownIds()).toEqual(many.slice(50, 100).map((row) => row.id));
      expect(screen.getByTestId("t-pager")).toHaveTextContent("51–100 of 120");
    });

    it("shows the last page for a page past it", () => {
      mount({ rows: many, paging: paging(9) });
      expect(shownIds()).toEqual(many.slice(100).map((row) => row.id));
    });

    it("hands a page turn and a page size to its caller", () => {
      const onPageChange = vi.fn();
      mount({ rows: many, paging: paging(0, { onPageChange }) });
      fireEvent.click(within(screen.getByTestId("t-pager")).getByRole("button", { name: /next page/i }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("shows every row, with no pager, without paging", () => {
      mount({ rows: many });
      expect(shownIds()).toHaveLength(120);
      expect(screen.queryByTestId("t-pager")).toBeNull();
    });

    it("renders one page of 10,000 rows and sorts them once, not on a page turn", () => {
      const rows = Array.from({ length: 10_000 }, (_, index) => ({ id: `r${index}`, elo: (index * 7919) % 10_000 }));
      const sortValue = vi.fn((row: Row) => row.elo);
      const columns: DataTableColumn<Row, Column>[] = [COLUMNS[0], { ...COLUMNS[1], sortValue }];
      const props = (page: number) =>
        ({
          columns,
          rows,
          rowId: (row: Row) => row.id,
          emptyLabel: "",
          ariaLabel: "Players",
          testId: "t",
          sort: { column: "elo" as Column, direction: "desc" as SortDirection },
          paging: paging(page),
        }) satisfies DataTableProps<Row, Column>;
      const { rerender } = render(<DataTable<Row, Column> {...props(0)} />);
      expect(screen.getAllByTestId(/^t-row-/)).toHaveLength(50);
      expect(within(screen.getAllByTestId(/^t-row-/)[0]).getAllByRole("cell")[1]).toHaveTextContent("9999");
      const calls = sortValue.mock.calls.length;
      expect(calls).toBeGreaterThan(0);

      rerender(<DataTable<Row, Column> {...props(3)} />);
      expect(screen.getAllByTestId(/^t-row-/)).toHaveLength(50);
      expect(sortValue.mock.calls.length).toBe(calls);
    });
  });

  describe("picks", () => {
    const picks = (picked: string[], onChange = vi.fn()) => ({
      picked: new Set(picked),
      onChange,
      selectAllLabel: "Select all",
      pickLabel: (row: Row) => `Pick ${row.name ?? row.id}`,
    });

    it("adds a pick column, each checkbox named by its row", () => {
      mount({ picks: picks(["a"]) });
      expect(screen.getByTestId("t-pick-a").querySelector("input")).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Pick Capablanca" })).not.toBeChecked();
      expect(screen.getByTestId("t-row-a")).toHaveClass("Mui-selected");
    });

    it("toggles one pick, keeping the others — even one the filters hide", () => {
      const onChange = vi.fn();
      mount({ picks: picks(["a", "hidden"], onChange) });
      fireEvent.click(screen.getByRole("checkbox", { name: "Pick Capablanca" }));
      expect([...onChange.mock.calls[0][0]].sort()).toEqual(["a", "b", "hidden"]);
      fireEvent.click(screen.getByRole("checkbox", { name: "Pick Tal" }));
      expect([...onChange.mock.calls[1][0]].sort()).toEqual(["hidden"]);
    });

    it("selects all — every row, on every page — from the header", () => {
      const onChange = vi.fn();
      mount({
        picks: picks(["a", "hidden"], onChange),
        paging: { page: 0, rowsPerPage: 25, onPageChange: vi.fn(), onRowsPerPageChange: vi.fn(), labelRowsPerPage: "" },
      });
      const all = screen.getByRole("checkbox", { name: "Select all" });
      expect(all).toHaveAttribute("data-indeterminate", "true");
      fireEvent.click(all);
      expect([...onChange.mock.calls[0][0]].sort()).toEqual(["a", "b", "c", "d", "hidden"]);
    });

    it("unpicks just the rows shown when every one is picked", () => {
      const onChange = vi.fn();
      mount({ picks: picks(["a", "b", "c", "d", "hidden"], onChange) });
      const all = screen.getByRole("checkbox", { name: "Select all" });
      expect(all).toBeChecked();
      fireEvent.click(all);
      expect([...onChange.mock.calls[0][0]]).toEqual(["hidden"]);
    });

    it("never reaches the row click from a pick", () => {
      const onRowClick = vi.fn();
      mount({ picks: picks([]), onRowClick });
      fireEvent.click(screen.getByRole("checkbox", { name: "Pick Tal" }));
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  describe("row actions", () => {
    it("puts the row's actions in a column of their own, always visible", () => {
      mount({ rowActions: (row) => <button type="button">Delete {row.id}</button>, actionsLabel: "Actions" });
      const actions = screen.getByTestId("t-actions-b");
      expect(actions).toHaveAttribute("data-reveal", "always");
      expect(within(actions).getByRole("button", { name: "Delete b" })).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader")[2]).toHaveAttribute("aria-label", "Actions");
    });

    it("never reaches the row click from an action", () => {
      const onRowClick = vi.fn();
      const onDelete = vi.fn();
      mount({ onRowClick, actionsLabel: "Actions", rowActions: (row) => <button type="button" onClick={() => onDelete(row.id)}>Delete</button> });
      fireEvent.click(within(screen.getByTestId("t-actions-c")).getByRole("button"));
      expect(onDelete).toHaveBeenCalledWith("c");
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  describe("row click and row link", () => {
    it("hands a row click to its caller", () => {
      const onRowClick = vi.fn();
      mount({ onRowClick });
      fireEvent.click(within(screen.getByTestId("t-row-c")).getByText("Petrosian"));
      expect(onRowClick).toHaveBeenCalledWith(ROWS[2]);
    });

    it("makes the first column's content the row's link, or the column named", () => {
      const { unmount } = mount({ rowLink: (row) => ({ href: `#p-${row.id}` }) });
      expect(screen.getByTestId("t-link-a")).toHaveAttribute("href", "#p-a");
      expect(screen.getByTestId("t-link-a")).toHaveTextContent("Tal");
      unmount();
      mount({ rowLink: (row) => ({ href: `#p-${row.id}` }), linkColumn: "elo" });
      expect(screen.getByTestId("t-link-a")).toHaveTextContent("2700");
    });

    it("follows the link on a click anywhere on the row, through the router", () => {
      function Where() {
        return <span data-testid="where">{useLocation().pathname}</span>;
      }
      render(
        <MemoryRouter initialEntries={["/players"]}>
          <DataTable<Row, Column>
            columns={COLUMNS}
            rows={ROWS}
            rowId={(row) => row.id}
            emptyLabel=""
            ariaLabel="Players"
            rowLink={(row) => ({ component: RouterLink, to: `/players/${row.id}` })}
            testId="t"
          />
          <Where />
        </MemoryRouter>,
      );
      expect(screen.getByTestId("t-link-c")).toHaveAttribute("href", "/players/c");
      fireEvent.click(within(screen.getByTestId("t-row-c")).getAllByRole("cell")[1]);
      expect(screen.getByTestId("where")).toHaveTextContent("/players/c");
    });
  });

  describe("states", () => {
    it("shows one loading row in place of the rows, the header kept", () => {
      mount({ loading: true, loadingLabel: "Reading…", picks: { picked: new Set(), onChange: vi.fn(), selectAllLabel: "All", pickLabel: () => "" } });
      expect(screen.getByTestId("t-loading")).toHaveTextContent("Reading…");
      expect(screen.getByTestId("t-loading").querySelector("td")).toHaveAttribute("colspan", "3");
      expect(screen.queryByTestId(/^t-row-/)).toBeNull();
      expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    });

    it("says it is empty with no rows", () => {
      mount({ rows: [], noMatchLabel: "No match" });
      expect(screen.getByTestId("t-empty")).toHaveTextContent("No players");
    });

    it("says nothing matches with no rows while filtered", () => {
      mount({ rows: [], filtered: true, noMatchLabel: "No player matches" });
      expect(screen.getByTestId("t-no-match")).toHaveTextContent("No player matches");
      expect(screen.queryByTestId("t-empty")).toBeNull();
    });
  });

  describe("slots and density", () => {
    it("puts the toolbar above the filters, both above the table", () => {
      mount({ toolbar: <div data-testid="bar">bar</div>, filters: <div data-testid="filters">filters</div> });
      const root = screen.getByTestId("t");
      const order = [screen.getByTestId("bar"), screen.getByTestId("filters"), screen.getByTestId("t-frame")];
      for (const element of order) expect(root).toContainElement(element);
      expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("passes its density and sticky header to the frame", () => {
      mount({ density: "dense" });
      expect(screen.getByTestId("t-frame-table")).toHaveAttribute("data-density", "dense");
      expect(screen.getByTestId("t-frame-table")).toHaveClass("MuiTable-stickyHeader");
    });
  });

  describe("accessibility (CTA-111)", () => {
    const picks = (picked: Set<string>, onChange = vi.fn()) => ({
      picked,
      onChange,
      selectAllLabel: "Select all players",
      pickLabel: (row: Row) => `Pick ${row.name ?? row.id}`,
    });

    it("is named by a caption instead of a label, if it has one", () => {
      render(<DataTable<Row, Column> columns={COLUMNS} rows={ROWS} rowId={(row) => row.id} emptyLabel="" caption="Top players" testId="t" />);
      expect(screen.getByRole("table", { name: "Top players" })).toBeInTheDocument();
    });

    it("cannot be nameless, nor have row actions in a nameless column — the types refuse both", () => {
      const base = { columns: COLUMNS, rows: ROWS, rowId: (row: Row) => row.id, emptyLabel: "", testId: "t" };
      // @ts-expect-error — a table is named by an ariaLabel or a caption.
      const nameless = <DataTable<Row, Column> {...base} />;
      // @ts-expect-error — row actions need their column's name.
      const unnamedActions = <DataTable<Row, Column> {...base} ariaLabel="Players" rowActions={() => null} />;
      expect([nameless, unnamedActions]).toHaveLength(2);
    });

    it("marks the table busy while its rows are read", () => {
      const { rerender } = mount({ loading: true, loadingLabel: "Reading…" });
      expect(screen.getByRole("table", { name: "Players" })).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("status")).toHaveTextContent("Reading…");
      rerender(<DataTable<Row, Column> columns={COLUMNS} rows={ROWS} rowId={(row) => row.id} emptyLabel="" ariaLabel="Players" testId="t" />);
      expect(screen.getByRole("table", { name: "Players" })).not.toHaveAttribute("aria-busy");
    });

    it("names every pick by its row, and select-all by its label, a partial pick reading as mixed", () => {
      mount({ picks: picks(new Set(["a"])) });
      expect(screen.getByRole("checkbox", { name: "Pick Tal" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Pick Capablanca" })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Select all players" })).toBePartiallyChecked();
    });

    it("sorts, picks and acts from the keyboard", async () => {
      const user = userEvent.setup();
      const onSort = vi.fn();
      const onChange = vi.fn();
      const onDelete = vi.fn();
      mount({
        sort: { column: "name", direction: "asc" },
        onSort,
        picks: picks(new Set(), onChange),
        actionsLabel: "Actions",
        rowActions: (row) => (
          <button type="button" onClick={() => onDelete(row.id)}>
            Delete {row.id}
          </button>
        ),
      });
      screen.getByRole("button", { name: /Elo/ }).focus();
      await user.keyboard("{Enter}");
      expect(onSort).toHaveBeenCalledWith("elo", "desc");

      screen.getByRole("checkbox", { name: "Pick Petrosian" }).focus();
      await user.keyboard(" ");
      expect(onChange).toHaveBeenCalledWith(new Set(["c"]));

      await user.tab();
      expect(screen.getByRole("button", { name: "Delete c" })).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onDelete).toHaveBeenCalledWith("c");
    });

    it("opens a row that only has a click with Enter or Space, the row taking the focus — never from a key meant for its pick", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      mount({ onRowClick, picks: picks(new Set()) });
      const row = screen.getByTestId("t-row-c");
      expect(row).toHaveAttribute("tabindex", "0");
      row.focus();
      await user.keyboard("{Enter}");
      expect(onRowClick).toHaveBeenLastCalledWith(ROWS[2]);
      await user.keyboard(" ");
      expect(onRowClick).toHaveBeenCalledTimes(2);

      screen.getByRole("checkbox", { name: "Pick Petrosian" }).focus();
      await user.keyboard(" ");
      expect(onRowClick).toHaveBeenCalledTimes(2);
    });

    it("leaves a row with a link to its link: the row is no stop of its own", () => {
      render(
        <MemoryRouter>
          <DataTable<Row, Column>
            columns={COLUMNS}
            rows={ROWS}
            rowId={(row) => row.id}
            emptyLabel=""
            ariaLabel="Players"
            rowLink={(row) => ({ component: RouterLink, to: `/players/${row.id}` })}
            testId="t"
          />
        </MemoryRouter>,
      );
      expect(screen.getByTestId("t-row-a")).not.toHaveAttribute("tabindex");
      expect(screen.getByRole("link", { name: "Tal" })).toHaveAttribute("href", "/players/a");
    });

    it("pages from the keyboard", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const many = Array.from({ length: 60 }, (_, index) => ({ id: `p${index}`, name: `Player ${index}`, elo: 2000 + index }));
      render(
        <DataTable<Row, Column>
          columns={COLUMNS}
          rows={many}
          rowId={(row) => row.id}
          emptyLabel=""
          ariaLabel="Players"
          paging={{ page: 0, rowsPerPage: 25, onPageChange, onRowsPerPageChange: vi.fn(), labelRowsPerPage: "Rows per page" }}
          testId="t"
        />,
      );
      screen.getByRole("button", { name: /next page/i }).focus();
      await user.keyboard("{Enter}");
      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });
});
