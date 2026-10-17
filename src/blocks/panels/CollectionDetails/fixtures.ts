/*
  A Library collection beside its games (CTA-229, its content CTA-231),
  named as the collection page names it: a player's games (an upload, and a
  shipped file), a tournament, and a collection with no game yet. Imported
  only by the block's gallery and its test.
*/

import type { LinkTarget } from "../../../design-system/components/link";
import type { JobRowView } from "../../tables";
import { MERGED, TWIC } from "../../cards/CollectionSource/fixtures";
import { jobRow } from "../../tables/JobQueueTable/fixtures";
import type { CollectionDetailsGeneral } from "./CollectionDetails";

/** A collection's name. */
export const NAME = "Club nights 2026";

/** A long one, which wraps in the head. */
export const LONG_NAME = "Tal — every game from the Riga years, the USSR championships and the 1960 world championship match, with the simuls the reader found since";

/** A Hebrew one, read under the app's own direction. */
export const HEBREW_NAME = "אליפות ישראל — 2026";

/** Where Close goes — the Library's list. */
export const CLOSE_LINK: LinkTarget = { href: "/library" };

/** The reader's own description. */
const DESCRIPTION = "Every Tuesday at the club — rapid, 15+10.\nThe games the board recorded.";

/** An upload of many events, described, with ratings and dates. */
export const UPLOADED: CollectionDetailsGeneral = {
  kind: "collection",
  source: "uploaded",
  metadata: {
    games: 412,
    players: 38,
    events: ["Club night 1", "Club night 2", "Club night 3"],
    elo: { min: 1480, max: 2310 },
    dates: { first: "2026.01.06", last: "2026.10.13" },
  },
  addedAt: "2026-10-14T19:30:00.000Z",
  description: DESCRIPTION,
};

/** A shipped player's file: no description, no date added, one event's name left out (several). */
export const SHIPPED: CollectionDetailsGeneral = {
  kind: "collection",
  source: "shipped",
  metadata: { games: 2636, players: 724, events: ["Riga", "USSR-ch", "Wch"], dates: { first: "1949", last: "1992.05.??" } },
};

/** An upload of one event, never described — the event named. */
export const ONE_EVENT: CollectionDetailsGeneral = {
  kind: "collection",
  source: "uploaded",
  metadata: { games: 3, players: 4, events: ["Spring open"] },
  addedAt: "2026-04-02T08:00:00.000Z",
};

/** An empty upload: no game yet. */
export const EMPTY: CollectionDetailsGeneral = {
  kind: "collection",
  source: "uploaded",
  metadata: { games: 0, players: 0, events: [] },
  addedAt: "2026-10-17T10:00:00.000Z",
};

/** A tournament: the FIDE Candidates 2026, a double round robin, described. */
export const TOURNAMENT: CollectionDetailsGeneral = {
  kind: "tournament",
  facts: {
    type: "roundRobin",
    event: "FIDE Candidates 2026",
    site: "Cyprus CYP",
    dates: { first: "2026.03.29", last: "2026.04.15" },
    rounds: 14,
    players: 8,
    games: 56,
    unfinished: 0,
  },
  description: "Eight players, two cycles — the winner plays the world champion.",
};

/** An upload of one TWIC issue: its games name their source (CTA-233). */
export const SOURCED: CollectionDetailsGeneral = { ...UPLOADED, sources: TWIC };

/** The tournament, its games from two TWIC issues and a few naming none (CTA-233). */
export const SOURCED_TOURNAMENT: CollectionDetailsGeneral = { ...TOURNAMENT, sources: MERGED };

/** The collection's jobs — a merge running, one done. */
export const JOBS: readonly JobRowView[] = [
  jobRow("merge-running", "running", { title: "Club nights 2026 + Spring open", createdAt: "2026-10-16T09:30:00.000Z" }),
  jobRow("merge-done", "done", { title: "Club nights 2026 + Autumn open", createdAt: "2026-10-12T18:05:00.000Z" }),
];
