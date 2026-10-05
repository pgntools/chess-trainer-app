/**
 * **Scrolling the MDX editor's two panes together** — the pure part: where
 * one pane's scroll position lands in the other.
 *
 * Each top-level block of the document is an **anchor**: a source line, at
 * some height in the source pane and some height in the preview (its marker,
 * `compileMdx.ts`). Between two anchors a position is interpolated linearly,
 * so a long table or a board on the right stays level with its markup on the
 * left, wherever their heights differ.
 *
 * The point compared is not the panes' top edge but a **probe** that slides
 * from the top edge to the bottom edge as the pane scrolls from top to
 * bottom: so the start of one is the start of the other, and the end the end.
 */

/** A block's height in each pane, in its content's coordinates (0 is the content's top). */
export type Anchor = { from: number; to: number };

/** A pane's scroll metrics. */
export type PaneMetrics = { scrollTop: number; scrollHeight: number; clientHeight: number };

/**
 * The anchors in order, both heights rising, from the content's top to its
 * bottom: a block whose height does not rise on either side (a marker that
 * drew nothing, a comment) is dropped, so every segment can be interpolated.
 */
export const usableAnchors = (anchors: readonly Anchor[], fromHeight: number, toHeight: number): Anchor[] => {
  const kept: Anchor[] = [{ from: 0, to: 0 }];
  for (const anchor of [...anchors].sort((a, b) => a.from - b.from)) {
    const last = kept[kept.length - 1];
    if (anchor.from > last.from && anchor.to > last.to && anchor.from < fromHeight && anchor.to < toHeight) kept.push(anchor);
  }
  const last = kept[kept.length - 1];
  if (fromHeight > last.from && toHeight > last.to) kept.push({ from: fromHeight, to: toHeight });
  return kept;
};

/** A height in the `from` pane's content, as the `to` pane's — linear between the anchors either side. */
export const mapHeight = (anchors: readonly Anchor[], y: number): number => {
  if (anchors.length === 0) return y;
  if (y <= anchors[0].from) return anchors[0].to;
  for (let index = 1; index < anchors.length; index++) {
    const [a, b] = [anchors[index - 1], anchors[index]];
    if (y <= b.from) return a.to + ((y - a.from) / (b.from - a.from)) * (b.to - a.to);
  }
  return anchors[anchors.length - 1].to;
};

/** The `to` pane's scrollTop that keeps it level with the `from` pane. */
export const syncedScrollTop = (anchors: readonly Anchor[], from: PaneMetrics, to: PaneMetrics): number => {
  const fromMax = from.scrollHeight - from.clientHeight;
  const toMax = to.scrollHeight - to.clientHeight;
  if (toMax <= 0) return 0;
  const ratio = fromMax <= 0 ? 0 : Math.min(1, Math.max(0, from.scrollTop / fromMax));
  const probe = from.scrollTop + ratio * from.clientHeight;
  const target = mapHeight(usableAnchors(anchors, from.scrollHeight, to.scrollHeight), probe) - ratio * to.clientHeight;
  return Math.min(toMax, Math.max(0, target));
};

/** The same anchors read the other way — for a scroll that starts in the `to` pane. */
export const reversed = (anchors: readonly Anchor[]): Anchor[] => anchors.map(({ from, to }) => ({ from: to, to: from }));
