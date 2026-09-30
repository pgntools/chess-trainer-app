import type { SortDirection } from "../../../design-system/components/tables";

/** The Library tree table's sortable columns — `?sort=` reads one (absent is `name`). */
export const LIBRARY_TREE_COLUMNS = ["name", "games", "added"] as const;

export type LibraryTreeColumn = (typeof LIBRARY_TREE_COLUMNS)[number];

export const LIBRARY_TREE_DEFAULT_SORT: LibraryTreeColumn = "name";

/** Which way a column sorts until the reader turns it: names A to Z, counts and dates high first. */
export const libraryTreeFirstDirection = (
  column: LibraryTreeColumn,
): SortDirection => (column === "name" ? "asc" : "desc");
