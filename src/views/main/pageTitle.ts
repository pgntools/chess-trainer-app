/**
 * **The page's title and heading** (CTA-112) — what a screen tells the shell
 * about the page it is, so a screen reader hears where it is.
 *
 * The shell (`Layout.tsx`) owns the page's structure: it renders the
 * document's `<title>`, names the `main` landmark and renders the page's one
 * `h1`, visually hidden. The screen's name comes from its route's `handle`
 * (`routeHandle.ts`) — and, for a route whose pattern serves many pages (the
 * Blog's), the page's own name from its `meta` (CTA-135), ahead of what a
 * screen reports; a screen adds only what the route cannot know:
 *
 * | Hook | Called by | What it tells the shell |
 * | --- | --- | --- |
 * | `usePageTitle(detail)` | a screen with a record open | the record's name — "Carlsen games — Library — chessapp.dev" |
 * | `useOwnPageHeading()` | a screen whose design has a visible title | it renders the page's `h1` itself, so the shell's hidden one steps aside |
 *
 * Both are no-ops outside the shell, so a screen test that mounts the screen
 * alone needs no provider. The state is a small external store read with
 * `useSyncExternalStore` — the right panel's pattern (`rightPanel.tsx`) —
 * written from a layout effect, so a screen reports on mount and withdraws on
 * unmount, and nothing in the shell re-renders on a screen's own renders.
 */

import { createContext, useContext, useLayoutEffect } from "react";

export type PageTitleStore = {
  subscribe: (onStoreChange: () => void) => () => void;
  /** The open record's name, or `undefined`. */
  getDetail: () => string | undefined;
  /** How many mounted screens render their own `h1` (one, or none). */
  getOwnHeadings: () => number;
  setDetail: (detail: string | undefined) => void;
  acquireHeading: () => void;
  releaseHeading: () => void;
};

export const createPageTitleStore = (): PageTitleStore => {
  let detail: string | undefined;
  let ownHeadings = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    subscribe: (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    getDetail: () => detail,
    getOwnHeadings: () => ownHeadings,
    setDetail: (next) => {
      if (next === detail) return;
      detail = next;
      emit();
    },
    acquireHeading: () => {
      ownHeadings += 1;
      emit();
    },
    releaseHeading: () => {
      ownHeadings -= 1;
      emit();
    },
  };
};

/** The shell's store; `null` outside the shell, where the hooks do nothing. */
export const PageTitleContext = createContext<PageTitleStore | null>(null);

/**
 * **The open record's name, for the page title** — a collection, a game, a
 * repertoire, a saved analysis, a Settings tab. `undefined` (still reading,
 * or no record) leaves the screen's own name alone. Call it above a screen's
 * early returns, with whatever it knows so far.
 */
export const usePageTitle = (detail: string | undefined): void => {
  const store = useContext(PageTitleContext);
  const shown = detail === undefined || detail.trim() === "" ? undefined : detail;
  useLayoutEffect(() => {
    if (store === null) return;
    store.setDetail(shown);
    return () => store.setDetail(undefined);
  }, [store, shown]);
};

/**
 * **This screen renders the page's `h1`** — its visible title. Call it in the
 * component that renders the heading, so a loading or missing state (which
 * has none) still gets the shell's.
 */
export const useOwnPageHeading = (): void => {
  const store = useContext(PageTitleContext);
  useLayoutEffect(() => {
    if (store === null) return;
    store.acquireHeading();
    return () => store.releaseHeading();
  }, [store]);
};
