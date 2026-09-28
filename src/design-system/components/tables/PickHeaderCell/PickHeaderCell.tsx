import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";

export type PickHeaderCellProps = {
  /** How many rows select-all covers (the rows the filters leave, on every page). */
  total: number;
  /** How many of those are picked. */
  picked: number;
  /** Ticked: pick them all. Unticked: unpick just those rows. The caller decides what "those" are. */
  onToggleAll: () => void;
  /** The checkbox's accessible name ("Select all"). */
  label: string;
  /** The checkbox's test id. */
  testId: string;
};

/**
 * **Select-all, in the pick column's header** (CTA-108) — the Lobby's rule,
 * which the tables agree on: ticked when every covered row is picked,
 * indeterminate when some are, off when there is nothing to pick.
 */
function PickHeaderCell({ total, picked, onToggleAll, label, testId }: PickHeaderCellProps) {
  const all = total > 0 && picked >= total;
  return (
    <TableCell padding="checkbox">
      <Checkbox
        size="small"
        checked={all}
        indeterminate={picked > 0 && !all}
        disabled={total === 0}
        onChange={onToggleAll}
        slotProps={{ input: { "aria-label": label } }}
        data-testid={testId}
      />
    </TableCell>
  );
}

export default PickHeaderCell;
