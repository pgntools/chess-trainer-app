import { useEffect, useState } from "react";
import { createSearchParams, Link as RouterLink } from "react-router";

import type { LinkTarget } from "../../design-system/components/link";
import {
  getPositionBook,
  loadOpeningBook,
  stickyOpening,
  type LastKnownOpening,
  type OpeningBook,
  type OpeningEntry,
  type PositionBook,
} from "../../lib/openings";

type Loaded = { book: OpeningBook; positionBook: PositionBook };

/** What the `CurrentOpening` block shows for a position. */
export type CurrentOpeningState = {
  /** The opening at the position on screen, sticky past the book; `undefined` while unknown or loading. */
  opening: OpeningEntry | undefined;
  /** The book is still on its way — a different answer from "unknown". */
  loading: boolean;
  /** The ECO chip's link: the Openings explorer at this position (`?fen=`). */
  ecoLink: LinkTarget;
};

/**
 * **The opening at the position on screen** (CTA-113; the store half of what
 * `views/shared/CurrentOpening.tsx` was — the look is the `CurrentOpening`
 * block) — looked up live in the vendored eco.json book at the ply being
 * viewed, so stepping back through a game changes it with the board.
 *
 * - **Sticky**: a position the book has no name for keeps the last opening
 *   the game passed through (`stickyOpening`); stepping back past it clears it.
 * - **Lazy and shared**: `loadOpeningBook` caches its promise, so every board
 *   resolves the same ~3 MB at most once a session; until it lands the state
 *   says `loading`.
 * - **The link** is the `?fen=` hand-off every position crossing uses.
 */
export const useCurrentOpening = (fen: string): CurrentOpeningState => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadOpeningBook().then((book) => {
      if (!cancelled) setLoaded({ book, positionBook: getPositionBook(book) });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /*
    The sticky memory, adjusted during render (an effect would show one frame
    of "unknown" before catching up). `stickyOpening` returns `previous` by
    reference when nothing changed, so state is set only on a real change.
  */
  const [sticky, setSticky] = useState<LastKnownOpening | null>(null);
  if (loaded !== null) {
    const next = stickyOpening(loaded.book, loaded.positionBook, fen, sticky);
    if (next !== sticky) setSticky(next);
  }

  return {
    opening: sticky?.opening,
    loading: loaded === null,
    ecoLink: { component: RouterLink, to: `/openings?${createSearchParams({ fen }).toString()}` },
  };
};
