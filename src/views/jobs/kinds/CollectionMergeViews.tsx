import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { NewJobFrame } from "../../../blocks/dialogs";
import { CollectionMergeForm, type CollectionMergeFormSource } from "../../../blocks/forms";
import { CollectionMergeSummary } from "../../../blocks/panels";
import { KeyValueList } from "../../../design-system/components/lists";
import { LIBRARY_COLLECTION_ENTITY } from "../../../lib/jobs/entityTypes";
import { JOB_ENTITIES } from "../../../lib/jobs/entities";
import {
  COLLECTION_MERGE_KIND,
  DEFAULT_COLLECTION_MERGE_SETTINGS,
  MIN_MERGE_SOURCES,
  collectionMergeSettingsFrom,
  defaultMergeName,
  parseCollectionMergeInput,
  parseCollectionMergeSummary,
  type CollectionMergeSettings,
} from "../../../lib/jobs/kinds/collectionMerge/core";
import { jobRuntime } from "../../../lib/jobs/runtime";
import { findShippedCollection } from "../../../lib/shippedCollections";
import { useUploadedCollections } from "../../library/useLibraryCollections";
import { linkTo } from "../jobViews";
import type { JobDataViewProps, JobViewProps, NewJobKindProps } from "../kindViewTypes";

/**
 * **Collections merged, started** (CTA-221, over CTA-220's form) — the
 * collections picked, in the order picked (reorder or remove one in the
 * form; two at the least), the dedupe mode, the name ("<first> + <n> more"
 * unless typed) and whether a new Library collection is made beside the file.
 */
export function CollectionMergeNewJob({ open, onClose, onStarted, subjects, kinds, kindId, onKindChange, testId }: NewJobKindProps) {
  const { t } = useTranslation();
  const uploaded = useUploadedCollections();
  const picked = useMemo(
    (): CollectionMergeFormSource[] =>
      subjects
        .filter((ref) => ref.type === LIBRARY_COLLECTION_ENTITY)
        .flatMap((ref) => {
          const found = findShippedCollection(ref.id) ?? uploaded?.find((each) => each.id === ref.id);
          return found === undefined ? [] : [{ id: found.id, name: found.name, count: found.count }];
        }),
    [subjects, uploaded],
  );
  const [sources, setSources] = useState<CollectionMergeFormSource[]>(picked);
  const [settings, setSettings] = useState<CollectionMergeSettings>(DEFAULT_COLLECTION_MERGE_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();

  // Seeded as the frame opens (and once the Library's summaries are read) — adjusted during render.
  const [seededFrom, setSeededFrom] = useState<readonly CollectionMergeFormSource[] | undefined>();
  const seed = open ? picked : undefined;
  if (seed !== seededFrom) {
    setSeededFrom(seed);
    if (seed !== undefined) {
      setSources(seed);
      setSettings(DEFAULT_COLLECTION_MERGE_SETTINGS);
      setProblem(undefined);
    }
  }

  const more = (count: number) => t("jobs.kinds.collectionMerge.form.more", { count });
  const name = settings.name.trim() || defaultMergeName(sources, more);
  const note = sources.length < MIN_MERGE_SOURCES ? t("jobs.kinds.collectionMerge.pickTwo") : undefined;

  const start = async () => {
    if (note !== undefined) return;
    setBusy(true);
    setProblem(undefined);
    const result = await jobRuntime().enqueue(COLLECTION_MERGE_KIND, {
      sources: sources.map(({ id, name: sourceName }) => ({ id, name: sourceName })),
      ...settings,
      name,
    });
    setBusy(false);
    if ("problem" in result) {
      setProblem(t(`jobs.newJob.problem.${result.problem}`));
      return;
    }
    onStarted({ id: result.id, title: name });
  };

  return (
    <NewJobFrame
      open={open}
      onClose={onClose}
      onStart={() => void start()}
      kinds={kinds}
      kindId={kindId}
      onKindChange={onKindChange}
      subjectLabel={sources.map((source) => source.name).join(", ")}
      startBlockedNote={note}
      problem={problem}
      busy={busy}
      testId={testId}
    >
      <CollectionMergeForm
        sources={sources}
        onSourcesChange={setSources}
        settings={settings}
        onChange={(patch) => {
          setProblem(undefined);
          setSettings((current) => collectionMergeSettingsFrom({ ...current, ...patch }));
        }}
        testId={`${testId}-form`}
      />
    </NewJobFrame>
  );
}

/** **The merge's summary, drawn** — per source and in all, and the new collection a link while it is there. */
export function CollectionMergeData({ output, testId }: JobDataViewProps) {
  useUploadedCollections();
  const summary = parseCollectionMergeSummary(output.value);
  if (summary === undefined) return null;
  const made = summary.collection.status === "added" ? summary.collection.id : undefined;
  const link = made === undefined ? undefined : JOB_ENTITIES[LIBRARY_COLLECTION_ENTITY].link(made);
  return <CollectionMergeSummary summary={summary} collectionLink={link === undefined ? undefined : linkTo(link)} testId={testId} />;
}

/** **What a merge was asked to do.** */
export function CollectionMergeParameters({ job, testId }: JobViewProps) {
  const { t } = useTranslation();
  const input = parseCollectionMergeInput(job.input);
  if (input === undefined) return null;
  const rows = [
    { id: "sources", label: t("jobs.kinds.collectionMerge.facts.sources"), value: input.sources.map((source) => source.name || source.id).join(", ") },
    { id: "dedupe", label: t("jobs.kinds.collectionMerge.facts.dedupe"), value: t(`jobs.kinds.collectionMerge.dedupe.${input.dedupe}`) },
    { id: "name", label: t("jobs.kinds.collectionMerge.facts.name"), value: <bdi>{input.name}</bdi> },
    {
      id: "outputs",
      label: t("jobs.facts.variants"),
      value: [t("jobs.kinds.collectionMerge.facts.pgnFile"), ...(input.outputs.collection ? [t("jobs.kinds.collectionMerge.facts.collection")] : [])].join(", "),
    },
  ];
  return <KeyValueList rows={rows} ariaLabel={t("jobs.facts.title")} testId={testId} />;
}
