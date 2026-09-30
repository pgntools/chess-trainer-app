const pad = (value: number) => String(value).padStart(2, "0");

/** A PGN's partial date as it writes it — a year, a year and month (`1848`, `1848.03`, `1848-03`). */
const PARTIAL_DATE = /^\d{4}(?:[.-]\d{2})?$/;

/**
 * **The table's one date format** (CTA-108): `YYYY-MM-DD` in the reader's own
 * time zone, with the machine-readable `dateTime` beside it. A partial PGN
 * date is shown as given (its `.` read as `-`); anything unreadable is
 * `undefined`.
 */
export const tableDate = (
  value: Date | number | string | null | undefined,
): { text: string; dateTime: string } | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "string" && PARTIAL_DATE.test(value)) {
    const text = value.replace(".", "-");
    return { text, dateTime: text };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const text = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return { text, dateTime: text };
};
