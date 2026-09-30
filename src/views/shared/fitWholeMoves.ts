/*
  Cutting a collapsed variation line at a whole move (CTA-116).

  `BestVariations` prints an engine line on one row and clips it at the
  panel's edge. Clipped by CSS alone, the last move is cut wherever the edge
  falls: 16–23 px of a button showing, under WCAG 2.5.8's 24 px, and — for a
  move that is only half in sight — still a tab stop. So the row is fitted
  after layout instead: every move is measured against the row's edge, the
  ones that do not fit whole are taken out of the layout (`display: none`, so
  out of the tab order and the accessibility tree too) and an ellipsis marks
  the cut.

  It works on the DOM because the answer is a fact about layout, and
  layout is only known after render. Doing it in state would render every line
  twice per change; here the row renders once and is fitted in the same
  commit, before the browser paints.

  Markup contract — inside the row's span: any number of `[data-move]`
  elements, in order, and one `[data-more]` (the ellipsis), last. The span's
  `data-expanded="true"` means the reader opened the row: everything shows.
*/

/**
 * The space between the last move that stays and the ellipsis after it — the
 * plain space the line is written with, at the line's monospace 13px.
 */
const GAP_PX = 8;

/** Sub-pixel layout rounds; a move whose edge is within this of the row's still fits. */
const TOLERANCE_PX = 0.5;

/**
 * Show every move of a row that has room for them all, otherwise stop at the
 * last whole move that leaves room for the ellipsis. Safe to call again on any
 * change of the row, its moves or its width: it starts from everything shown.
 *
 * A row laid out nowhere (jsdom, a `display: none` ancestor) has no width and
 * nothing to fit: every move shows, as it did before this existed.
 */
export function fitWholeMoves(box: HTMLElement): void {
  const moves = Array.from(box.querySelectorAll<HTMLElement>("[data-move]"));
  const more = box.querySelector<HTMLElement>("[data-more]");
  for (const move of moves) move.style.display = "";
  if (more === null) return;
  more.style.display = "none";
  if (box.dataset.expanded === "true") return;

  const edge = box.getBoundingClientRect();
  if (edge.width === 0) return;
  const limit = edge.right + TOLERANCE_PX;

  const firstCut = moves.findIndex((move) => move.getBoundingClientRect().right > limit);
  if (firstCut === -1) return; // they all fit

  // The ellipsis needs room too: give up moves from the end until it has some.
  more.style.display = "";
  const moreWidth = more.getBoundingClientRect().width;
  let keep = firstCut;
  while (keep > 0 && moves[keep - 1].getBoundingClientRect().right + GAP_PX + moreWidth > limit) keep -= 1;
  for (let index = keep; index < moves.length; index += 1) moves[index].style.display = "none";
}
