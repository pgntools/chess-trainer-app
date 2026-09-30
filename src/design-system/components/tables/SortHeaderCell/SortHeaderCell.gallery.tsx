import { demoTable, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import NumberCell from "../NumberCell/NumberCell";
import type { SortDirection } from "../useTableUrlState/sortRows";
import SortHeaderCell from "./SortHeaderCell";

type Column = "name" | "elo";

const gallery: GalleryModule = {
  section: "tables",
  title: "SortHeaderCell",
  demos: [
    {
      name: "Start-aligned text column and end-aligned number column (click either)",
      render: () => (
        <WithState initial={{ sort: "name" as Column, direction: "asc" as SortDirection }}>
          {(state, set) => {
            const onSort = (column: Column) =>
              set((before) =>
                before.sort === column
                  ? { ...before, direction: before.direction === "asc" ? "desc" : "asc" }
                  : { sort: column, direction: column === "elo" ? "desc" : "asc" },
              );
            return demoTable(
              <>
                <SortHeaderCell column="name" label="Player" {...state} onSort={onSort} testId="gallery-sort-name" />
                <SortHeaderCell column="elo" label="Elo" {...state} onSort={onSort} align="end" testId="gallery-sort-elo" />
              </>,
              [
                <>
                  {textCell("Tal")}
                  <NumberCell value={2700} />
                </>,
                <>
                  {textCell("Petrosian")}
                  <NumberCell value={2650} />
                </>,
              ],
            );
          }}
        </WithState>
      ),
    },
  ],
};

export default gallery;
