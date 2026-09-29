import type { SortDirection } from "../../../design-system/components/tables";
import type { CollectionColumn } from "../../../lib/libraryCollections";

/** The sort a collection opens with: the newest games first (undated ones last). */
export const COLLECTION_DEFAULT_SORT: CollectionColumn = "date";

/** The columns whose values are numbers. */
const NUMERIC: ReadonlySet<CollectionColumn> = new Set(["number", "whiteElo", "blackElo", "moves"]);

/** Which way a column sorts until the reader turns it: the date and the numbers but `#` high first. */
export const collectionFirstDirection = (column: CollectionColumn): SortDirection =>
  column === COLLECTION_DEFAULT_SORT || (NUMERIC.has(column) && column !== "number") ? "desc" : "asc";

/** Whether a column's values are numbers — set at the cell's end. */
export const isNumericColumn = (column: CollectionColumn): boolean => NUMERIC.has(column);
