import Box from "@mui/material/Box";

import { DEFAULT_TABLE_PAGE_SIZE } from "../../../design-system/components/tables";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import { findBestMoveSessionFirstDirection, type FindBestMoveSessionColumn, type FindBestMoveSessionRow } from "../../../lib/findBestMoveSessionRows";
import type { BlockFamilyId } from "../../families";
import { LONG_ROWS, manyRows, SESSION_ROWS } from "./fixtures";
import FindBestMoveSessionsTable from "./FindBestMoveSessionsTable";

type DemoState = { sort: DataTableSort<FindBestMoveSessionColumn>; page: number; rowsPerPage: number; picked: Set<string> };

const THOUSAND = manyRows(1_000);

/** The block on fixtures, its sort, page and picks held by the demo as the lobby holds them. */
const demo = (rows: readonly FindBestMoveSessionRow[], extra: { loading?: boolean } = {}) => (
  <WithState<DemoState>
    initial={{ sort: { column: "updated", direction: "desc" }, page: 0, rowsPerPage: DEFAULT_TABLE_PAGE_SIZE, picked: new Set() }}
  >
    {(state, set) => (
      <Box sx={{ height: 360, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <FindBestMoveSessionsTable
          rows={rows}
          sort={state.sort}
          onSort={(column) =>
            set((before) => ({
              ...before,
              page: 0,
              sort:
                before.sort.column === column
                  ? { column, direction: before.sort.direction === "asc" ? "desc" : "asc" }
                  : { column, direction: findBestMoveSessionFirstDirection(column) },
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
          sessionLink={(row) => ({ href: `#session-${row.id}` })}
          caseLink={(row) => ({ href: `#case-${row.id}` })}
          onDownload={() => {}}
          testId="gallery-find-best-move-sessions"
          {...extra}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "FindBestMoveSessionsTable",
  demos: [
    {
      name: "Sessions — fresh, under way, done, all passed, and a case that is not a session (sort, pick, tab to the actions)",
      render: () => demo(SESSION_ROWS),
    },
    { name: "Loading", render: () => demo([], { loading: true }) },
    { name: "Empty", render: () => demo([]) },
    { name: "One row", render: () => demo(SESSION_ROWS.slice(0, 1)) },
    { name: "A case that is not a session, alone", render: () => demo(SESSION_ROWS.slice(-1)) },
    { name: "A long name and Hebrew (switch the direction to RTL)", render: () => demo(LONG_ROWS) },
    { name: "1,000 sessions", render: () => demo(THOUSAND) },
  ],
};

export default gallery;
