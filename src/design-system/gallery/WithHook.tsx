import type { ReactNode } from "react";

type WithHookProps<A extends unknown[], R> = {
  /** The hook itself — called with `args` on every render, as a component would call it. */
  hook: (...args: A) => R;
  args: A;
  /** The demo, given what the hook answered. */
  children: (value: R) => ReactNode;
};

/**
 * **A hook, called for a gallery demo** (CTA-108) — the {@link WithState}
 * of hooks: a `*.gallery.tsx` declares no component, so a demo of
 * `useTableUrlState` or `useSnackbar` calls it through this one.
 */
function WithHook<A extends unknown[], R>({ hook, args, children }: WithHookProps<A, R>) {
  const value = hook(...args);
  return <>{children(value)}</>;
}

export default WithHook;
