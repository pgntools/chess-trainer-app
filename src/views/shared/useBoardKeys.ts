import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * **The keyboard for a page of many boards** (CTA-126) — an article can hold
 * nine boards, so ← / → cannot step them all, as they step the one board of a
 * game screen (`useTreeNavigation`, whose listener is bound to the document
 * because each of those routes mounts one board). Here the keys go to **the
 * active board**: the last one the reader touched, clicked or tabbed into.
 *
 * - **← / →** step the active board back and on, wherever the focus is on the
 *   page — but for a field being typed into, or a widget that owns its arrow
 *   keys (a tree, a menu, tabs, a listbox, a slider, a grid), which keep them.
 *   With no board touched yet, the first board in view takes them, so a
 *   reader scrolling an article can step the board in front of them at once.
 * - **Home / End** go to the board's first and last position — only while the
 *   focus is inside the board, since anywhere else they scroll the page.
 * - A modifier (Ctrl, Alt, Shift, ⌘) leaves every key to the browser.
 *
 * The active board is marked (`data-keys-active`, which its component draws as
 * a ring), so the reader can see which board the keys drive; its root takes
 * focus on a click that lands on nothing focusable (a square, the text around
 * the moves), so focus and activity agree. One listener serves every board,
 * bound while any is mounted. Mounting order is irrelevant: "first in view"
 * is the document's order.
 */

type BoardKeyHandlers = {
  back?: () => void;
  next?: () => void;
  first?: () => void;
  last?: () => void;
};

type Entry = { root: HTMLElement; handlers: () => BoardKeyHandlers };

const entries = new Map<string, Entry>();
let active: string | null = null;
const listeners = new Set<() => void>();

const setActive = (id: string | null) => {
  if (active === id) return;
  active = id;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const isTextEntry = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/** The widgets whose own keyboard is the arrow keys. */
const ARROW_WIDGETS =
  '[role="tree"],[role="treegrid"],[role="grid"],[role="menu"],[role="menubar"],[role="listbox"],[role="tablist"],[role="slider"],[role="radiogroup"],[role="spinbutton"]';

const ownsArrowKeys = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(ARROW_WIDGETS) !== null;

const ACTIONS: Record<string, keyof BoardKeyHandlers> = {
  ArrowLeft: "back",
  ArrowRight: "next",
  Home: "first",
  End: "last",
};

/** The board holding the focus, if any. */
const focusedBoard = (): string | null => {
  const focused = document.activeElement;
  if (focused === null || focused === document.body) return null;
  for (const [id, entry] of entries) if (entry.root.contains(focused)) return id;
  return null;
};

/** The first board, in the document's order, with any of it in the viewport. */
const firstInView = (): string | null => {
  const inView = [...entries].filter(([, { root }]) => {
    const box = root.getBoundingClientRect();
    return box.bottom > 0 && box.top < window.innerHeight && box.height > 0;
  });
  inView.sort(([, a], [, b]) => (a.root.compareDocumentPosition(b.root) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return inView[0]?.[0] ?? null;
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const action = ACTIONS[event.key];
  if (action === undefined || isTextEntry(event.target) || ownsArrowKeys(event.target)) return;

  const inside = focusedBoard();
  // Home and End scroll the page unless the reader is in a board.
  if ((action === "first" || action === "last") && inside === null) return;
  const id = inside ?? (active !== null && entries.has(active) ? active : firstInView());
  if (id === null) return;
  const handler = entries.get(id)?.handlers()[action];
  if (handler === undefined) return;
  setActive(id);
  handler();
  event.preventDefault();
};

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Join the page's keyboard: spread the result on the board's root. The
 * handlers may change every render; the latest are the ones a key calls.
 */
export const useBoardKeys = (handlers: BoardKeyHandlers) => {
  const id = useId();
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (root === null) return;
    if (entries.size === 0) document.addEventListener("keydown", onKeyDown);
    entries.set(id, { root, handlers: () => latest.current });

    const activate = () => setActive(id);
    const onPointerDown = (event: PointerEvent) => {
      activate();
      // A click on nothing focusable — a square, the words — focuses the board itself.
      if (!(event.target instanceof Element && event.target.closest(FOCUSABLE))) root.focus({ preventScroll: true });
    };
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("focusin", activate);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("focusin", activate);
      entries.delete(id);
      if (active === id) setActive(null);
      if (entries.size === 0) document.removeEventListener("keydown", onKeyDown);
    };
  }, [root, id]);

  const isActive = useSyncExternalStore(
    subscribe,
    () => active === id,
    () => false,
  );

  return {
    ref: setRoot,
    tabIndex: -1,
    "aria-keyshortcuts": "ArrowLeft ArrowRight Home End",
    "data-keys-active": isActive ? "true" : undefined,
  } as const;
};
