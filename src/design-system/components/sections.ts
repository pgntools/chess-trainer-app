/**
 * **The design system's MAIN sections** (CTA-107), in the order the gallery
 * shows them. Each is a folder under `components/` holding its base
 * components and their variations, and an `index.ts` that is the section's
 * whole public surface — a screen imports from a section's `index.ts` and
 * nowhere deeper.
 *
 * Adding a section is a folder, its `index.ts`, and an entry here. The titles
 * are the dev-only gallery's, so they are plain English, not catalog keys.
 */
export const SECTIONS = [
  { id: "dialogs", title: "Dialogs" },
  { id: "tables", title: "Tables" },
  { id: "forms", title: "Forms" },
  { id: "autocompletes", title: "Autocompletes" },
  { id: "feedback", title: "Feedback" },
  { id: "states", title: "States" },
  { id: "toolbars", title: "Toolbars" },
  { id: "navigation", title: "Navigation" },
  { id: "tabs", title: "Tabs" },
  { id: "menus", title: "Menus" },
  { id: "lists", title: "Lists" },
  { id: "cards", title: "Cards" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
