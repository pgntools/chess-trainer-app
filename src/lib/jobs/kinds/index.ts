import type { JobKind } from "@pgntools/jobs-runtime";

import type { EngineSessionDeps } from "../engineSession";
import { computerAnalysisKind } from "./computerAnalysis/kind";
import { evaluatePositionKind } from "./evaluatePosition/kind";
import { repertoireEvaluationKind } from "./repertoireEvaluation/kind";

/**
 * **The kind registry** (CTA-221) — every job kind the app runs, one line
 * each. Adding a kind is `.claude/rules/jobs.md`'s checklist: its folder
 * (`core.ts`, `kind.ts`, their tests), a line here, its `jobs.kinds.<key>.*`
 * words in both catalogs ({@link JOB_KIND_LOCALE_KEYS}), its views
 * (`views/jobs/kindViews.ts`) and an entry point on its entity's screen.
 * Nothing in the runtime, the store, the Jobs screens or the shell changes.
 *
 * A factory, not a list: a test hands the engine kinds its own engine and
 * timeouts.
 *
 * **Retiring a kind** (CTA-232, the collection merge): its line goes, and
 * its id moves to {@link RETIRED_JOB_KIND_LOCALE_KEYS} — a reader's stored
 * jobs of it stay, which the runtime keeps but never claims (it can only
 * delete them), and the Jobs screens list under their old name, offering
 * Delete alone.
 */

export type JobKindDeps = {
  /** The engine kinds' engine session — a test's engine and timeouts. */
  engine?: EngineSessionDeps;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a registry holds kinds of every input and state, as the runtime's options do
export const jobKinds = (deps: JobKindDeps = {}): readonly JobKind<any, any, any>[] => [
  computerAnalysisKind({ engine: deps.engine }),
  repertoireEvaluationKind({ engine: deps.engine }),
  // CTA-238: one position searched — queued by the Accuracy Trainer's Find Best Move v2 alone, which is
  // dev-only: so is the kind, a spread the production build drops (no chunk of it, no name).
  ...(import.meta.env.DEV ? [evaluatePositionKind({ engine: deps.engine })] : []),
];

/** Each kind's words — `jobs.kinds.<key>.name`, `.description`, `.errors.<code>`. */
export const JOB_KIND_LOCALE_KEYS: Readonly<Record<string, string>> = {
  "analysis.computer-analysis": "computerAnalysis",
  "repertoire.evaluation": "repertoireEvaluation",
  // Dev-only, as its kind (CTA-238).
  ...(import.meta.env.DEV ? { "analysis.evaluate-position": "evaluatePosition" } : {}),
};

/**
 * **The kinds the app ran once and runs no more** — each its name's key,
 * `jobs.retiredKinds.<key>`: `library.collection-merge` (CTA-220 / CTA-221,
 * retired in CTA-232 — merging is the Library's own action now).
 */
export const RETIRED_JOB_KIND_LOCALE_KEYS: Readonly<Record<string, string>> = {
  "library.collection-merge": "collectionMerge",
};

/** A kind's locale key — `undefined` for a kind no longer registered. */
export const jobKindLocaleKey = (kindId: string): string | undefined => JOB_KIND_LOCALE_KEYS[kindId];

/** Whether the app runs this kind — a stored job of any other is kept, never run, and can only be deleted. */
export const isRegisteredJobKind = (kindId: string): boolean => Object.hasOwn(JOB_KIND_LOCALE_KEYS, kindId);
