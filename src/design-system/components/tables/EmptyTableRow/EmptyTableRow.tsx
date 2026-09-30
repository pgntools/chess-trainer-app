import type { ReactNode } from "react";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

export type EmptyTableRowProps = {
  /** How many columns the note spans — all of them. */
  colSpan: number;
  /** "No games yet" / "No game matches the filters". */
  children: ReactNode;
  testId: string;
};

/**
 * **A table with no rows to show** (CTA-108): one row, across every column,
 * with the note centred — inside the table, so it scrolls and aligns with it.
 */
function EmptyTableRow({ colSpan, children, testId }: EmptyTableRowProps) {
  return (
    <TableRow data-testid={testId}>
      <TableCell colSpan={colSpan} sx={{ textAlign: "center", py: 4, color: "text.secondary", typography: "body2", borderBottom: 0 }}>
        {children}
      </TableCell>
    </TableRow>
  );
}

export default EmptyTableRow;
