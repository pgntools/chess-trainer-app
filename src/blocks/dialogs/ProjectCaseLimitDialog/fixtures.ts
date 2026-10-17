/*
  The Project case-limit dialog's sample numbers (CTA-225). Imported only by
  the block's gallery and its test.
*/

/** A new Project from a file of many games — none held before. */
export const NEW_PROJECT = { count: 15_905, existing: 0 };

/** A batch of New case into a Project that holds some already, taking it past the limit. */
export const INTO_PROJECT = { count: 400, existing: 850 };

/** The Library's picks, sent to Analysis. */
export const FROM_LIBRARY = { count: 2_636, existing: 0, inLibrary: true };

/** A collection write the browser refused. */
export const STORAGE_PROBLEM = "The collection could not be created — the browser refused to save it. Nothing was created.";
