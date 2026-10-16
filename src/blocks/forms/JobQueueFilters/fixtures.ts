import type { JobQueueFilterOption, JobQueueFilterValues } from "./filterValues";

/*
  The Jobs queue's filter choices and values (CTA-217). Imported only by the
  block's gallery and its test.
*/

export const KINDS: readonly JobQueueFilterOption[] = [
  { value: "analysis.computer-analysis", label: "Computer analysis" },
  { value: "repertoire.evaluation", label: "Repertoire evaluation" },
  { value: "library.collection-merge", label: "Collection merge" },
];

export const ENTITY_TYPES: readonly JobQueueFilterOption[] = [
  { value: "analysis-case", label: "A Case" },
  { value: "repertoire", label: "A repertoire" },
  { value: "library-collection", label: "A collection" },
];

/** One kind, one entity type — nothing to choose between. */
export const ONE_KIND: readonly JobQueueFilterOption[] = [KINDS[0]];
export const ONE_ENTITY_TYPE: readonly JobQueueFilterOption[] = [ENTITY_TYPES[0]];

export const SOME_FILTERS: JobQueueFilterValues = { status: "failed", kind: "repertoire.evaluation", entityType: "" };

/** Hebrew choices. */
export const HEBREW_KINDS: readonly JobQueueFilterOption[] = [
  { value: "analysis.computer-analysis", label: "ניתוח ממוחשב" },
  { value: "repertoire.evaluation", label: "הערכת רפרטואר" },
];
