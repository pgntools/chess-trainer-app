import type { NewJobKindOption } from "./NewJobFrame";

/*
  The kinds New job offers (CTA-217) — each entity's, one that cannot start
  here and says why, and Hebrew words. Imported only by the block's gallery
  and its test.
*/

export const CASE_KINDS: readonly NewJobKindOption[] = [
  {
    id: "analysis.computer-analysis",
    name: "Computer analysis",
    description: "Every move searched by the engine; the results as new Cases or merged into this one.",
  },
];

export const REPERTOIRE_KINDS: readonly NewJobKindOption[] = [
  {
    id: "repertoire.evaluation",
    name: "Repertoire evaluation",
    description: "Every position of the repertoire searched; its weak moves flagged with the engine's best.",
  },
  {
    id: "repertoire.coverage",
    name: "Coverage holes",
    description: "The opponent's moves the repertoire does not answer.",
    disabledReason: "needs opening statistics, not yet available",
  },
];

export const COLLECTION_KINDS: readonly NewJobKindOption[] = [
  {
    id: "library.collection-merge",
    name: "Collection merge",
    description: "The picked collections as one PGN, duplicates left out — and, if you like, a new collection.",
  },
  {
    id: "library.move-search",
    name: "Move-sequence search",
    description: "The games that reach a sequence of moves.",
    disabledReason: "coming in a later version",
  },
];

export const HEBREW_KINDS: readonly NewJobKindOption[] = [
  { id: "repertoire.evaluation", name: "הערכת רפרטואר", description: "כל עמדה ברפרטואר נבדקת; המסעים החלשים מסומנים." },
];
