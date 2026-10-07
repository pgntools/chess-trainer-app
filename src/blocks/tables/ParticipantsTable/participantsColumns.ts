/** The participants table's columns (CTA-142), each sortable from its header. */
export type ParticipantsColumn = "rank" | "player" | "team" | "rating" | "score" | "games" | "wins" | "draws" | "losses" | "performance";

/** The order the table opens in: the standings'. */
export const PARTICIPANTS_DEFAULT_SORT = { column: "rank", direction: "asc" } as const;
