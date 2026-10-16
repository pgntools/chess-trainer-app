import type { JobError, JobKind, JobOutput } from "@pgntools/jobs-runtime";

import { buildCollectionIndexAsync, loadOpeningLookup } from "../../../collectionIndex";
import { addCollection } from "../../../libraryCollectionStore";
import { collectionGamesOf } from "../../../libraryCollections";
import { LIBRARY_COLLECTION_ENTITY } from "../../entityTypes";
import {
  COLLECTION_MERGE_KIND,
  COLLECTION_MERGE_STATE_VERSION,
  CollectionMergeError,
  outputPlansOf,
  parseCollectionMergeInput,
  parseCollectionMergeState,
  planOf,
  stepOf,
  type CollectionMergeInput,
  type CollectionMergeReader,
  type CollectionMergeState,
  type CollectionMergeSummary,
} from "./core";
import { LibraryCollectionGoneError, libraryReader } from "./libraryReader";

/**
 * **The collection-merge kind** (CTA-221, `library.collection-merge`) — the
 * adapter over CTA-220's core and the Library: two or more collections, in
 * the order picked, read into one PGN file, 500 games a step, each step one
 * part of the file (`ctx.artifacts.writePart(seq)`, so a step re-run rewrites
 * its part, never adds one). **CPU lane, resumable, resumed by itself**
 * (`autoResume`): a tab closed mid-merge goes on in the next tab to open.
 *
 * - **Outputs**: always the merged PGN, sealed at `finalize`; ticked, a new
 *   Library collection of it, its id `u<jobId>` (an id already there is
 *   success) — refused, with the reason in the summary, past
 *   `MAX_COLLECTION_CHARS`; and the summary (data,
 *   `library.collection-merge.summary@1`).
 * - **Errors**: `source` (a collection gone from the Library), `state` (a
 *   checkpoint planned for other sources), `storage` (the Library refused
 *   the new collection), `read` (a shipped collection that would not load —
 *   retried) (`jobs.kinds.collectionMerge.errors.*`).
 */

export const COLLECTION_MERGE_ERRORS = ["source", "state", "storage", "read"] as const;

class CollectionMergeOutputError extends Error {
  readonly code = "storage";
  constructor() {
    super("The Library refused the merged collection.");
    this.name = "CollectionMergeOutputError";
  }
}

/** An output decided: the sealed file, the new collection (read from the file when applied), the summary. */
export type CollectionMergeJobPlan =
  | { key: "pgn-file"; kind: "artifact"; artifactId: string; name: string; mimeType: string; size: number }
  | { key: "collection"; kind: "library-collection"; artifactId: string; collectionId: string; name: string }
  | { key: "summary"; kind: "data"; schema: string; value: CollectionMergeSummary };

const classifyCollectionMergeError = (error: unknown): JobError => {
  if (error instanceof LibraryCollectionGoneError) return { code: "source", message: error.message, retryable: false };
  if (error instanceof CollectionMergeError) return { code: error.code, message: error.message, retryable: false };
  if (error instanceof CollectionMergeOutputError) return { code: error.code, message: error.message, retryable: false };
  // A shipped collection's chunk that would not load, a read that failed: tried again.
  return { code: "read", message: error instanceof Error ? error.message : String(error), retryable: true };
};

export type CollectionMergeKindDeps = {
  /** The sealed file's text, to make the collection from — the runtime's `readArtifact`. */
  readArtifact: (artifactId: string) => Promise<Blob | undefined>;
  /** The Library — a test's in memory in its place. */
  reader?: CollectionMergeReader;
};

export const collectionMergeKind = ({
  readArtifact,
  reader = libraryReader,
}: CollectionMergeKindDeps): JobKind<CollectionMergeInput, CollectionMergeState, CollectionMergeJobPlan> => ({
  id: COLLECTION_MERGE_KIND,
  version: COLLECTION_MERGE_STATE_VERSION,
  lane: "cpu",
  appliesTo: [LIBRARY_COLLECTION_ENTITY],
  resumable: true,
  autoResume: true,
  retry: { maxAttempts: 3, backoff: { initialMs: 5_000, factor: 2, maxMs: 60_000, jitter: true } },

  parseInput: parseCollectionMergeInput,
  parseState: parseCollectionMergeState,
  title: (input) => input.name,
  subjects: (input) => input.sources.map((source) => ({ type: LIBRARY_COLLECTION_ENTITY, id: source.id })),

  plan: (input) => planOf(input, reader),

  step: async (state, input, ctx) => {
    const stepped = await stepOf(state, input, reader, (seq, text) => ctx.artifacts.writePart("pgn", seq, text));
    ctx.heartbeat();
    return stepped;
  },

  finalize: async (state, input, ctx) => {
    const plans: CollectionMergeJobPlan[] = [];
    let artifactId = "";
    for (const plan of outputPlansOf(state, input, ctx.jobId)) {
      if (plan.kind === "artifact") {
        const sealed = await ctx.artifacts.seal(plan.artifactKey, { name: plan.name, mimeType: plan.mimeType });
        artifactId = sealed.artifactId;
        plans.push({ key: plan.key, kind: "artifact", artifactId, name: plan.name, mimeType: plan.mimeType, size: sealed.size });
      } else if (plan.kind === "library-collection") {
        // The file is sealed first (it is the first plan): the collection is made of the same text.
        plans.push({ key: plan.key, kind: "library-collection", artifactId, collectionId: plan.collectionId, name: plan.name });
      } else {
        plans.push({ key: plan.key, kind: "data", schema: plan.schema, value: plan.value });
      }
    }
    return plans;
  },

  applyOutput: async (plan, _input, ctx): Promise<JobOutput> => {
    if (plan.kind === "artifact") {
      return { key: plan.key, kind: "artifact", artifactId: plan.artifactId, name: plan.name, mimeType: plan.mimeType, size: plan.size };
    }
    if (plan.kind === "data") return { key: plan.key, kind: "data", schema: plan.schema, value: plan.value };
    const file = await readArtifact(plan.artifactId);
    if (file === undefined) throw new CollectionMergeOutputError();
    const games = collectionGamesOf(await file.text());
    // The Library's one indexer, in yielding batches (the upload's worker is a screen's).
    const { rows } = await buildCollectionIndexAsync(games, { lookup: await loadOpeningLookup() });
    const made = await addCollection(plan.name, games, rows, ctx.now(), plan.collectionId);
    if ("problem" in made) throw new CollectionMergeOutputError();
    return { key: plan.key, kind: "entity", ref: { type: LIBRARY_COLLECTION_ENTITY, id: plan.collectionId }, label: plan.name };
  },

  classifyError: classifyCollectionMergeError,
});
