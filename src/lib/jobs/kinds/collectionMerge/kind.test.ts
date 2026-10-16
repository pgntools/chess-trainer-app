import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { JobRuntime, JobStore } from "@pgntools/jobs-runtime";
import { manualClock, memoryJobStore } from "@pgntools/jobs-runtime/testing";

import { crashingStore, crashThenRecover, runToEnd, testRuntime } from "../../../../test/jobsKit";
import { loadUploadedCollections, loadUploadedGames, resetLibraryCollectionStore } from "../../../libraryCollectionStore";
import { registerSubjectRemover } from "../../subjectDeletion";
import { COLLECTION_MERGE_KIND, mergedCollectionId, parseCollectionMergeSummary, type CollectionMergeReader } from "./core";
import { collectionMergeKind } from "./kind";
import { LibraryCollectionGoneError } from "./libraryReader";

/** Game n of a numbered series: distinct players, one short line. */
const numbered = (n: number) => `[Event "Test"]\n[White "White ${n}"]\n[Black "Black ${n}"]\n[Date "2026.01.01"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 *`;

/** The in-memory Library: collections by id; a collection not there is gone. */
const readerOf = (collections: Record<string, readonly string[]>): CollectionMergeReader => ({
  count: async (id) => {
    const games = collections[id];
    if (games === undefined) throw new LibraryCollectionGoneError(id);
    return games.length;
  },
  read: async (id, from, n) => {
    const games = collections[id];
    if (games === undefined) throw new LibraryCollectionGoneError(id);
    return games.slice(from, from + n);
  },
});

/** Two collections over a batch's worth — so a merge takes several steps — and duplicates across them. */
const BIG = readerOf({
  a: Array.from({ length: 700 }, (_, index) => numbered(index)),
  b: Array.from({ length: 400 }, (_, index) => numbered(index + 500)),
});

/** Two small ones, for the Library collection the merge makes. */
const SMALL = readerOf({ a: [numbered(1), numbered(2)], b: [numbered(2), numbered(3)] });

const inputOf = (collection: boolean) => ({
  sources: [
    { id: "a", name: "Tata Steel" },
    { id: "b", name: "Wijk" },
  ],
  dedupe: "identical-pgn",
  name: "Merged",
  outputs: { collection },
});

let runtimes: JobRuntime[] = [];
const started = (runtime: JobRuntime) => {
  runtimes.push(runtime);
  runtime.start();
  return runtime;
};

const kindsOver = (reader: CollectionMergeReader, store: () => JobStore) => [
  collectionMergeKind({ reader, readArtifact: (artifactId) => store().readArtifact(artifactId) }),
];

const finish = runToEnd;

beforeEach(async () => {
  await resetLibraryCollectionStore();
});

afterEach(async () => {
  for (const runtime of runtimes) await runtime.stop();
  runtimes = [];
  await registerSubjectRemover(undefined);
  await resetLibraryCollectionStore();
});

