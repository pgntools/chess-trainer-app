import type { ReactNode } from "react";
import TablePagination, { type LabelDisplayedRowsArgs } from "@mui/material/TablePagination";

import { TABLE_PAGE_SIZES } from "./pageSizes";

export type TablePagerProps = {
  /** How many rows there are to page through. */
  count: number;
  /** Zero-based. */
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  /** "Rows per page" in the reader's language. */
  labelRowsPerPage: ReactNode;
  /** "1–50 of 812" — absent, the theme's locale bundle words it. */
  labelDisplayedRows?: (args: LabelDisplayedRowsArgs) => ReactNode;
  testId: string;
};

/**
 * **The pagination under a table** (CTA-108): MUI's `TablePagination`,
 * pinned below the scrolling frame (`flexShrink: 0`), offering the **one**
 * page-size set, `TABLE_PAGE_SIZES`. The arrows' names come from the theme's
 * locale bundle, as every MUI component's do.
 */
function TablePager({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  labelRowsPerPage,
  labelDisplayedRows,
  testId,
}: TablePagerProps) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={[...TABLE_PAGE_SIZES]}
      labelRowsPerPage={labelRowsPerPage}
      {...(labelDisplayedRows !== undefined && { labelDisplayedRows })}
      onPageChange={(_event, next) => onPageChange(next)}
      onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
      data-testid={testId}
      sx={{ flexShrink: 0 }}
    />
  );
}

export default TablePager;
