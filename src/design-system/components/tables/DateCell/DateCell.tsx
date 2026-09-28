import type { ReactNode } from "react";
import TableCell from "@mui/material/TableCell";

import { tableDate } from "./tableDate";

export type DateCellProps = {
  /** A `Date`, a timestamp, an ISO string — or a partial date as a PGN writes it (`1848`, `1848.03`), shown as given. */
  value: Date | number | string | null | undefined;
  /** What a missing or unreadable value reads as. Default: an en dash. */
  empty?: ReactNode;
  testId?: string;
};

/**
 * **A date in a table** (CTA-108), in **one format** — `YYYY-MM-DD`, the
 * reader's own day — pinned `dir="ltr"` inside a `<time>`. Three tables wrote
 * three formats (a short month, the PGN's own, `dateStyle: medium`); a
 * numeric date reads the same in every language and sorts as it reads.
 */
function DateCell({ value, empty = "–", testId }: DateCellProps) {
  const shown = tableDate(value);
  return (
    <TableCell data-testid={testId} sx={{ whiteSpace: "nowrap", color: shown === undefined ? "text.secondary" : undefined }}>
      {shown === undefined ? (
        empty
      ) : (
        <time dir="ltr" dateTime={shown.dateTime}>
          {shown.text}
        </time>
      )}
    </TableCell>
  );
}

export default DateCell;
