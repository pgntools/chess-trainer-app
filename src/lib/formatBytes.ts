/*
  A byte count in words (CTA-94; its own pure module since CTA-113, so a
  block can show a size without importing `storageDiagnostics.ts`, which
  reads the stores).
*/

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * A byte count as a person reads it: `512 B`, `23.4 KB`, `234 MB`, `2 GB`.
 * Bytes are integers; past them one decimal is plenty, and a three-digit
 * figure needs none.
 */
export const formatBytes = (bytes: number): string => {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const text = unit === 0 || value >= 100 ? String(Math.round(value)) : value.toFixed(1);
  return `${text} ${UNITS[unit]}`;
};
