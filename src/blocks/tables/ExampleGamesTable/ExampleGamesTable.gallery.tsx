import Box from "@mui/material/Box";

import { DEFAULT_TABLE_PAGE_SIZE } from "../../../design-system/components/tables";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { CollectionRow } from "../../../lib/libraryCollections";
import type { BlockFamilyId } from "../../families";
import ExampleGamesTable, { type ExampleGamesColumn } from "./ExampleGamesTable";
import { EXAMPLE_LABELS, EXAMPLE_ROWS, HEBREW_ROWS, LONG_ROWS, manyRows } from "./fixtures";

type DemoState = { sort: DataTableSort<ExampleGamesColumn>; page: number; rowsPerPage: number };

const FIRST_DIRECTION: Partial<Record<ExampleGamesColumn, "desc">> = { date: "desc", moves: "desc" };
const TEN_THOUSAND = manyRows(10_000);

/** The block on fixtures, its sort and paging held by the demo as a screen would hold them. */
const demo = (rows: readonly CollectionRow[], extra: { loading?: boolean; filtered?: boolean } = {}) => (
  <WithState<DemoState> initial={{ sort: { column: "number", direction: "asc" }, page: 0, rowsPerPage: DEFAULT_TABLE_PAGE_SIZE }}>
    {(state, set) => (
      <Box sx={{ height: 360, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ExampleGamesTable
          rows={rows}
          sort={state.sort}
          onSort={(column) =>
            set((before) => ({
              ...before,
              page: 0,
              sort:
                before.sort.column === column
                  ? { column, direction: before.sort.direction === "asc" ? "desc" : "asc" }
                  : { column, direction: FIRST_DIRECTION[column] ?? "asc" },
            }))
          }
          paging={{
            page: state.page,
            rowsPerPage: state.rowsPerPage,
            onPageChange: (page) => set((before) => ({ ...before, page })),
            onRowsPerPageChange: (rowsPerPage) => set((before) => ({ ...before, page: 0, rowsPerPage })),
          }}
          gameLink={(row) => ({ href: `#game-${row.number}` })}
          labels={EXAMPLE_LABELS}
          testId="gallery-example-games"
          {...extra}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "ExampleGamesTable (placeholder)",
  demos: [
    { name: "A few games — missing tags, an unreadable game, a partial date (click a header, a row)", render: () => demo(EXAMPLE_ROWS) },
    { name: "Loading", render: () => demo([], { loading: true }) },
    { name: "Empty", render: () => demo([]) },
    { name: "No match", render: () => demo([], { filtered: true }) },
    { name: "One row", render: () => demo(EXAMPLE_ROWS.slice(0, 1)) },
    { name: "Long names (scroll sideways) and a long opening (wraps)", render: () => demo(LONG_ROWS) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW_ROWS) },
    { name: "10,000 games", render: () => demo(TEN_THOUSAND) },
  ],
};

export default gallery;
