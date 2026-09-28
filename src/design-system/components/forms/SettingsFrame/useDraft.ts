import { useCallback, useState } from "react";

export type Draft<T> = {
  /** The values being edited. */
  draft: T;
  /** Change some of them. */
  update: (patch: Partial<T>) => void;
  /** Whether the draft differs from what it started from. */
  dirty: boolean;
  /** Back to what it started from. */
  reset: () => void;
  /** The draft is now the baseline (after a save). */
  commit: () => void;
};

/** Two drafts are the same when their JSON is — plain settings objects, in a stable key order. */
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * **A settings screen's draft** (CTA-108): a copy of the values to edit, a
 * `dirty` flag against where it started, and reset / commit — what
 * `SettingsFrame`'s Save and Cancel act on. `initial` is read once.
 */
export function useDraft<T extends object>(initial: T, same: (a: T, b: T) => boolean = sameJson): Draft<T> {
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const update = useCallback((patch: Partial<T>) => setDraft((before) => ({ ...before, ...patch })), []);
  const reset = useCallback(() => setDraft(baseline), [baseline]);
  const commit = useCallback(() => setBaseline(draft), [draft]);
  return { draft, update, dirty: !same(draft, baseline), reset, commit };
}
