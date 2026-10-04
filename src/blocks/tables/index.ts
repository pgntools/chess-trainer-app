/**
 * **The Tables family's public surface** (CTA-110) — a screen imports this
 * family's blocks from here and nowhere deeper: each a `DataTable` over one
 * of the app's own shapes. CTA-109 brought the first two real ones, the
 * Lobby's games and Settings → Storage's report, and retired the placeholder
 * that proved the layer; `CollectionGamesTable` and `CollectionsTreeTable`
 * come with the Library's migration.
 */
export * from "./CollectionGamesTable";
export * from "./CollectionsTreeTable";
export * from "./PlayedGamesTable";
export * from "./StorageTable";
// CTA-120: the tournament tables — a `StandingsTable` and a `CrossTable` over `lib/tournament.ts`, built ahead of their screen; the Blog's MDX embeds are their first consumer (CTA-128).
export * from "./SwissStandingsTable";
export * from "./RoundRobinCrossTable";
// CTA-128: the other formats — a knockout's bracket, a two-player match, a team event's standings.
export * from "./KnockoutBracket";
export * from "./MatchTable";
export * from "./TeamStandingsTable";
