import type { ImportResults } from "../../../lib/dataImportTarget";

/*
  The import report's sample results (CTA-109), typed with
  `src/lib/dataImportTarget.ts`'s own `ImportResults`. Imported only by the
  block's gallery and its test.
*/

/** Every category written. */
export const ALL_DONE: ImportResults = {
  collections: { status: "done", report: { added: 1, replaced: 0, skipped: 0, folders: 1 } },
  games: { status: "done", report: { added: 2, replaced: 0, skipped: 1, folders: 0 } },
  analyses: { status: "done", report: { added: 12, replaced: 3, skipped: 0, folders: 2 } },
  repertoires: { status: "done", report: { added: 4, replaced: 0, skipped: 0, folders: 1 } },
};

/** One category past its cap, one the browser refused. */
export const SOME_FAILED: ImportResults = {
  games: { status: "done", report: { added: 2, replaced: 0, skipped: 0, folders: 0 } },
  analyses: { status: "failed", failure: "storage" },
  repertoires: { status: "refused", cap: { kind: "records", max: 500, total: 612 } },
};

/** A collection whose games could not be indexed. */
export const INDEXING_FAILED: ImportResults = {
  collections: { status: "failed", failure: "indexing" },
};
