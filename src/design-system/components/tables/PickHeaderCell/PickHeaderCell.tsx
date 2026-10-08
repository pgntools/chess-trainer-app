import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";

import { nativeIndeterminate } from "../../a11y";

export type PickHeaderCellProps = {
  /** How many rows select-all covers (the rows the filters leave, on every page). */
  total: number;
  /** How many of those are picked. */
  picked: number;
  /**
   * The caller's own tri-state (CTA-147) — a select-all whose coverage is
   * more than the pickable rows (a tree table where a folder's pick covers
   * its whole subtree, closed folders' contents unshown). Absent, the rows
   * above decide it.
   */
  state?: { checked: boolean; indeterminate: boolean; disabled: boolean };
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
function PickHeaderCell({ total, picked, state, onToggleAll, label, testId }: PickHeaderCellProps) {
  const all = total > 0 && picked >= total;
  const checked = state?.checked ?? all;
  const indeterminate = state?.indeterminate ?? (picked > 0 && !all);
  return (
    <TableCell padding="checkbox">
      <Checkbox
        size="small"
        checked={checked}
        indeterminate={indeterminate}
        disabled={state?.disabled ?? total === 0}
        onChange={onToggleAll}
        slotProps={{ input: { "aria-label": label, ref: nativeIndeterminate(indeterminate) } as object }}
        data-testid={testId}
      />
    </TableCell>
  );
}

export default PickHeaderCell;
