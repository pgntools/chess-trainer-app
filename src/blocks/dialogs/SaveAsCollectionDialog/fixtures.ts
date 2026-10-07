import { MAX_COLLECTION_NAME_CHARS } from "../../../lib/libraryCollections";

/*
  The save-as-collection dialog's sample data (CTA-122). Imported only by the
  block's gallery and its test.
*/

/** The name the Analyse-style derivation gives the picks: the collection, the count, the filters. */
export const DERIVED = "Capablanca — 12 games (Capablanca, white, B90)";

/** A name already at the collection-name cap, so nothing more can be typed. */
export const FULL = "C".repeat(MAX_COLLECTION_NAME_CHARS);

/** A Hebrew name (RTL). */
export const HEBREW = "קפבלנקה — 12 משחקים (לבן, B90)";
