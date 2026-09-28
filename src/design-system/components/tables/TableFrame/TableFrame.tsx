import type { ReactNode } from "react";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";

import type { VisibleLabel } from "../../a11y";

/**
 * **What names a table** (CTA-111) — one of the two, never neither: an
 * `ariaLabel` a screen reader announces, or a visible `caption` under the
 * rows that names it for everyone.
 */
export type TableName = { ariaLabel: string; caption?: undefined } | { caption: VisibleLabel; ariaLabel?: undefined };

export type TableFrameProps = TableName & {
  /** `TableHead` and `TableBody`. */
  children: ReactNode;
  /** `dense` tightens the body rows (a file manager's tree); `normal` is MUI's small table. */
  density?: "normal" | "dense";
  /** The header stays in view while the body scrolls (the default). */
  stickyHeader?: boolean;
  /** The rows are still being read: the table is marked `aria-busy`. */
  busy?: boolean;
  /** Anything after the table inside the scrolling region (a note under the rows). */
  after?: ReactNode;
  /** The scrolling region's test id; the table is `<testId>-table`, a caption `<testId>-caption`. */
  testId: string;
};

/**
 * **A table's frame** (CTA-108): the one region that scrolls — both ways —
 * in a flex column (`flex: 1; minHeight: 0`), around a small table whose
 * header is sticky and set in 600, never wrapping. Every table in the app
 * sat in this frame, written four times.
 *
 * Accessible (CTA-111): the table is always named (`TableName`), marked busy
 * while its rows are read, and the scrolling region takes the keyboard focus
 * (`tabIndex={0}`, a named `region`), so a reader without a mouse can scroll a
 * table that holds nothing focusable.
 */
function TableFrame({ children, density = "normal", stickyHeader = true, ariaLabel, caption, busy = false, after, testId }: TableFrameProps) {
  return (
    <TableContainer
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      data-testid={testId}
      sx={(theme) => ({ flex: 1, minHeight: 0, "&:focus-visible": { ...theme.mixins.focusRing, outlineOffset: -2 } })}
    >
      <Table
        size="small"
        stickyHeader={stickyHeader}
        aria-label={ariaLabel}
        aria-busy={busy || undefined}
        data-testid={`${testId}-table`}
        data-density={density}
        sx={{
          "& .MuiTableHead-root .MuiTableCell-root": { fontWeight: 600, whiteSpace: "nowrap" },
          ...(density === "dense" && { "& .MuiTableBody-root .MuiTableCell-root": { py: 0.25 } }),
        }}
      >
        {caption !== undefined && <caption data-testid={`${testId}-caption`}>{caption}</caption>}
        {children}
      </Table>
      {after}
    </TableContainer>
  );
}

export default TableFrame;
