import { analysisCasesSnapshot, loadAnalysisCases, subscribeAnalysisCases } from "../analysisCaseStore";
import { analysisProjectsSnapshot, loadAnalysisProjects, subscribeAnalysisProjects } from "../analysisProjectStore";
import { caseDerivedName } from "../analysisProjects";
import { loadUploadedCollections, subscribeUploadedCollections, uploadedCollectionsSnapshot } from "../libraryCollectionStore";
import { loadSavedRepertoires, savedRepertoiresSnapshot, subscribeSavedRepertoires } from "../savedRepertoireStore";
import { findShippedCollection } from "../shippedCollections";
import {
  ANALYSIS_CASE_ENTITY,
  ANALYSIS_PROJECT_ENTITY,
  isJobEntityType,
  LIBRARY_COLLECTION_ENTITY,
  REPERTOIRE_ENTITY,
  type JobEntityType,
} from "./entityTypes";

/**
 * **The entity registry** (CTA-221) — what a job can be applied to, and how
 * the Jobs screens name, link and check a job's subjects. A kind names entity
 * types (its `appliesTo`, its `subjects`) and never imports a screen; the
 * screens read a subject through here.
 *
 * Four types: an Analysis Case, an Analysis Project, a repertoire and a
 * Library collection (shipped or uploaded). Each reads its store's kept
 * snapshot — `undefined` until the first read lands — so a screen subscribes
 * ({@link subscribeJobEntities}) and asks again on a change.
 */

export * from "./entityTypes";

export type JobEntity = {
  type: JobEntityType;
  /** Its name now — `undefined` when it is gone, unnamed, or its store not read yet. */
  label(id: string): string | undefined;
  /** Its app path — `undefined` when it is gone (or not read yet). */
  link(id: string): string | undefined;
  /** Whether it is there — `undefined` until its store has been read. */
  exists(id: string): boolean | undefined;
};

/** A record's name, or `undefined` for an empty one. */
const named = (name: string | undefined): string | undefined => (name === undefined || name.trim() === "" ? undefined : name);

const caseOf = (id: string) => analysisCasesSnapshot()?.find((record) => record.id === id);
const projectOf = (id: string) => analysisProjectsSnapshot()?.find((project) => project.id === id);
const repertoireOf = (id: string) => savedRepertoiresSnapshot()?.find((repertoire) => repertoire.id === id);
const collectionOf = (id: string) => findShippedCollection(id) ?? uploadedCollectionsSnapshot()?.find((collection) => collection.id === id);

const present = <T>(snapshot: readonly T[] | undefined, found: T | undefined): boolean | undefined =>
  found !== undefined ? true : snapshot === undefined ? undefined : false;

export const JOB_ENTITIES: Readonly<Record<JobEntityType, JobEntity>> = {
  [ANALYSIS_CASE_ENTITY]: {
    type: ANALYSIS_CASE_ENTITY,
    label: (id) => {
      const record = caseOf(id);
      if (record === undefined) return undefined;
      const derived = caseDerivedName(record);
      return named(record.name) ?? (derived.kind === "game" ? named(derived.text) : undefined);
    },
    link: (id) => {
      const record = caseOf(id);
      return record === undefined
        ? undefined
        : `/analysis/projects/${encodeURIComponent(record.projectId)}/cases/${encodeURIComponent(record.id)}`;
    },
    exists: (id) => present(analysisCasesSnapshot(), caseOf(id)),
  },
  [ANALYSIS_PROJECT_ENTITY]: {
    type: ANALYSIS_PROJECT_ENTITY,
    label: (id) => named(projectOf(id)?.name),
    link: (id) => (projectOf(id) === undefined ? undefined : `/analysis/projects/${encodeURIComponent(id)}`),
    exists: (id) => present(analysisProjectsSnapshot(), projectOf(id)),
  },
  [REPERTOIRE_ENTITY]: {
    type: REPERTOIRE_ENTITY,
    label: (id) => named(repertoireOf(id)?.name),
    link: (id) => (repertoireOf(id) === undefined ? undefined : `/repertoires/${encodeURIComponent(id)}`),
    exists: (id) => present(savedRepertoiresSnapshot(), repertoireOf(id)),
  },
  /*
    No kind applies to a collection since CTA-232 (the merge, its one kind, is
    retired): kept for a reader's stored merge jobs — their subjects named and
    linked, an unfinished one removed with its collection (the deletion rule).
  */
  [LIBRARY_COLLECTION_ENTITY]: {
    type: LIBRARY_COLLECTION_ENTITY,
    label: (id) => named(collectionOf(id)?.name),
    link: (id) => (collectionOf(id) === undefined ? undefined : `/library/${encodeURIComponent(id)}`),
    // A shipped collection is always there; an upload once the Library's summaries are read.
    exists: (id) => (findShippedCollection(id) !== undefined ? true : present(uploadedCollectionsSnapshot(), collectionOf(id))),
  },
};

/** The registry's entry for a type — `undefined` for a type no longer registered. */
export const jobEntityOf = (type: string): JobEntity | undefined => (isJobEntityType(type) ? JOB_ENTITIES[type] : undefined);

/**
 * **Every store the registry reads, subscribed** — the first subscriber
 * starts each read. A screen listing jobs re-renders when a subject is
 * renamed or deleted.
 */
export const subscribeJobEntities = (listener: () => void): (() => void) => {
  const offs = [
    subscribeAnalysisCases(listener),
    subscribeAnalysisProjects(listener),
    subscribeSavedRepertoires(listener),
    subscribeUploadedCollections(listener),
  ];
  void loadAnalysisCases();
  void loadAnalysisProjects();
  void loadSavedRepertoires();
  void loadUploadedCollections();
  return () => {
    for (const off of offs) off();
  };
};

/** A version of what the registry reads — changes whenever any of its stores' snapshots does. */
export const jobEntitiesVersion = (): string =>
  [analysisCasesSnapshot(), analysisProjectsSnapshot(), savedRepertoiresSnapshot(), uploadedCollectionsSnapshot()]
    .map((snapshot) => (snapshot === undefined ? "-" : String(snapshotIds.get(snapshot) ?? remember(snapshot))))
    .join(":");

/** Each snapshot a number of its own — snapshots are stable between changes, new objects after one. */
const snapshotIds = new WeakMap<object, number>();
let nextSnapshotId = 0;
const remember = (snapshot: object): number => {
  nextSnapshotId += 1;
  snapshotIds.set(snapshot, nextSnapshotId);
  return nextSnapshotId;
};
