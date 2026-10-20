/**
 * **Find Best Move's addresses** (CTA-244): the sessions lobby — and its New
 * session form — at `/accuracy-trainer/find-best-move-v4`, a session at
 * `…/<caseId>`. Here rather than beside the screen so that Analysis — a
 * shipped screen — can name a session's address (S3's *Resume in Find Best
 * Move*, a dev build's) without importing the dev-only trainer.
 */

/** The sessions lobby. */
export const FIND_BEST_MOVE_PATH = "/accuracy-trainer/find-best-move-v4";

/** A session — its Case's id. */
export const findBestMoveSessionPath = (caseId: string): string => `${FIND_BEST_MOVE_PATH}/${encodeURIComponent(caseId)}`;
