import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { CollectionColumn, CollectionRow } from "../../../lib/libraryCollections";
import CollectionGamesTable from "./CollectionGamesTable";
import { collectionFirstDirection } from "./collectionGamesSort";
import { COLLECTION_ROWS, manyRows } from "./fixtures";

/** The table as the collection screen holds it: sort, page and picks in state. */
function Harness({
  rows = COLLECTION_ROWS,
  onPicked = () => {},
  collectionEmpty,
}: {
  rows?: readonly CollectionRow[];
  onPicked?: (picked: Set<number>) => void;
  collectionEmpty?: boolean;
}) {
  const [sort, setSort] = useState<DataTableSort<CollectionColumn>>({ column: "number", direction: "asc" });
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  return (
    <CollectionGamesTable
      rows={rows}
      sort={sort}
      onSort={(column, direction) => setSort({ column, direction })}
      paging={{ page, rowsPerPage: 50, onPageChange: setPage, onRowsPerPageChange: () => {} }}
      picked={picked}
      onPickedChange={(next) => {
        setPicked(next);
        onPicked(next);
      }}
      gameLink={(row) => ({ href: `/library/c/${row.number}` })}
      collectionEmpty={collectionEmpty}
      testId="games"
      picksTestId="picks"
    />
  );
}

const numbers = () =>
  within(screen.getByTestId("games-frame-table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.getAttribute("data-testid")?.replace("games-row-", ""));

describe("CollectionGamesTable (CTA-113)", () => {
  it("shows a row per game, the White cell its link named by the whole game, and marks one that will not read", async () => {
    render(<Harness />);
    expect(numbers()).toEqual(["1", "2", "3", "4"]);
    expect(screen.getByRole("link", { name: "Tal, Mikhail – Botvinnik, Mikhail" })).toHaveAttribute("href", "/library/c/1");
    expect(screen.getByTestId("games-unreadable-4")).toBeInTheDocument();
    expect(screen.queryByTestId("games-unreadable-1")).toBeNull();
    await expectNoAxeViolations(screen.getByTestId("games"));
  });

  it("sorts from a header — a count high first, a name A to Z — missing values last", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByTestId("games-sort-moves"));
    expect(numbers()).toEqual(["1", "2", "3", "4"]);
    await user.click(screen.getByTestId("games-sort-date"));
    // 1960 before 1959; the undated games last.
    expect(numbers().slice(0, 2)).toEqual(["1", "2"]);
    await user.click(screen.getByTestId("games-sort-date"));
    expect(numbers().slice(0, 2)).toEqual(["2", "1"]);
    expect(collectionFirstDirection("white")).toBe("asc");
    expect(collectionFirstDirection("whiteElo")).toBe("desc");
    expect(collectionFirstDirection("number")).toBe("asc");
  });

  it("picks from the keyboard — a row, then every game — by the ids the collection's tests know", async () => {
    const onPicked = vi.fn();
    const user = userEvent.setup();
    render(<Harness onPicked={onPicked} />);
    within(screen.getByTestId("picks-row-3")).getByRole("checkbox").focus();
    await user.keyboard(" ");
    expect(onPicked).toHaveBeenLastCalledWith(new Set([3]));
    within(screen.getByTestId("picks-select-all")).getByRole("checkbox").focus();
    await user.keyboard(" ");
    expect(onPicked).toHaveBeenLastCalledWith(new Set([3, 1, 2, 4]));
    expect(screen.getByRole("checkbox", { name: "Select Unknown – Tal, Mikhail" })).toBeChecked();
  });

  it("keeps a long opening to one line, truncated with an ellipsis, the whole string on hover", () => {
    render(<Harness />);
    // The whole opening, on hover, for every row that carries one — the long one and the short.
    const long = screen.getByTitle("King's Indian, fianchetto, classical main line");
    expect(long).toHaveTextContent("King's Indian, fianchetto, classical main line");
    expect(long).toHaveStyle({ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" });
    expect(screen.getByTitle("Caro-Kann")).toBeInTheDocument();
  });

  it("says whether the collection is empty or the filters leave nothing, under one id", () => {
    const { unmount } = render(<Harness rows={[]} collectionEmpty />);
    expect(screen.getByTestId("games-empty")).toHaveTextContent("This collection has no games yet");
    unmount();
    render(<Harness rows={[]} />);
    expect(screen.getByTestId("games-empty")).toHaveTextContent("No games match the filter.");
  });

  it("shows one page of a large collection", () => {
    render(<Harness rows={manyRows(120)} />);
    expect(numbers()).toHaveLength(50);
    expect(screen.getByTestId("games-pager")).toBeInTheDocument();
  });
});
