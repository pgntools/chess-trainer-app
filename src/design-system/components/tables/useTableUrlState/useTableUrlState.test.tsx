import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";

import { sortRows, type SortDirection } from "./sortRows";
import { useTableUrlState, type TableUrlStateOptions } from "./useTableUrlState";

type Column = "name" | "elo" | "date";
const firstDirection = (column: Column): SortDirection => (column === "name" ? "asc" : "desc");
const options: TableUrlStateOptions<Column> = { columns: ["name", "elo", "date"], defaultSort: "date", firstDirection };

/** The hook and the router's location, from `entry`. */
const mount = (entry = "/t", extra: Partial<TableUrlStateOptions<Column>> = {}) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={["/before", entry]} initialIndex={1}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => ({ table: useTableUrlState<Column>({ ...options, ...extra }), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
};

describe("useTableUrlState", () => {
  it("opens on the default sort, in that column's own direction, on the first page of the default size", () => {
    const { result } = mount();
    expect(result.current.table).toMatchObject({ sort: "date", direction: "desc", page: 0, rowsPerPage: 50 });
  });

  it("reads the URL, and reads anything it does not know as the default", () => {
    expect(mount("/t?sort=elo&dir=asc&page=2&rows=100").result.current.table).toMatchObject({
      sort: "elo",
      direction: "asc",
      page: 2,
      rowsPerPage: 100,
    });
    expect(mount("/t?sort=evil&dir=up&page=-3&rows=7").result.current.table).toMatchObject({
      sort: "date",
      direction: "desc",
      page: 0,
      rowsPerPage: 50,
    });
  });

  it("opens a new column its own way, turns it on a second click, and keeps only what differs from the default", () => {
    const { result } = mount("/t?page=3");
    act(() => result.current.table.sortBy("name"));
    expect(result.current.location.search).toBe("?sort=name");
    expect(result.current.table.direction).toBe("asc");

    act(() => result.current.table.sortBy("name"));
    expect(result.current.location.search).toBe("?sort=name&dir=desc");

    act(() => result.current.table.sortBy("date"));
    expect(result.current.location.search).toBe("");
    expect(result.current.table).toMatchObject({ sort: "date", direction: "desc" });
  });

  it("writes with history replace, so Back leaves the table rather than undoing a sort", async () => {
    const { result } = mount();
    act(() => result.current.table.sortBy("elo"));
    act(() => result.current.table.setPage(1));
    expect(result.current.location.search).toBe("?sort=elo&page=1");
    await act(async () => result.current.navigate(-1));
    expect(result.current.location.pathname).toBe("/before");
  });

  it("turns pages, and starts a new size or filter at the first page", () => {
    const { result } = mount("/t", { count: 500 });
    act(() => result.current.table.setPage(2));
    expect(result.current.location.search).toBe("?page=2");
    act(() => result.current.table.setParams({ q: "tal" }, { keepPage: true }));
    expect(result.current.table.page).toBe(2);
    act(() => result.current.table.setParams({ q: "fischer" }));
    expect(result.current.location.search).toBe("?q=fischer");
    act(() => result.current.table.setRowsPerPage(100));
    expect(result.current.location.search).toBe("?q=fischer&rows=100");
    act(() => result.current.table.setRowsPerPage(50));
    expect(result.current.location.search).toBe("?q=fischer");
  });

  it("clamps the page to the rows there are, and slices the page", () => {
    const { result } = mount("/t?page=9&rows=25", { count: 60 });
    expect(result.current.table.page).toBe(2);
    const rows = Array.from({ length: 60 }, (_, index) => index);
    expect(result.current.table.pageOf(rows)).toEqual([50, 51, 52, 53, 54, 55, 56, 57, 58, 59]);
  });
});

describe("sortRows", () => {
  const rows = [
    { name: "b", elo: 2700, round: "1.10" },
    { name: "a", elo: undefined, round: "1.9" },
    { name: "c", elo: 2650, round: "" },
    { name: "d", elo: 2700, round: "1.2" },
  ];
  const valueOf = (row: (typeof rows)[number], column: "elo" | "round") => row[column];

  it("puts missing values last in either direction", () => {
    expect(sortRows(rows, "elo", "desc", valueOf).map((row) => row.name)).toEqual(["b", "d", "c", "a"]);
    expect(sortRows(rows, "elo", "asc", valueOf).map((row) => row.name)).toEqual(["c", "b", "d", "a"]);
  });

  it("sorts text numeric-aware", () => {
    expect(sortRows(rows, "round", "asc", valueOf).map((row) => row.round)).toEqual(["1.2", "1.9", "1.10", ""]);
  });

  it("breaks ties with the caller's rule, and leaves the input alone", () => {
    const byNameDesc = (a: (typeof rows)[number], b: (typeof rows)[number]) => b.name.localeCompare(a.name);
    expect(sortRows(rows, "elo", "desc", valueOf, byNameDesc).map((row) => row.name)).toEqual(["d", "b", "c", "a"]);
    expect(rows.map((row) => row.name)).toEqual(["b", "a", "c", "d"]);
  });
});
