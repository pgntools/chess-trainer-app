import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";

export type PickCellProps = {
  checked: boolean;
  onToggle: () => void;
  /** The checkbox's accessible name — the row's, not "Pick" alone ("Pick game 12"). */
  label: string;
  /** The checkbox's test id. */
  testId: string;
};

/**
 * **A row's pick** (CTA-108). A click on it picks the row and never reaches
 * the row itself, so a table whose row click opens something can still be
 * picked from.
 */
function PickCell({ checked, onToggle, label, testId }: PickCellProps) {
  return (
    <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
      <Checkbox
        size="small"
        checked={checked}
        onChange={onToggle}
        slotProps={{ input: { "aria-label": label } }}
        data-testid={testId}
      />
    </TableCell>
  );
}

export default PickCell;
