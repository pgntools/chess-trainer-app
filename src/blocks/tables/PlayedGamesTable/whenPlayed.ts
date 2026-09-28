const pad = (value: number) => String(value).padStart(2, "0");

/**
 * **When a game was begun, to the minute** (CTA-109) — `2026-09-20 18:30`,
 * in the reader's time zone: the table's date, and the time that tells two
 * rows of one day apart. It is what names a row's pick and actions, so no
 * two of them read alike. `""` for a date that will not read.
 */
export const whenPlayed = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
