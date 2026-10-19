/**
 * **One board engine app-wide** (CTA-237): the board whose engine is on, in
 * this tab, and the word to every other tab that one went on. A board
 * turning its engine on **claims** it; the board that held it — here or in
 * another tab — **loses** it and switches its engine off. A board switching
 * off, or unmounting, releases it.
 *
 * The other tabs hear a claim on a `BroadcastChannel`
 * ({@link BOARD_ENGINE_CHANNEL}); a browser without one keeps the rule within
 * the tab. Nothing at module scope: the channel is opened by the first claim
 * (the pre-render imports this under Node). The jobs' side of the rule is
 * `lib/engineGate.ts`; the board core's `useEngineGate` uses both.
 */

/** The channel the tabs hear each other's claims on. */
export const BOARD_ENGINE_CHANNEL = "chessapp.boardEngine";

/** What a channel must do — `BroadcastChannel`'s part, so a test hands in its own. */
export type ClaimChannel = {
  /** Tell the other tabs. */
  postMessage: (message: unknown) => void;
  /** Hear the other tabs. */
  listen: (listener: () => void) => void;
};

export type BoardEngineClaim = {
  /** This owner's engine is on: whoever held it, here or in another tab, loses it. */
  claim: (owner: object) => void;
  /** This owner's engine is off (or it unmounted) — nothing when it did not hold it. */
  release: (owner: object) => void;
  /** Who holds it in this tab — `null` for no one (or a board in another tab). */
  holder: () => object | null;
  /** Called with the owner that lost it — to another board here, or to a board in another tab. */
  subscribe: (listener: (lost: object) => void) => () => void;
};

const defaultChannel = (): ClaimChannel | undefined => {
  if (typeof BroadcastChannel === "undefined") return undefined;
  const channel = new BroadcastChannel(BOARD_ENGINE_CHANNEL);
  // Node's channel would hold a test run open; a browser's has no `unref`.
  (channel as unknown as { unref?: () => void }).unref?.();
  return {
    postMessage: (message) => channel.postMessage(message),
    listen: (listener) => {
      channel.onmessage = () => listener();
    },
  };
};

/** A claim of its own over its own channel — the page's is {@link boardEngineClaim}; a test makes two "tabs". */
export const createBoardEngineClaim = (openChannel: () => ClaimChannel | undefined = defaultChannel): BoardEngineClaim => {
  let holder: object | null = null;
  let channel: ClaimChannel | undefined;
  let opened = false;
  const listeners = new Set<(lost: object) => void>();

  const lose = () => {
    const lost = holder;
    holder = null;
    if (lost !== null) listeners.forEach((listener) => listener(lost));
  };

  const open = () => {
    if (opened) return;
    opened = true;
    channel = openChannel();
    // Another tab's board went on: this tab's loses it.
    channel?.listen(lose);
  };

  return {
    claim: (owner) => {
      open();
      if (holder !== owner) lose();
      holder = owner;
      channel?.postMessage({ claim: true });
    },
    release: (owner) => {
      if (holder === owner) holder = null;
    },
    holder: () => holder,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

let pageClaim: BoardEngineClaim | undefined;

/** **The page's claim** — made on the first call. */
export const boardEngineClaim = (): BoardEngineClaim => {
  pageClaim ??= createBoardEngineClaim();
  return pageClaim;
};
