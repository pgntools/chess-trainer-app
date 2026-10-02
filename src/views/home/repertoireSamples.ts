import caroKannBlackPgn from "../../data/frontPage/repertoires/caro-kann-black.pgn?raw";
import e4WhitePgn from "../../data/frontPage/repertoires/e4-white.pgn?raw";
import { demoTreeOfGameTree, type DemoNode } from "../../lib/demoTree";
import { parsePgnTree } from "../../lib/pgn";

/**
 * **The front page's sample repertoires** (CTA-126) — what a
 * `<RepertoireBoard fallback="…" />` shows when the repertoire it names is not
 * on the reader's device. Repertoires are the reader's own (IndexedDB, one
 * device), and none ships with the app, so a front page every reader sees
 * names a sample to fall back on.
 *
 * Shipped as PGN under `src/data/frontPage/repertoires/` (that folder's
 * README says how to add one), bundled as text (~1 KB each) and parsed the
 * first time a board asks, once.
 */

export const REPERTOIRE_SAMPLE_IDS = ["e4-white", "caro-kann-black"] as const;
export type RepertoireSampleId = (typeof REPERTOIRE_SAMPLE_IDS)[number];

export type RepertoireSample = {
  root: DemoNode;
  /** The side it is played from — the board opens facing it. */
  color: "white" | "black";
};

const SOURCES: Record<RepertoireSampleId, { pgn: string; color: "white" | "black" }> = {
  "e4-white": { pgn: e4WhitePgn, color: "white" },
  "caro-kann-black": { pgn: caroKannBlackPgn, color: "black" },
};

const parsed = new Map<RepertoireSampleId, RepertoireSample>();

export const isRepertoireSampleId = (value: string | undefined): value is RepertoireSampleId =>
  (REPERTOIRE_SAMPLE_IDS as readonly (string | undefined)[]).includes(value);

/** One sample, parsed on the first call and kept. */
export const repertoireSample = (id: RepertoireSampleId): RepertoireSample => {
  let sample = parsed.get(id);
  if (sample === undefined) {
    const { pgn, color } = SOURCES[id];
    sample = { root: demoTreeOfGameTree(parsePgnTree(pgn)), color };
    parsed.set(id, sample);
  }
  return sample;
};
