import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import ExampleGamesTable, { type ExampleGamesTableProps } from "./ExampleGamesTable";
import { EXAMPLE_LABELS, EXAMPLE_ROWS, manyRows } from "./fixtures";

const mount = (props: Partial<ExampleGamesTableProps> = {}) => {
  const onSort = vi.fn();
  render(
    <ExampleGamesTable
      rows={EXAMPLE_ROWS}
      sort={{ column: "number", direction: "asc" }}
      onSort={onSort}
      paging={{ page: 0, rowsPerPage: 50, onPageChange: vi.fn(), onRowsPerPageChange: vi.fn() }}
      gameLink={(row) => ({ href: `#game-${row.number}` })}
      labels={EXAMPLE_LABELS}
      testId="games"
      {...props}
    />,
  );
  return { onSort };
};

const rowIds = () =>
  screen.getAllByTestId(/^games-row-/).map((row) => row.getAttribute("data-testid")?.replace("games-row-", ""));

describe("ExampleGamesTable — the placeholder block", () => {
  it("shows a collection's rows from its fixtures, a dash for a missing tag", () => {
    mount();
    expect(rowIds()).toEqual(["1", "2", "3", "4", "5"]);
    const row5 = screen.getByTestId("games-row-5");
    expect(within(row5).getAllByText("–").length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: "Games" })).toBeInTheDocument();
  });

  it("names an opening with src/lib's own helper — the tag's name, else the ECO code", () => {
    mount();
    expect(within(screen.getByTestId("games-row-1")).getByText("B90 Sicilian Defense, Najdorf Variation")).toBeInTheDocument();
    expect(within(screen.getByTestId("games-row-2")).getByText("D51")).toBeInTheDocument();
  });

  it("marks an unreadable game", () => {
    mount();
    expect(screen.getByTestId("games-unreadable-4")).toHaveAttribute("aria-label", EXAMPLE_LABELS.unreadable);
    expect(screen.queryByTestId("games-unreadable-1")).toBeNull();
  });

  it("makes White the game's link, from the props — it knows no route", () => {
    mount();
    expect(screen.getByTestId("games-link-1")).toHaveAttribute("href", "#game-1");
    expect(within(screen.getByTestId("games-link-1")).getByText("Tal, Mikhail")).toBeInTheDocument();
  });

  it("asks its caller to sort, and sorts the rows it is handed", () => {
    const { onSort } = mount({ sort: { column: "moves", direction: "desc" } });
    expect(rowIds()).toEqual(["2", "1", "3", "5", "4"]);
    fireEvent.click(screen.getByTestId("games-sort-date"));
    expect(onSort).toHaveBeenCalledWith("date", "desc");
  });

  it("shows its loading row", () => {
    mount({ rows: [], loading: true });
    expect(screen.getByTestId("games-loading")).toHaveTextContent(EXAMPLE_LABELS.loading);
  });

  it.each([
    [false, "games-empty", EXAMPLE_LABELS.empty],
    [true, "games-no-match", EXAMPLE_LABELS.noMatch],
  ])("with no rows and filtered %s, says so", (filtered, testId, words) => {
    mount({ rows: [], filtered });
    expect(screen.getByTestId(testId)).toHaveTextContent(words);
  });

  it("renders one page of 10,000 games", () => {
    mount({ rows: manyRows(10_000) });
    expect(screen.getAllByTestId(/^games-row-/)).toHaveLength(50);
  });
});
