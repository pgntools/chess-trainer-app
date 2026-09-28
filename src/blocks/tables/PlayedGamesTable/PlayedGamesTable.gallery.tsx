import Box from "@mui/material/Box";

import { DEFAULT_TABLE_PAGE_SIZE } from "../../../design-system/components/tables";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { PlayedGameColumn, PlayedGameRow } from "../../../lib/playedGames";
import type { BlockFamilyId } from "../../families";
import { HEBREW_ROWS, LONG_ROWS, manyRows, PLAYED_ROWS } from "./fixtures";
import PlayedGamesTable from "./PlayedGamesTable";
import { playedGamesFirstDirection } from "./playedGamesSort";

type DemoState = { sort: DataTableSort<PlayedGameColumn>; page: number; rowsPerPage: number; picked: Set<string> };

const TEN_THOUSAND = manyRows(10_000);

/** The block on fixtures, its sort, page and picks held by the demo as the Lobby holds them. */
const demo = (rows: readonly PlayedGameRow[], extra: { loading?: boolean; filtered?: boolean } = {}) => (
  <WithState<DemoState>
    initial={{ sort: { column: "date", direction: "desc" }, page: 0, rowsPerPage: DEFAULT_TABLE_PAGE_SIZE, picked: new Set() }}
  >
    {(state, set) => (
      <Box sx={{ height: 360, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <PlayedGamesTable
          rows={rows}
          sort={state.sort}
          onSort={(column) =>
            set((before) => ({
              ...before,
              page: 0,
              sort:
                before.sort.column === column
                  ? { column, direction: before.sort.direction === "asc" ? "desc" : "asc" }
                  : { column, direction: playedGamesFirstDirection(column) },
            }))
          }
          paging={{
            page: state.page,
            rowsPerPage: state.rowsPerPage,
            onPageChange: (page) => set((before) => ({ ...before, page })),
            onRowsPerPageChange: (rowsPerPage) => set((before) => ({ ...before, page: 0, rowsPerPage })),
          }}
          picked={state.picked}
          onPickedChange={(picked) => set((before) => ({ ...before, picked }))}
          analysisLink={(row) => ({ href: `#analysis-${row.id}` })}
          continueLink={(row) => ({ href: `#continue-${row.id}` })}
          testId="gallery-played-games"
          {...extra}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "PlayedGamesTable",
  demos: [
    {
      name: "A few games — on, won, drawn with side lines, masked, resigned, and one that will not read (sort, pick, tab to the actions)",
      render: () => demo(PLAYED_ROWS),
    },
    { name: "Loading", render: () => demo([], { loading: true }) },
    { name: "Empty", render: () => demo([]) },
    { name: "No match", render: () => demo([], { filtered: true }) },
    { name: "One row", render: () => demo(PLAYED_ROWS.slice(0, 1)) },
    { name: "An unreadable row alone", render: () => demo(PLAYED_ROWS.slice(-1)) },
    { name: "A long opening (wraps) and many side lines", render: () => demo(LONG_ROWS) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW_ROWS) },
    { name: "10,000 games", render: () => demo(TEN_THOUSAND) },
  ],
};

export default gallery;
