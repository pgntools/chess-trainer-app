/**
 * **The one set of page sizes** every paginated table offers (CTA-108) —
 * where the Lobby offered 10 / 25 / 50 and a collection 50 / 100 / 250. Both
 * the pager and `useTableUrlState` (which validates `?rows=` against it)
 * read it from here.
 */
export const TABLE_PAGE_SIZES: readonly number[] = [25, 50, 100, 250];

/** A table's page size when the URL names none. */
export const DEFAULT_TABLE_PAGE_SIZE = 50;
