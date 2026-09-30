import TableCell from "@mui/material/TableCell";
import TableSortLabel from "@mui/material/TableSortLabel";

import type { VisibleLabel } from "../../a11y";
import type { SortDirection } from "../useTableUrlState/sortRows";

export type SortHeaderCellProps<C extends string> = {
  /** The column this header sorts. */
  column: C;
  label: VisibleLabel;
  /** The column the table is sorted by, and which way — `useTableUrlState`'s. */
  sort: C;
  direction: SortDirection;
  onSort: (column: C) => void;
  /** `end` for a number column, so the header lines up with its cells. */
  align?: "start" | "end";
  width?: number | string;
  /** The sort button's test id. */
  testId: string;
};

/**
 * **A sortable column's header** (CTA-108): its label as a sort button,
 * the arrow shown on the column in use, `aria-sort` on the cell. An
 * end-aligned header keeps its arrow on the inner side, so the label lines up
 * with the numbers under it in either direction.
 */
function SortHeaderCell<C extends string>({
  column,
  label,
  sort,
  direction,
  onSort,
  align = "start",
  width,
  testId,
}: SortHeaderCellProps<C>) {
  const active = sort === column;
  return (
    <TableCell
      sortDirection={active ? direction : false}
      sx={{
        width,
        ...(align === "end" && { textAlign: "end", "& .MuiTableSortLabel-root": { flexDirection: "row-reverse" } }),
      }}
    >
      <TableSortLabel
        active={active}
        direction={active ? direction : "asc"}
        onClick={() => onSort(column)}
        data-testid={testId}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

export default SortHeaderCell;
