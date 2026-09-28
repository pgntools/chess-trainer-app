/**
 * **The Tables family's public surface** (CTA-110) — a screen imports this
 * family's blocks from here and nowhere deeper. Today it holds only the
 * placeholder that proves the layer's wiring; the real tables
 * (`PlayedGamesTable`, `CollectionGamesTable`, `CollectionsTreeTable`,
 * `StorageTable`) arrive with their modules' migrations.
 */
export * from "./ExampleGamesTable";
