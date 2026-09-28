/**
 * **The blocks' families** (CTA-110), in the order the gallery's Blocks tier
 * shows them. A block is a complex, **domain-aware**, presentational
 * component — it knows the app's data shapes (a played game, a collection's
 * rows, a PGN) but never where they come from (`docs/design/hierarchy.md`).
 * Blocks are grouped by what they are, so every table sits beside every
 * other table in the gallery, whichever module it serves.
 *
 * A family is a folder under `src/blocks/` holding its blocks, each a folder
 * of its own, and an `index.ts` that is the family's whole public surface: a
 * screen imports a block from its family's `index.ts` and nowhere deeper. A
 * family is registered here before its first block arrives; the folder comes
 * with that block. The titles are the dev-only gallery's, so they are plain
 * English, not catalog keys.
 */
export const BLOCK_FAMILIES = [
  { id: "tables", title: "Tables" },
  { id: "trees", title: "Trees" },
  { id: "forms", title: "Forms" },
  { id: "dialogs", title: "Dialogs" },
  { id: "lists", title: "Lists" },
  { id: "cards", title: "Cards" },
  { id: "panels", title: "Panels" },
] as const;

export type BlockFamilyId = (typeof BLOCK_FAMILIES)[number]["id"];