describe("the collection-merge kind (CTA-221) on the jobs runtime", () => {
  it("writes the merged PGN in 500-game parts, then seals it as a file — with its summary, and a Library collection of it", async () => {
    const store = memoryJobStore();
    const clock = manualClock();
    const runtime = started(testRuntime(kindsOver(SMALL, () => store), store, clock));
    const queued = await runtime.enqueue(COLLECTION_MERGE_KIND, inputOf(true));
    if (!("id" in queued)) throw new Error("not queued");
    await finish(runtime, clock, queued.id);

    const job = runtime.snapshot()?.find((each) => each.id === queued.id);
    expect(job).toMatchObject({
      status: "done",
      lane: "cpu",
      title: "Merged",
      subjects: [
        { type: "library-collection", id: "a" },
        { type: "library-collection", id: "b" },
      ],
    });
    const file = job!.outputs.find((output) => output.kind === "artifact");
    expect(file).toMatchObject({ name: "Merged.pgn", mimeType: "application/x-chess-pgn" });
    const text = await (await runtime.readArtifact(file?.kind === "artifact" ? file.artifactId : ""))?.text();
    expect(text?.match(/\[Event/g)).toHaveLength(3);
    const summary = parseCollectionMergeSummary(job!.outputs.find((output) => output.kind === "data")?.kind === "data" ? (job!.outputs.find((output) => output.kind === "data") as { value: unknown }).value : undefined);
    expect(summary?.totals).toEqual({ read: 4, written: 3, duplicates: 1, unreadable: 0 });
    expect(job!.outputs.find((output) => output.kind === "entity")).toMatchObject({ ref: { type: "library-collection", id: mergedCollectionId(queued.id) } });
    expect((await loadUploadedCollections()).map((collection) => [collection.id, collection.name, collection.count])).toEqual([
      [mergedCollectionId(queued.id), "Merged", 3],
    ]);
  });

  it("resumes by itself on the next tab, and writes the same file byte for byte, however the tab died between two writes", async () => {
    const counting = crashingStore(memoryJobStore(), Number.POSITIVE_INFINITY);
    const clock = manualClock();
    const whole = started(testRuntime(kindsOver(BIG, () => counting.store), counting.store, clock));
    const reference = await whole.enqueue(COLLECTION_MERGE_KIND, inputOf(false));
    if (!("id" in reference)) throw new Error("not queued");
    await finish(whole, clock, reference.id);
    const job = whole.snapshot()?.find((each) => each.id === reference.id);
    expect(job?.status).toBe("done");
    // 1,100 games read in 500-game steps — planned once, never again.
    expect(job?.history.filter((event) => event.type === "planned")).toHaveLength(1);
    const referenceFile = job?.outputs.find((output) => output.kind === "artifact");
    const referenceText = await (await whole.readArtifact(referenceFile?.kind === "artifact" ? referenceFile.artifactId : ""))?.text();
    expect(referenceText?.match(/\[Event/g)).toHaveLength(900);
    const total = counting.writes();

    for (let after = 1; after < total; after += 1) {
      const inner = memoryJobStore();
      const { job: recovered, crashed } = await crashThenRecover({
        kinds: kindsOver(BIG, () => inner),
        inner,
        after,
        enqueue: (runtime) => runtime.enqueue(COLLECTION_MERGE_KIND, inputOf(false)),
      });
      expect(crashed, `crash after write ${after}`).toBe(true);
      if (recovered === undefined) continue;
      expect(recovered.status, `crash after write ${after}`).toBe("done");
      const file = recovered.outputs.find((output) => output.kind === "artifact");
      const text = await (await inner.readArtifact(file?.kind === "artifact" ? file.artifactId : ""))?.text();
      expect(text === referenceText, `crash after write ${after}`).toBe(true);
    }
  }, 120_000);

  it("adds the Library collection once, however the tab died between two writes", async () => {
    const counting = crashingStore(memoryJobStore(), Number.POSITIVE_INFINITY);
    const clock = manualClock();
    const whole = started(testRuntime(kindsOver(SMALL, () => counting.store), counting.store, clock));
    const reference = await whole.enqueue(COLLECTION_MERGE_KIND, inputOf(true));
    if (!("id" in reference)) throw new Error("not queued");
    await finish(whole, clock, reference.id);
    const total = counting.writes();

    for (let after = 1; after < total; after += 1) {
      const inner = memoryJobStore();
      const { job, crashed } = await crashThenRecover({
        kinds: kindsOver(SMALL, () => inner),
        inner,
        after,
        enqueue: (runtime) => runtime.enqueue(COLLECTION_MERGE_KIND, inputOf(true)),
      });
      expect(crashed, `crash after write ${after}`).toBe(true);
      if (job === undefined) continue;
      expect(job.status, `crash after write ${after}`).toBe("done");
      const id = mergedCollectionId(job.id);
      expect((await loadUploadedCollections()).filter((collection) => collection.id === id), `crash after write ${after}`).toHaveLength(1);
      expect(await loadUploadedGames(id), `crash after write ${after}`).toHaveLength(3);
    }
  }, 120_000);

  it("fails `source` at once when a collection is gone from the Library", async () => {
    const store = memoryJobStore();
    const clock = manualClock();
    const runtime = started(testRuntime(kindsOver(readerOf({ a: [numbered(1)] }), () => store), store, clock));
    const queued = await runtime.enqueue(COLLECTION_MERGE_KIND, inputOf(false));
    if (!("id" in queued)) throw new Error("not queued");
    await finish(runtime, clock, queued.id);
    expect(runtime.snapshot()?.find((job) => job.id === queued.id)).toMatchObject({ status: "failed", error: { code: "source", retryable: false } });
  });
});
