import type { ReactNode } from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";

/** One way to draw the list: its value, its name (the tooltip and the button's name) and its icon. */
export type ViewOption<V extends string = string> = { value: V; label: string; icon: ReactNode };

export type ViewToggleProps<V extends string = string> = {
  value: V;
  /** Called on a real change only — a click on the pressed button is swallowed, so a view is always shown. */
  onChange: (value: V) => void;
  options: readonly ViewOption<V>[];
  /** The group's accessible name ("View"). */
  ariaLabel: string;
  /** The group's test id; each button is `<testId>-<value>`. */
  testId: string;
};

/**
 * **How a list is drawn** (CTA-113) — the saved lists' list / compact cards /
 * comfortable cards switch: a small exclusive group of icon buttons, each
 * named by its words (its tooltip and its accessible name), never empty. It
 * was `SavedListViewToggle`, the only icon-only toggle group. MUI's group is
 * one tab stop: the arrow keys move between the views, Enter or Space picks.
 */
function ViewToggle<V extends string = string>({ value, onChange, options, ariaLabel, testId }: ViewToggleProps<V>) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_event, next: V | null) => {
        if (next !== null) onChange(next);
      }}
      aria-label={ariaLabel}
      data-testid={testId}
      sx={{ flexShrink: 0 }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value} aria-label={option.label} data-testid={`${testId}-${option.value}`}>
          {/* Inside the button (a tooltip around a toggle button breaks the group), describing it: the button carries the name. */}
          <Tooltip title={option.label} describeChild>
            <span style={{ display: "inline-flex" }}>{option.icon}</span>
          </Tooltip>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default ViewToggle;
