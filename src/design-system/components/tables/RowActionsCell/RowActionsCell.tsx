import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";

export type RowActionsCellProps = {
  /** The row's icon actions (`IconAction`s). */
  children: ReactNode;
  /**
   * `always` shows them on every row; `hover` shows them on the row under the
   * pointer or holding the keyboard focus — and always on a device that
   * cannot hover.
   */
  reveal?: "always" | "hover";
  /** The actions' box. */
  testId: string;
};

/**
 * **A row's actions** (CTA-108), in a cell of their own at the row's end. A
 * click in the cell never reaches the row, so an action is never also an
 * "open". The two looks the tables had — always-visible icon columns and
 * hover-revealed ones — are one prop.
 */
function RowActionsCell({ children, reveal = "always", testId }: RowActionsCellProps) {
  return (
    <TableCell padding="none" onClick={(event) => event.stopPropagation()} sx={{ whiteSpace: "nowrap", width: "1%" }}>
      <Box
        data-testid={testId}
        data-reveal={reveal}
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 0.25,
          paddingInlineEnd: 0.5,
          ...(reveal === "hover" && {
            opacity: 0,
            transition: (theme) => theme.transitions.create("opacity", { duration: 120 }),
            ".MuiTableRow-root:hover &, .MuiTableRow-root:focus-within &": { opacity: 1 },
            "@media (hover: none)": { opacity: 1 },
          }),
        }}
      >
        {children}
      </Box>
    </TableCell>
  );
}

export default RowActionsCell;
