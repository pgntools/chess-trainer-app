/**
 * **The Tables family's public surface** (CTA-110) — a screen imports this
 * family's blocks from here and nowhere deeper: each a `DataTable` over one
 * of the app's own shapes. CTA-109 brought the first two real ones, the
 * Lobby's games and Settings → Storage's report, and retired the placeholder
 * that proved the layer; `CollectionGamesTable` and `CollectionsTreeTable`
 * come with the Library's migration.
 */
export * from "./CollectionsTreeTable";
export * from "./PlayedGamesTable";
export * from "./StorageTable";
