import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";

import { nativeIndeterminate } from "../../a11y";

/**
 * The bar's select-all — all four together, or none (CTA-113): a table whose
 * select-all is in its own header (`DataTable`) keeps the bar for the chip
 * and the actions only.
 */
type SelectionBarSelectAll =
  | {
      /** Every row select-all covers is picked. */
      checked: boolean;
      /** Some, not all, are — the tri-state's middle. */
      indeterminate: boolean;
      onToggleAll: () => void;
      /** The select-all box's name and tooltip ("Select all"). */
      selectAllLabel: string;
    }
  | { checked?: undefined; indeterminate?: undefined; onToggleAll?: undefined; selectAllLabel?: undefined };

export type SelectionBarProps = SelectionBarSelectAll & {
  /** How many are picked, over everything the caller keeps picked; the chip shows while there are any. */
  count: number;
  /** The chip's words ("3 picked"). */
  countLabel: string;
  /** The chip's clear. */
  onClear: () => void;
  /** What the chip's cross does ("Clear the picks") — its title; the chip itself clears on Delete or Backspace. */
  clearLabel: string;
  /** What the picks can be used for — `IconAction`s (download, delete), each off while `count` is 0. */
  actions?: ReactNode;
  /**
   * The prefix of its parts' ids: `<testId>-select-all`, `-selected-count`.
   * The bar itself is `<testId>-export` (the saved lists' name for it) unless `rootTestId` says otherwise.
   */
  testId: string;
  rootTestId?: string;
};

/**
 * **What the picks of a list can do** (CTA-113) — the saved lists' export
 * bar: a tri-state select-all (what it covers is the caller's — a folder,
 * the rows a filter leaves), a chip counting the picks that clears them, and
 * the caller's actions. A table's select-all lives in its header instead
 * (`DataTable`): beside a table the bar leaves its own out (no `onToggleAll`)
 * and is the chip and the actions only — a collection's games.
 */
function SelectionBar({
  checked,
  indeterminate,
  onToggleAll,
  selectAllLabel,
  count,
  countLabel,
  onClear,
  clearLabel,
  actions,
  testId,
  rootTestId = `${testId}-export`,
}: SelectionBarProps) {
  return (
    <Box data-testid={rootTestId} sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
      {onToggleAll !== undefined && (
        <Tooltip title={selectAllLabel}>
          <Checkbox
            size="small"
            checked={checked}
            indeterminate={indeterminate}
            onChange={onToggleAll}
            slotProps={{ input: { "aria-label": selectAllLabel, ref: nativeIndeterminate(indeterminate) } as object }}
            data-testid={`${testId}-select-all`}
          />
        </Tooltip>
      )}
      {count > 0 && (
        <Chip
          size="small"
          label={countLabel}
          onDelete={onClear}
          // The chip is the button (Delete or Backspace clears it); the cross says what it does.
          deleteIcon={<CancelRoundedIcon titleAccess={clearLabel} />}
          data-testid={`${testId}-selected-count`}
        />
      )}
      {actions}
    </Box>
  );
}

export default SelectionBar;
