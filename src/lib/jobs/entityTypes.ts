/**
 * **The entity types a job can be applied to** (CTA-221) — the names a kind's
 * `appliesTo` and `subjects` use, and the stores' deletes hand the deletion
 * rule (`subjectDeletion.ts`). Imports nothing, so a store can name its own
 * type without reaching the registry (`entities.ts`), which reads the stores.
 */

export const ANALYSIS_CASE_ENTITY = "analysis-case";
export const ANALYSIS_PROJECT_ENTITY = "analysis-project";
export const REPERTOIRE_ENTITY = "repertoire";
export const LIBRARY_COLLECTION_ENTITY = "library-collection";

export const JOB_ENTITY_TYPES = [ANALYSIS_CASE_ENTITY, ANALYSIS_PROJECT_ENTITY, REPERTOIRE_ENTITY, LIBRARY_COLLECTION_ENTITY] as const;
export type JobEntityType = (typeof JOB_ENTITY_TYPES)[number];

export const isJobEntityType = (value: string): value is JobEntityType => (JOB_ENTITY_TYPES as readonly string[]).includes(value);
