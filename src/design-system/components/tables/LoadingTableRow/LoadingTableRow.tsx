import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

export type LoadingTableRowProps = {
  colSpan: number;
  /** "Reading…". */
  children: ReactNode;
  testId: string;
};

/**
 * **A table whose rows are still being read** (CTA-108): one row across
 * every column, a small spinner beside the caller's line (announced as a
 * `status`; the spinner itself is decoration), marked busy — the
 * header stays, so the table does not jump when the rows land.
 */
function LoadingTableRow({ colSpan, children, testId }: LoadingTableRowProps) {
  return (
    <TableRow data-testid={testId} aria-busy="true">
      <TableCell colSpan={colSpan} sx={{ py: 3, borderBottom: 0 }}>
        <Box
          role="status"
          sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, color: "text.secondary", typography: "body2" }}
        >
          <CircularProgress aria-hidden size={16} color="inherit" />
          {children}
        </Box>
      </TableCell>
    </TableRow>
  );
}

export default LoadingTableRow;
