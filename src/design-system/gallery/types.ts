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
 */
export type GalleryModule = {
  section: SectionId;
  title: string;
  demos: readonly GalleryDemo[];
};
