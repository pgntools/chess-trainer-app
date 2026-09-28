import type { ReactNode } from "react";
import TableCell from "@mui/material/TableCell";

export type NumberCellProps = {
  value: number | null | undefined;
  /** How the number is written — absent, as it is (`String(value)`), so `2850` stays `2850`. */
  format?: (value: number) => string;
  /** What a missing value reads as. Default: an en dash, which needs no translation. */
  empty?: ReactNode;
  /** Muted, as a secondary figure. */
  secondary?: boolean;
  testId?: string;
};

/**
 * **A number in a table** (CTA-108): aligned to the column's end, so the
 * digits line up, in tabular figures, and pinned `dir="ltr"` so a minus sign
 * or a thousands separator never moves under RTL. Every table aligned its
 * numbers differently; this is the one way.
 */
function NumberCell({ value, format, empty = "–", secondary = false, testId }: NumberCellProps) {
  const missing = value === null || value === undefined || Number.isNaN(value);
  return (
    <TableCell
      data-testid={testId}
      sx={{
        textAlign: "end",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        color: secondary || missing ? "text.secondary" : undefined,
      }}
    >
      {missing ? empty : <bdi dir="ltr">{format === undefined ? String(value) : format(value)}</bdi>}
    </TableCell>
  );
}

export default NumberCell;
