/**
 * **A saved list's caption** (CTA-113, from `views/shared/savedList.ts`) —
 * the pure half of what the saved analyses' and the repertoires' rows and
 * cards print under a record's name: the facts that are there, joined, and
 * the date it last changed in the reader's own words.
 */

/**
 * A record's `updatedAt` as the reader's own date, or `""` for one that does
 * not parse. `updatedAt` is stored as ISO so the record stays plain JSON, and
 * it is a date rather than notation, so it is the one caption fact formatted
 * for the reader — in the reader's own language, `language`.
 */
export const savedListDate = (iso: string, language: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf())
    ? ""
    : date.toLocaleDateString(language, { year: "numeric", month: "short", day: "numeric" });
};

/**
 * The caption line: the facts that are there, joined with ` · `. A fact with
 * nothing to say (`""`) is dropped rather than left as an empty slot between
 * the separators.
 */
export const savedListLine = (parts: readonly string[]): string => parts.filter((part) => part !== "").join(" · ");
