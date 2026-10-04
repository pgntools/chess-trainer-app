import type { ReactNode } from "react";
import type { LabelDisplayedRowsArgs } from "@mui/material/TablePagination";

import type { VisibleLabel } from "../../components/a11y";

/**
 * **Controlled paging** (CTA-110, shared by every table pattern since
 * CTA-128) — `useTableUrlState`'s, or any other source's. **Every table
 * pattern takes it as an optional `paging` prop** (`DataTable`,
 * `StandingsTable`, `CrossTable`, and any table to come — the patterns'
 * conventions test holds them to it): absent, every row shows; present, the
 * rows are cut into pages and `TablePager` sits under the frame.
 */
export type TablePaging = {
  /** Zero-based. A page past the last shows the last. */
  page: number;
  /** One of `TABLE_PAGE_SIZES` (25, 50, 100, 250) — the pager offers those. */
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  /** "Rows per page" in the reader's language. */
  labelRowsPerPage: VisibleLabel;
  /** "1–50 of 812" — absent, the theme's locale bundle words it. */
  labelDisplayedRows?: (args: LabelDisplayedRowsArgs) => ReactNode;
};

/** The rows a page shows, and the page itself — a page past the last is the last. */
export const pageOfRows = <R,>(rows: readonly R[], paging: TablePaging | undefined): { shown: readonly R[]; page: number } => {
  if (paging === undefined) return { shown: rows, page: 0 };
  const lastPage = Math.max(0, Math.ceil(rows.length / paging.rowsPerPage) - 1);
  const page = Math.min(Math.max(0, paging.page), lastPage);
  return { shown: rows.slice(page * paging.rowsPerPage, (page + 1) * paging.rowsPerPage), page };
};
