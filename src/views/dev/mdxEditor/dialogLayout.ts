/**
 * **The MDX editor's workspace dialogs' layout** (CTA-137) — Add PGN and
 * Add component: two columns from `md` (controls at the inline start, the
 * text they are about filling the rest), one over the other below it, and
 * the editor's own monospace box for machine text.
 */

/** Two columns from `md`, filling the dialog's height, each scrolling on its own; below `md` one over the other, the page scrolling. */
export const COLUMNS = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(260px, 380px) minmax(0, 1fr)" },
  gridTemplateRows: { md: "minmax(0, 1fr)" },
  height: { md: "max(440px, calc(100vh - 200px))" },
} as const;

/** The inline-start column: a stack of controls, scrolling on its own from `md`. */
export const SIDE_COLUMN = { display: "grid", gap: 2, alignContent: "start", minHeight: 0, overflowY: { md: "auto" } } as const;

/** A box of machine text — a PGN, a component's markup — as the editor's own source box. */
export const TEXTAREA_SX = {
  flex: 1,
  minHeight: 240,
  resize: "vertical",
  p: 1.5,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 13,
  lineHeight: 1.5,
  color: "text.primary",
  bgcolor: "background.paper",
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  "&:focus-visible": { outline: 2, outlineStyle: "solid", outlineColor: "primary.main", outlineOffset: 1 },
} as const;
