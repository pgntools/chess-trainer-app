/**
 * **The Dialogs section's public surface** (CTA-107, filled by CTA-108) — a
 * screen imports this section's components from here and nowhere deeper.
 * Each is a folder beside this file: `Foo.tsx`, `Foo.test.tsx`,
 * `Foo.gallery.tsx` and `index.ts`. The reference is
 * `docs/design/sections/dialogs.md`.
 */
export * from "./BaseDialog";
export * from "./ConfirmDialog";
export * from "./DeleteManyDialog";
export * from "./FormDialog";
export * from "./ProgressDialog";
export * from "./FullScreenDialog";
