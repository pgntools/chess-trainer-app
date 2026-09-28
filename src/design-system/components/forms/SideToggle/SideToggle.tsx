import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import type { VisibleLabel } from "../../a11y";

/** A side, or — with the "all" button — neither in particular. */
export type SideValue = "white" | "black" | "all";

export type SideToggleProps<V extends SideValue = "white" | "black"> = {
  value: V;
  /** Never called with nothing: a click on the pressed button is swallowed. */
  onChange: (value: V) => void;
  /** The buttons' words — `all` only with `withAll`. */
  labels: { white: VisibleLabel; black: VisibleLabel; all?: VisibleLabel };
  /** A first button for "either side" (a filter). */
  withAll?: boolean;
  /** Stretch over the row (a form) rather than size to the words. */
  fullWidth?: boolean;
  disabled?: boolean;
  /** The group's accessible name ("Side", "Play as"). */
  ariaLabel: string;
  /** The group's test id; the buttons are `<testId>-white`, `-black`, `-all`. */
  testId: string;
};

/**
 * **White / Black** (CTA-108) — the side choice eight `ToggleButtonGroup`s
 * made with five looks: small, exclusive, never empty; `withAll` adds the
 * filters' "all", `fullWidth` stretches it over a form's row.
 */
function SideToggle<V extends SideValue = "white" | "black">({
  value,
  onChange,
  labels,
  withAll = false,
  fullWidth = false,
  disabled = false,
  ariaLabel,
  testId,
}: SideToggleProps<V>) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      fullWidth={fullWidth}
      disabled={disabled}
      aria-label={ariaLabel}
      data-testid={testId}
      onChange={(_event, next: V | null) => {
        if (next !== null) onChange(next);
      }}
    >
      {withAll && (
        <ToggleButton value="all" data-testid={`${testId}-all`} sx={{ px: 1.5 }}>
          {labels.all}
        </ToggleButton>
      )}
      <ToggleButton value="white" data-testid={`${testId}-white`} sx={{ px: 1.5 }}>
        {labels.white}
      </ToggleButton>
      <ToggleButton value="black" data-testid={`${testId}-black`} sx={{ px: 1.5 }}>
        {labels.black}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default SideToggle;
