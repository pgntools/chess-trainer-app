import { SECTIONS } from "../components/sections";
import type { GalleryModule } from "./types";

/** A section as the gallery shows it: its title and its components' modules. */
export type GallerySection = { id: string; title: string; modules: GalleryModule[] };

/**
 * Groups gallery modules by section, in {@link SECTIONS}' order, each
 * section's modules by title. A section with no module is left out; a module
 * naming a section that is not registered is shown under that id, last, so a
 * typo is visible rather than silently dropped.
 */
export const groupGallery = (modules: Iterable<GalleryModule>): GallerySection[] => {
  const byId = new Map<string, GalleryModule[]>();
  for (const module of modules) {
    byId.set(module.section, [...(byId.get(module.section) ?? []), module]);
  }
  const known = new Set<string>(SECTIONS.map((section) => section.id));
  const ordered = [
    ...SECTIONS.map(({ id, title }) => ({ id, title })),
    ...[...byId.keys()].filter((id) => !known.has(id)).map((id) => ({ id, title: id })),
  ];
  return ordered.flatMap(({ id, title }) => {
    const found = byId.get(id);
    if (found === undefined) return [];
    return [{ id, title, modules: [...found].sort((a, b) => a.title.localeCompare(b.title)) }];
  });
};

/**
 * **Every `*.gallery.tsx` under `components/`**, found by Vite's
 * `import.meta.glob` at build time — so a new component's demos appear with
 * no registration. Eager, because the gallery is itself one lazy, dev-only
 * chunk (`App.tsx`'s Development routes): nothing here reaches production.
 */
export const discoverGallery = (): GallerySection[] =>
  groupGallery(
    Object.values(
      import.meta.glob<GalleryModule>("../components/**/*.gallery.tsx", {
        eager: true,
        import: "default",
      }),
    ),
  );
