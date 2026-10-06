import Box from "@mui/material/Box";

import { SearchField } from "../../../design-system/components/forms";
import { DEFAULT_TABLE_PAGE_SIZE } from "../../../design-system/components/tables";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import {
  filteredAnalysisRows,
  SAVED_ANALYSES_DEFAULT_SORT,
  savedAnalysisFirstDirection,
  sortedAnalysisRows,
  type SavedAnalysisColumn,
  type SavedAnalysisRow,
} from "../../../lib/savedAnalysisRows";
import type { BlockFamilyId } from "../../families";
import SavedAnalysesTable from "./SavedAnalysesTable";
import { ANALYSIS_ROWS, HEBREW_ROWS, manyRows } from "./fixtures";

type DemoState = {
  sort: DataTableSort<SavedAnalysisColumn>;
  text: string;
  page: number;
  rowsPerPage: number;
  picked: Set<string>;
};

const TEN_THOUSAND = manyRows(10_000);

/** The block on fixtures, its sort, words, page and picks held by the demo as the Saved analyses screen holds them. */
const demo = (rows: readonly SavedAnalysisRow[], initialText = "") => (
  <WithState<DemoState>
    initial={{
      sort: { column: SAVED_ANALYSES_DEFAULT_SORT, direction: savedAnalysisFirstDirection(SAVED_ANALYSES_DEFAULT_SORT) },
      text: initialText,
      page: 0,
      rowsPerPage: DEFAULT_TABLE_PAGE_SIZE,
      picked: new Set(),
    }}
  >
    {(state, set) => (
      <Box sx={{ height: 360, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <SavedAnalysesTable
          rows={sortedAnalysisRows(filteredAnalysisRows(rows, state.text), state.sort.column, state.sort.direction)}
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
          openLink={(row) => ({ href: `#analysis-${row.id}` })}
          settingsLink={(row) => ({ href: `#settings-${row.id}` })}
          filtered={state.text.trim() !== ""}
          onClearFilter={() => set((before) => ({ ...before, page: 0, text: "" }))}
          filters={
            <SearchField
              label="Filter analyses"
              value={state.text}
              onChange={(text) => set((before) => ({ ...before, page: 0, text }))}
              clearLabel="Clear the filter"
              testId="gallery-saved-analyses-filter"
            />
          }
          testId="gallery-saved-analyses"
          rowTestId="gallery-saved-analyses-item"
          openTestId="gallery-saved-analyses-open"
          pickTestId="gallery-saved-analyses-select"
          selectAllTestId="gallery-saved-analyses-select-all"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "SavedAnalysesTable",
  demos: [
    {
      name: "A folder — an imported game, a named prep with notes, a board's own analysis, one that will not read (sort, filter, pick)",
      render: () => demo(ANALYSIS_ROWS),
    },
    { name: "The filter leaves nothing", render: () => demo(ANALYSIS_ROWS, "najdorf") },
    { name: "One analysis", render: () => demo(ANALYSIS_ROWS.slice(0, 1)) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW_ROWS) },
    { name: "10,000 analyses", render: () => demo(TEN_THOUSAND) },
  ],
};

export default gallery;
