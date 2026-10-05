/**
 * **The MDX editor's workspace dialogs' layout** (CTA-137) — Add PGN and
 * Add component: two columns from `md` (controls at the inline start, the
 * text they are about filling the rest), one over the other below it, and
 * the editor's own monospace box for machine text.
 */

/** Two columns from `md`, filling the dialog's body, each scrolling on its own; below `md` one over the other, the body scrolling. */
export const COLUMNS = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(340px, 520px) minmax(0, 1fr)" },
  gridTemplateRows: { md: "minmax(0, 1fr)" },
  // From md the dialog (width="full") has a definite height: the columns fill its body exactly, so the body itself never scrolls.
  height: { md: "100%" },
} as const;

/** The inline-start column: a stack of controls, scrolling on its own from `md`. */
export const SIDE_COLUMN = {
  display: "grid",
  gap: 2,
  alignContent: "start",
  minHeight: 0,
  overflowY: { md: "auto" },
  // Never sideways: what is too long is cut with an ellipsis (`ELLIPSIS`). A little room either side keeps the focus rings in.
  overflowX: "hidden",
  px: 0.5,
  // A grid item is as wide as its longest unbreakable line unless told otherwise — a long file name would push the column wide.
  "& > *": { minWidth: 0 },
} as const;

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

/** One line cut with an ellipsis where it runs out of room — its whole text a `title`, read on hover. */
export const ELLIPSIS = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 } as const;
