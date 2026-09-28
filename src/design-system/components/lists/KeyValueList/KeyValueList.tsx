import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/** One fact: its key (stable, for its test id), the words that name it, its value. */
export type KeyValueRow = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  /** `ltr` for a value that must never turn (a date, a result, a name in Latin letters); `auto` for a reader's words. */
  dir?: "ltr" | "auto";
};

export type KeyValueListProps = {
  rows: readonly KeyValueRow[];
  /** The list's accessible name, when nothing on screen names it. */
  ariaLabel?: string;
  /** The `dl`'s test id; each value is `<testId>-<id>`. */
  testId: string;
};

/**
 * **Facts as a two-column list** (CTA-113) — a description list (`dl`), the
 * names muted and never wrapping, the values beside them wrapping anywhere
 * and isolated (`unicode-bidi: isolate`), so a Latin value in a mirrored
 * panel keeps its own order. A game's tags (`GameInfo`) were the first;
 * any other "what is this" panel is the same shape.
 */
function KeyValueList({ rows, ariaLabel, testId }: KeyValueListProps) {
  return (
    <Box
      component="dl"
      aria-label={ariaLabel}
      data-testid={testId}
      sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.5, alignItems: "baseline" }}
    >
      {rows.map((row) => (
        <Box key={row.id} sx={{ display: "contents" }}>
          <Typography component="dt" variant="body2" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
            {row.label}
          </Typography>
          <Typography
            component="dd"
            variant="body2"
            dir={row.dir}
            data-testid={`${testId}-${row.id}`}
            sx={{ m: 0, unicodeBidi: "isolate", overflowWrap: "anywhere" }}
          >
            {row.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default KeyValueList;
