/**
 * **The Cards family's public surface** (CTA-142) — a screen imports this
 * family's blocks from here and nowhere deeper: a record's facts at a
 * glance (a tournament's event; where a collection's games come from; the
 * engine settings an engine job ran with).
 */
export * from "./CollectionSource";
export * from "./JobEngineSettings";
export * from "./TournamentInfo";
