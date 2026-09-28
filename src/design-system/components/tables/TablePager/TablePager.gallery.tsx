import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import { DEFAULT_TABLE_PAGE_SIZE } from "./pageSizes";
import TablePager from "./TablePager";

const gallery: GalleryModule = {
  section: "tables",
  title: "TablePager",
  demos: [
    {
      name: "The one page-size set, the theme's locale words",
      render: () => (
        <WithState initial={{ page: 0, rows: DEFAULT_TABLE_PAGE_SIZE }}>
          {(state, set) => (
            <TablePager
              count={812}
              page={state.page}
              rowsPerPage={state.rows}
              onPageChange={(page) => set((before) => ({ ...before, page }))}
              onRowsPerPageChange={(rows) => set({ page: 0, rows })}
              labelRowsPerPage="Rows per page"
              testId="gallery-pager"
            />
          )}
        </WithState>
      ),
    },
    {
      name: "The caller's own count words",
      render: () => (
        <TablePager
          count={57}
          page={1}
          rowsPerPage={25}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          labelRowsPerPage="Games per page"
          labelDisplayedRows={({ from, to, count }) => `Games ${from}–${to} of ${count}`}
          testId="gallery-pager-words"
        />
      ),
    },
  ],
};

export default gallery;
