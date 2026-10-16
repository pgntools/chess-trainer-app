import type { JobKind } from "@pgntools/jobs-runtime";

import type { EngineSessionDeps } from "../engineSession";
import { collectionMergeKind } from "./collectionMerge/kind";
import type { CollectionMergeReader } from "./collectionMerge/core";
import { computerAnalysisKind } from "./computerAnalysis/kind";
import { repertoireEvaluationKind } from "./repertoireEvaluation/kind";

/**
 * **The kind registry** (CTA-221) — every job kind the app runs, one line
 * each. Adding a kind is `.claude/rules/jobs.md`'s checklist: its folder
 * (`core.ts`, `kind.ts`, their tests), a line here, its `jobs.kinds.<key>.*`
 * words in both catalogs ({@link JOB_KIND_LOCALE_KEYS}), its views
 * (`views/jobs/kindViews.ts`) and an entry point on its entity's screen.
 * Nothing in the runtime, the store, the Jobs screens or the shell changes.
 *
 * A factory, not a list: the merge's collection output reads the file the
 * runtime sealed (`readArtifact`), and a test hands the engine kinds its own
 * engine and timeouts.
 */

export type JobKindDeps = {
  readArtifact: (artifactId: string) => Promise<Blob | undefined>;
  /** The engine kinds' engine session — a test's engine and timeouts. */
  engine?: EngineSessionDeps;
  /** The merge's Library — a test's in memory. */
  libraryReader?: CollectionMergeReader;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a registry holds kinds of every input and state, as the runtime's options do
export const jobKinds = (deps: JobKindDeps): readonly JobKind<any, any, any>[] => [
  computerAnalysisKind({ engine: deps.engine }),
  repertoireEvaluationKind({ engine: deps.engine }),
  collectionMergeKind({ readArtifact: deps.readArtifact, reader: deps.libraryReader }),
];

/** Each kind's words — `jobs.kinds.<key>.name`, `.description`, `.errors.<code>`. */
export const JOB_KIND_LOCALE_KEYS: Readonly<Record<string, string>> = {
  "analysis.computer-analysis": "computerAnalysis",
  "repertoire.evaluation": "repertoireEvaluation",
  "library.collection-merge": "collectionMerge",
};

/** A kind's locale key — `undefined` for a kind no longer registered. */
export const jobKindLocaleKey = (kindId: string): string | undefined => JOB_KIND_LOCALE_KEYS[kindId];
