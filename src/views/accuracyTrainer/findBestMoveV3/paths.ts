/**
 * **Find Best Move v3's addresses** (CTA-239): the sessions lobby — and its
 * New session form — at `/accuracy-trainer/find-best-move-v3`, a session at
 * `…/<caseId>`, its Case resumed from its PGN.
 */

/** The sessions lobby. */
export const FIND_BEST_MOVE_V3_PATH = "/accuracy-trainer/find-best-move-v3";

/** A session — its Case's id. */
export const sessionPath = (caseId: string): string => `${FIND_BEST_MOVE_V3_PATH}/${encodeURIComponent(caseId)}`;
