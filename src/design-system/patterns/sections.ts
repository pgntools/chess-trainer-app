/**
 * **The patterns tier's sections** (CTA-110), in the order the gallery shows
 * them. A pattern is a complex but **generic** component — it knows no chess,
 * no record, no store and no route — composed from the base components of
 * `components/` (`docs/design/hierarchy.md`). Each section is a folder under
 * `patterns/` holding its patterns, and an `index.ts` that is the section's
 * whole public surface: a block or a screen imports from a section's
 * `index.ts` and nowhere deeper.
 *
 * Adding a section is a folder, its `index.ts`, and an entry here — the
 * same as a base section (`components/sections.ts`). The titles are the
 * dev-only gallery's, so they are plain English, not catalog keys.
 */
export const PATTERN_SECTIONS = [
  { id: "tables", title: "Tables" },
  { id: "trees", title: "Trees" },
] as const;

export type PatternSectionId = (typeof PATTERN_SECTIONS)[number]["id"];
