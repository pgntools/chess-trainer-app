/**
 * **The MDX editor's section dialogs' layout** (CTA-137, CTA-139) — PGNs,
 * Components and Images: the article's items in a list at the inline start,
 * the chosen one's editor filling the rest (`SECTION`); inside the editor,
 * two columns from `lg` (controls at the inline start, the text they are
 * about filling the rest), one over the other below it; and the editor's
 * own monospace box for machine text.
 */

/** The list, then the editor, from `md`, filling the dialog's body, each scrolling on its own; below `md` one over the other, the body scrolling. */
export const SECTION = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(200px, 280px) minmax(0, 1fr)" },
  gridTemplateRows: { md: "minmax(0, 1fr)" },
  // From md the dialog (width="full") has a definite height: the columns fill its body exactly, so the body itself never scrolls.
  height: { md: "100%" },
} as const;

/** The list's column: its heading over the list, scrolling on its own from `md`, a rule between it and the editor. */
export const LIST_COLUMN = {
  display: "grid",
  gap: 1,
  alignContent: "start",
  minHeight: 0,
  overflowY: { md: "auto" },
  pe: { md: 2 },
  borderInlineEnd: { md: 1 },
  borderColor: { md: "divider" },
  "& > *": { minWidth: 0 },
} as const;

/** The editor beside the list: a column — its head, then `COLUMNS` filling the rest from `lg`; between `md` and `lg` the whole of it scrolls. */
export const PANE = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minHeight: 0,
  minWidth: 0,
  overflowY: { md: "auto", lg: "hidden" },
} as const;

/** Two columns from `lg`, filling what is left of the editor, each scrolling on its own; below `lg` one over the other. */
export const COLUMNS = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(300px, 440px) minmax(0, 1fr)" },
  gridTemplateRows: { lg: "minmax(0, 1fr)" },
  flex: { lg: 1 },
  minHeight: 0,
} as const;

/** The inline-start column: a stack of controls, scrolling on its own from `lg`. */
export const SIDE_COLUMN = {
  display: "grid",
  gap: 2,
  alignContent: "start",
  minHeight: 0,
  overflowY: { lg: "auto" },
  // Never sideways: what is too long is cut with an ellipsis (`ELLIPSIS`). A little room either side keeps the focus rings in.
  overflowX: "hidden",
  px: 0.5,
  // A grid item is as wide as its longest unbreakable line unless told otherwise — a long file name would push the column wide.
  "& > *": { minWidth: 0 },
} as const;

/** The column beside it — the text, the code, the preview — scrolling on its own from `lg`. */
export const MAIN_COLUMN = { display: "flex", flexDirection: "column", gap: 1, minHeight: 0, overflowY: { lg: "auto" } } as const;

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
