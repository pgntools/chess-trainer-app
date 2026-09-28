/** Which way a column is sorted. */
export type SortDirection = "asc" | "desc";

/** A cell's value as the sort sees it; `undefined`, `null`, `""` and `NaN` are missing. */
export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const isMissing = (value: SortValue): value is null | undefined | "" =>
  value === undefined || value === null || value === "" || (typeof value === "number" && Number.isNaN(value));

/**
 * Two present values, ascending: numbers numerically, anything else with a
 * numeric-aware collator (round `1.10` after `1.9`), a number before a string.
 */
export const compareSortValues = (a: string | number, b: string | number): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return collator.compare(a, b);
};

/**
 * **A table's rows in a column's order** (CTA-108) — the three sortable
 * tables' rule, written once: **a missing value sorts last in either
 * direction**, and rows the column cannot tell apart go by `tieBreak` (the
 * caller decides whether a tie follows the direction). Stable, and a new
 * array; `rows` is left as it was.
 */
export const sortRows = <R, C>(
  rows: readonly R[],
  column: C,
  direction: SortDirection,
  valueOf: (row: R, column: C) => SortValue,
  tieBreak?: (a: R, b: R) => number,
): R[] => {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = valueOf(a, column);
    const right = valueOf(b, column);
    const leftMissing = isMissing(left);
    const rightMissing = isMissing(right);
    if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
    const order = leftMissing || rightMissing ? 0 : sign * compareSortValues(left, right);
    return order !== 0 ? order : (tieBreak?.(a, b) ?? 0);
  });
};
