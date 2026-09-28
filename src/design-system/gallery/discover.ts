import { SECTIONS } from "../components/sections";
import { PATTERN_SECTIONS } from "../patterns/sections";
import type { GalleryEntry, GalleryModule, GallerySection, GalleryTier } from "./types";

/** A title as a page segment, for a module that arrives without a file to name it: its first word. */
const idOfTitle = (title: string) => title.match(/[A-Za-z0-9]+/)?.[0] ?? "component";

/**
 * **An `import.meta.glob` of `*.gallery.tsx` files as entries** (CTA-110):
 * each module with its `id`, the name of the folder it sits in — so a page's
 * address is the component's own name, whatever its title says.
 */
export const galleryEntriesOf = (glob: Record<string, GalleryModule<string>>): GalleryEntry[] =>
  Object.entries(glob).map(([path, module]) => {
    const parts = path.split("/");
    return { ...module, id: parts[parts.length - 2] ?? idOfTitle(module.title) };
  });

/**
 * Groups gallery modules by section, in `registry`'s order (the base tier's
 * {@link SECTIONS} unless another is given), each section's modules by
 * title. A section with no module is left out; a module naming a section that
 * is not registered is shown under that id, last, so a typo is visible
 * rather than silently dropped.
 */
export const groupGallery = (
  modules: Iterable<GalleryModule<string> & { id?: string }>,
  registry: readonly { id: string; title: string }[] = SECTIONS,
): GallerySection[] => {
  const byId = new Map<string, GalleryEntry[]>();
  for (const module of modules) {
    const entry = { ...module, id: module.id ?? idOfTitle(module.title) };
    byId.set(module.section, [...(byId.get(module.section) ?? []), entry]);
  }
  const known = new Set<string>(registry.map((section) => section.id));
  const ordered = [
    ...registry.map(({ id, title }) => ({ id, title })),
    ...[...byId.keys()].filter((id) => !known.has(id)).map((id) => ({ id, title: id })),
  ];
  return ordered.flatMap(({ id, title }) => {
    const found = byId.get(id);
    if (found === undefined) return [];
    return [{ id, title, modules: [...found].sort((a, b) => a.title.localeCompare(b.title)) }];
  });
};

/**
 * **Every `*.gallery.tsx` under `components/`** — the base tier — found by
 * Vite's `import.meta.glob` at build time, so a new component's demos appear
 * with no registration. Eager, because the gallery is itself one lazy,
 * dev-only chunk (`App.tsx`'s Development routes): nothing here reaches
 * production.
 */
export const discoverGallery = (): GallerySection[] =>
  groupGallery(
    galleryEntriesOf(
      import.meta.glob<GalleryModule>("../components/**/*.gallery.tsx", {
        eager: true,
        import: "default",
      }),
    ),
  );

/** **Every `*.gallery.tsx` under `patterns/`** (CTA-110), grouped by {@link PATTERN_SECTIONS}. */
export const discoverPatterns = (): GallerySection[] =>
  groupGallery(
    galleryEntriesOf(
      import.meta.glob<GalleryModule<string>>("../patterns/**/*.gallery.tsx", {
        eager: true,
        import: "default",
      }),
    ),
    PATTERN_SECTIONS,
  );

/**
 * **The design system's own tiers** (CTA-110) — Base and Patterns. The third,
 * Blocks, lives outside the design system (`src/blocks/`), which may not
 * import it; the dev route discovers it and hands it to the gallery.
 */
export const discoverTiers = (): GalleryTier[] => [
  { id: "", title: "Base", sections: discoverGallery() },
  { id: "patterns", title: "Patterns", sections: discoverPatterns() },
];

/**
 * A section's key: the bare id in the base tier (`tables`), `<tier>/<id>` in
 * another (`patterns/tables`). A component's page is the section's key and
 * the component's id (`tables/TableFrame`, `patterns/tables/DataTable`).
 */
export const pageKeyOf = (tier: string, section: string): string => (tier === "" ? section : `${tier}/${section}`);
