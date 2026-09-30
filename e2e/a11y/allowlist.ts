/*
  The known gaps (CTA-116): the only violations the browser pass lets through.
  Everything else fails it.

  Each entry names its gap in ACCESSIBILITY.md → Known gaps (`gap` is a phrase
  of that row, and `allowlist.spec.ts` looks for it there), says where it
  applies, and — the point of the list — **must keep occurring**: an entry
  that no page in the run matches any more fails the run
  (`summaryReporter.ts`). So the list can only shrink as the gaps close; it
  cannot rot into a place where a fixed problem hides and a new one slips in.

  A new violation is fixed, not listed. It is listed only when it is a real
  gap with a plan, in ACCESSIBILITY.md first.
*/

export type AllowedGap = {
  /** Unique, kebab-case: how a page's record says an entry was met. */
  id: string;
  /** The axe rule id. */
  rule: string;
  /** A phrase of the ACCESSIBILITY.md Known-gaps row that explains it — checked to be in that file. */
  gap: string;
  /** One line: why the pass keeps meeting it, and what closes it. */
  why: string;
  /** A node is covered when its selector (axe's `target`, joined) matches. */
  target: RegExp;
  /** Where it applies. Absent: on every page. */
  on?: {
    /** Only pages that draw chess pieces: a board, or the position editor's palette. */
    pieces?: true;
    themes?: readonly string[];
  };
};

export const ALLOWLIST: readonly AllowedGap[] = [
  {
    id: "board-pieces-unnamed",
    rule: "aria-command-name",
    gap: "The game boards are drag-only",
    why: "react-chessboard renders each piece as a nameless role=button drag handle; naming them is the board accessibility Story (CTA-114).",
    // Every piece of a board, and of the position editor's spare-piece palette.
    target: /\[aria-roledescription="draggable"\]/,
    on: { pieces: true },
  },
];
