import { useEffect, useRef, type RefObject } from "react";

import { reversed, syncedScrollTop, type Anchor, type PaneMetrics } from "./scrollSync";

/**
 * **The MDX editor's panes scroll together** — the DOM half of
 * `scrollSync.ts`. Scrolling either pane scrolls the other to the same place
 * in the document, measured afresh at each scroll (the preview's embeds load
 * and grow after it renders):
 *
 * - **in the preview**, each source-line marker's height (`data-source-line`,
 *   `compileMdx.ts`);
 * - **in the source**, each line's height in the textarea, its soft-wrapped
 *   lines counted: a hidden copy of the text, styled as the textarea and as
 *   wide, measured line by line — and kept until the text or the width
 *   changes.
 *
 * The scroll this sets fires the other pane's own scroll event; that one is
 * recognised (`expected`) and not followed back, so the two never chase each
 * other.
 */

/** The textarea's styles a copy of its text must share to wrap as it does. */
const WRAPPING_STYLES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
  "paddingTop",
  "paddingRight",
  "paddingLeft",
] as const;

/** Each source line's top, in the textarea's content coordinates (line 1 is index 0). */
const measureLineTops = (textarea: HTMLTextAreaElement): number[] => {
  const style = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  for (const name of WRAPPING_STYLES) mirror.style[name] = style[name];
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-10000px",
    width: `${textarea.clientWidth}px`,
    boxSizing: "border-box",
    border: "0",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  });
  for (const line of textarea.value.split("\n")) {
    const row = document.createElement("div");
    // An empty line still takes a line's height.
    row.textContent = line === "" ? "​" : line;
    mirror.append(row);
  }
  document.body.append(mirror);
  const tops = Array.from(mirror.children, (row) => (row as HTMLElement).offsetTop);
  mirror.remove();
  return tops;
};

const metricsOf = (pane: HTMLElement): PaneMetrics => ({
  scrollTop: pane.scrollTop,
  scrollHeight: pane.scrollHeight,
  clientHeight: pane.clientHeight,
});

type ScrollSyncOptions = {
  enabled: boolean;
  source: RefObject<HTMLTextAreaElement | null>;
  preview: RefObject<HTMLElement | null>;
};

export const useScrollSync = ({ enabled, source, preview }: ScrollSyncOptions) => {
  const lineTops = useRef<{ key: string; tops: number[] }>(undefined);

  useEffect(() => {
    const textarea = source.current;
    const pane = preview.current;
    if (!enabled || textarea === null || pane === null) return;

    /** The scroll this hook set last — its echo is not followed back. */
    let expected: { pane: HTMLElement; top: number } | undefined;
    let frame = 0;

    const tops = () => {
      const key = `${textarea.clientWidth}|${textarea.value}`;
      if (lineTops.current?.key !== key) lineTops.current = { key, tops: measureLineTops(textarea) };
      return lineTops.current.tops;
    };

    /** Every marker as an anchor: its line's height in the source, its own in the preview. */
    const anchors = (): Anchor[] => {
      const sourceTops = tops();
      const paneTop = pane.getBoundingClientRect().top - pane.scrollTop;
      return Array.from(pane.querySelectorAll<HTMLElement>("[data-source-line]")).flatMap((marker) => {
        const from = sourceTops[Number(marker.dataset.sourceLine) - 1];
        return from === undefined ? [] : [{ from, to: marker.getBoundingClientRect().top - paneTop }];
      });
    };

    const follow = (from: HTMLElement, to: HTMLElement, sourceLed: boolean) => {
      if (expected?.pane === from && Math.abs(from.scrollTop - expected.top) <= 1) {
        expected = undefined;
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const found = anchors();
        const top = syncedScrollTop(sourceLed ? found : reversed(found), metricsOf(from), metricsOf(to));
        if (Math.abs(to.scrollTop - top) < 1) return;
        expected = { pane: to, top };
        to.scrollTop = top;
      });
    };

    const onSource = () => follow(textarea, pane, true);
    const onPreview = () => follow(pane, textarea, false);
    textarea.addEventListener("scroll", onSource, { passive: true });
    pane.addEventListener("scroll", onPreview, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      textarea.removeEventListener("scroll", onSource);
      pane.removeEventListener("scroll", onPreview);
    };
  }, [enabled, source, preview]);
};
