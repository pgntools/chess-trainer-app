import type { ReactNode } from "react";

import type { SectionId } from "../components/sections";

/** One variation of a component, as the gallery shows it. */
export type GalleryDemo = {
  /** The variation's name — "Default", "Destructive", "Dense", … */
  name: string;
  render: () => ReactNode;
};

/**
 * **What a `*.gallery.tsx` default-exports** (CTA-107): the section it
 * belongs to, the component's title, and its demos — one per variation. The
 * gallery discovers every such file by itself (`discover.ts`); a component
 * adds one beside its `Foo.tsx` and needs no registration anywhere.
 *
 * `S` is the tier's registry of sections (CTA-110): a base component's is
 * the default, `SectionId`; a pattern's `GalleryModule<PatternSectionId>`; a
 * block's `GalleryModule<BlockFamilyId>`.
 */
export type GalleryModule<S extends string = SectionId> = {
  section: S;
  title: string;
  demos: readonly GalleryDemo[];
};

/**
 * A component's gallery module as discovered (CTA-110): its `id` is the
 * folder it sits in — `TableFrame` for `tables/TableFrame/TableFrame.gallery.tsx` —
 * and the last segment of its page (`/dev/design/tables/TableFrame`).
 */
export type GalleryEntry = GalleryModule<string> & { id: string };

/** A section as the gallery shows it: its title and its components' modules. */
export type GallerySection = { id: string; title: string; modules: GalleryEntry[] };

/**
 * **A tier of the hierarchy, as the gallery's menu groups it** (CTA-110) —
 * Base, Patterns, Blocks (`docs/design/hierarchy.md`). `id` is the first
 * segment of its sections' pages (`patterns/tables`); the base tier's is
 * `""`, so its pages stay `/dev/design/<section>`.
 */
export type GalleryTier = { id: string; title: string; sections: GallerySection[] };
