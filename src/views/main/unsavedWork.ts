import { useEffect } from "react";

/**
 * **Work that leaving would lose** (CTA-136) — the screens that hold unsaved
 * changes in memory (the Analysis Board, the Library's game board, the
 * repertoire player, the theme editor) declare it here while they do.
 *
 * Two things ask: the browser, before a reload or a closed tab
 * (`beforeunload`), and the language switch, which re-creates the router and
 * so remounts the screen (`theme/LanguageSwitch.tsx`) — it confirms first
 * while anything is declared.
 */
let holders = 0;

/** Whether any mounted screen holds unsaved work now. */
export const hasUnsavedWork = (): boolean => holders > 0;

/** Declares unsaved work while `unsaved` is true: leaving the page asks first, and so does a change of language. */
export function useUnsavedWorkGuard(unsaved: boolean): void {
  useEffect(() => {
    if (!unsaved) return;
    // One listener per holder: removing one must not take another's away.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    holders += 1;
    window.addEventListener("beforeunload", warn);
    return () => {
      holders -= 1;
      window.removeEventListener("beforeunload", warn);
    };
  }, [unsaved]);
}
