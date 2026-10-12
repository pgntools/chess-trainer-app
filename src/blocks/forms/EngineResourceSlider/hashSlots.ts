/**
 * **The Hash slider's marks** (CTA-185) — the powers of two from 16 MB (the
 * engine's default) up to the slider's top, and the top itself where it is no
 * power of two. The slider is linear — a mark sits where its size falls — and
 * snaps to the marks alone; a size typed between two is shown where it falls.
 */

/** The first mark: Stockfish's own default Hash. */
const FIRST_STOP_MB = 16;

/** The least room between two labels, as a share of the slider — closer, they run into each other. */
const MIN_LABEL_GAP = 0.09;

/** The sizes the slider stops at, in MB, smallest first — never empty. */
export const hashStopsOf = (topMb: number): number[] => {
  const stops: number[] = [];
  for (let mb = FIRST_STOP_MB; mb <= topMb; mb *= 2) stops.push(mb);
  if (stops.length === 0 || stops[stops.length - 1] < topMb) stops.push(topMb);
  return stops;
};

/**
 * Which marks carry a label: the whole gigabytes — 1, 2, 4 … GB — or, where
 * fewer than three fit (an in-browser build's 1024 MB top), every mark from
 * 128 MB; from the smallest up, each at least {@link MIN_LABEL_GAP} of the
 * slider past the one before, and the top always — the label before it
 * dropped where the two would meet.
 */
export const hashLabelledStops = (stops: readonly number[], minMb: number): number[] => {
  const gigabytes = stops.filter((mb) => mb >= 1024 && mb % 1024 === 0);
  const candidates = gigabytes.length >= 3 ? gigabytes : stops.filter((mb) => mb >= 128);
  const top = stops[stops.length - 1];
  const gap = (top - minMb) * MIN_LABEL_GAP;
  const labelled: number[] = [];
  for (const mb of candidates) {
    if (mb === top) continue;
    if (labelled.length === 0 || mb - labelled[labelled.length - 1] >= gap) labelled.push(mb);
  }
  while (labelled.length > 0 && top - labelled[labelled.length - 1] < gap) labelled.pop();
  return [...labelled, top];
};
