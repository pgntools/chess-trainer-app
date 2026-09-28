import type { GameFolder } from "../../../lib/savedGameFolders";

/*
  The folder delete's sample data (CTA-113), typed with `src/lib/`'s folder.
  Imported only by the block's gallery and its test.
*/

const AT = "2026-09-28T12:00:00.000Z";

export const DOOMED: GameFolder = { id: "gopenings", name: "Openings", parentId: null, savedAt: AT, updatedAt: AT };

export const MESSAGE = "The folder goes; what is in it stays — the analyses become Unfiled and its sub-folders move up.";

export const COUNTS = "12 analyses and 2 sub-folders";
