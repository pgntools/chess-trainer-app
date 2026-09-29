import Box from "@mui/material/Box";

import { DEFAULT_TABLE_PAGE_SIZE } from "../../../design-system/components/tables";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { CollectionColumn, CollectionRow } from "../../../lib/libraryCollections";
import type { BlockFamilyId } from "../../families";
import CollectionGamesTable from "./CollectionGamesTable";
import { COLLECTION_DEFAULT_SORT, collectionFirstDirection } from "./collectionGamesSort";
import { COLLECTION_ROWS, HEBREW_ROWS, manyRows } from "./fixtures";

type DemoState = { sort: DataTableSort<CollectionColumn>; page: number; rowsPerPage: number; picked: Set<number> };

const TEN_THOUSAND = manyRows(10_000);

/** The block on fixtures, its sort, page and picks held by the demo as the collection screen holds them. */
const demo = (rows: readonly CollectionRow[], extra: { collectionEmpty?: boolean } = {}) => (
  <WithState<DemoState>
    initial={{
      sort: { column: COLLECTION_DEFAULT_SORT, direction: collectionFirstDirection(COLLECTION_DEFAULT_SORT) },
      page: 0,
      rowsPerPage: DEFAULT_TABLE_PAGE_SIZE,
      picked: new Set(),
    }}
  >
    {(state, set) => (
      <Box sx={{ height: 360, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <CollectionGamesTable
          rows={rows}
          sort={state.sort}
          onSort={(column, direction) => set((before) => ({ ...before, page: 0, sort: { column, direction } }))}
          paging={{
            page: state.page,
            rowsPerPage: state.rowsPerPage,
            onPageChange: (page) => set((before) => ({ ...before, page })),
            onRowsPerPageChange: (rowsPerPage) => set((before) => ({ ...before, page: 0, rowsPerPage })),
          }}
          picked={state.picked}
          onPickedChange={(picked) => set((before) => ({ ...before, picked }))}
          gameLink={(row) => ({ href: `#game-${row.number}` })}
          testId="gallery-collection-games"
          picksTestId="gallery-collection-picks"
          {...extra}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "CollectionGamesTable",
  demos: [
    {
      name: "A few games — full tags, missing tags, a long opening, one that will not read (sort, pick, tab to a game)",
      render: () => demo(COLLECTION_ROWS),
    },
    { name: "An empty collection", render: () => demo([], { collectionEmpty: true }) },
    { name: "The filters leave nothing", render: () => demo([]) },
    { name: "One game", render: () => demo(COLLECTION_ROWS.slice(0, 1)) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW_ROWS) },
    { name: "10,000 games", render: () => demo(TEN_THOUSAND) },
  ],
};

export default gallery;
