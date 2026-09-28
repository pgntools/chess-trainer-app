import type { ReactNode } from "react";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";

export type TableFrameProps = {
  /** `TableHead` and `TableBody`. */
  children: ReactNode;
  /** `dense` tightens the body rows (a file manager's tree); `normal` is MUI's small table. */
  density?: "normal" | "dense";
  /** The header stays in view while the body scrolls (the default). */
  stickyHeader?: boolean;
  /** The table's accessible name. */
  ariaLabel?: string;
  /** Anything after the table inside the scrolling region (a note under the rows). */
  after?: ReactNode;
  /** The scrolling region's test id; the table is `<testId>-table`. */
  testId: string;
};

/**
 * **A table's frame** (CTA-108): the one region that scrolls — both ways —
 * in a flex column (`flex: 1; minHeight: 0`), around a small table whose
 * header is sticky and set in 600, never wrapping. Every table in the app
 * sat in this frame, written four times.
 */
function TableFrame({ children, density = "normal", stickyHeader = true, ariaLabel, after, testId }: TableFrameProps) {
  return (
    <TableContainer data-testid={testId} sx={{ flex: 1, minHeight: 0 }}>
      <Table
        size="small"
        stickyHeader={stickyHeader}
        aria-label={ariaLabel}
        data-testid={`${testId}-table`}
        data-density={density}
        sx={{
          "& .MuiTableHead-root .MuiTableCell-root": { fontWeight: 600, whiteSpace: "nowrap" },
          ...(density === "dense" && { "& .MuiTableBody-root .MuiTableCell-root": { py: 0.25 } }),
        }}
      >
        {children}
      </Table>
      {after}
    </TableContainer>
  );
}

export default TableFrame;
