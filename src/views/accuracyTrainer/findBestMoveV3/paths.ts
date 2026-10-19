/**
 * **Find Best Move v3's addresses** (CTA-239): the sessions lobby at
 * `/accuracy-trainer/find-best-move-v3`, a session at `…/<caseId>` — its Case,
 * resumed from its PGN — and the setup of a new one at `…/new`.
 */

/** The sessions lobby. */
export const FIND_BEST_MOVE_V3_PATH = "/accuracy-trainer/find-best-move-v3";

/** What `…/<caseId>` reads as the setup of a new session — no Case is ever given this id. */
export const NEW_SESSION_ID = "new";

/** The setup of a new session. */
export const NEW_SESSION_PATH = `${FIND_BEST_MOVE_V3_PATH}/${NEW_SESSION_ID}`;

/** A session — its Case's id. */
export const sessionPath = (caseId: string): string => `${FIND_BEST_MOVE_V3_PATH}/${encodeURIComponent(caseId)}`;
