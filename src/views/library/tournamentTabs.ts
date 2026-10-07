import { COLLECTION_FILTER_PARAMS } from "../../lib/libraryCollections";

/** A tournament collection's tabs (CTA-142), in the strip's order — Info the default. */
export const TOURNAMENT_TABS = ["info", "participants", "games"] as const;
export type TournamentTab = (typeof TOURNAMENT_TABS)[number];

/** The games table's own URL state: any of it, with no `tab`, means the games. */
const GAMES_PARAMS: readonly string[] = [...COLLECTION_FILTER_PARAMS, "q", "sort", "dir", "page", "rows"];

/**
 * The tab a URL names — `?tab=`, else **Games** for a URL carrying the games
 * table's own state (a Blog table's `?player=` link, a filter, a sort), else
 * **Info**.
 */
export const tournamentTabOf = (params: URLSearchParams): TournamentTab => {
  const asked = params.get("tab");
  if ((TOURNAMENT_TABS as readonly (string | null)[]).includes(asked)) return asked as TournamentTab;
  return GAMES_PARAMS.some((key) => params.has(key)) ? "games" : "info";
};
