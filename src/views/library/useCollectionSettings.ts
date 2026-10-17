import { useState } from "react";

import type { CollectionSettingsDraft } from "../../blocks/forms";
import type { CollectionSummary } from "../../lib/libraryCollections";
import { updateCollectionSettings } from "../../lib/libraryCollectionStore";

/** The draft a summary opens with: `""` a missing description, Swiss a mark with no type. */
const draftOf = (summary: CollectionSummary): CollectionSettingsDraft => ({
  name: summary.name,
  description: summary.description ?? "",
  // A mark never switched on defaults to Swiss; a stored type is kept whatever the games say.
  tournament: { enabled: summary.tournament?.enabled === true, type: summary.tournament?.type ?? "swiss" },
});

const sameDraft = (a: CollectionSettingsDraft, b: CollectionSettingsDraft) =>
  a.name === b.name &&
  a.description.trim() === b.description.trim() &&
  a.tournament.enabled === b.tournament.enabled &&
  a.tournament.type === b.tournament.type;

export type CollectionSettings = {
  draft: CollectionSettingsDraft;
  change: (patch: Partial<CollectionSettingsDraft>) => void;
  /** The draft differs from what is stored. */
  dirty: boolean;
  /** Back to what is stored. */
  reset: () => void;
  save: () => Promise<void>;
  busy: boolean;
  /** The last save failed. */
  failed: boolean;
  /** The last save landed, and nothing was changed since. */
  saved: boolean;
};

/**
 * **A collection's settings, as a draft** (CTA-121; the collection page's
 * Settings tab since CTA-231 — Options until CTA-235 —, which took over the `/library/<c>/settings`
 * screen) — its title, description and tournament mark: one draft, held
 * by the page (so a change of tab keeps it), written whole on Save through
 * `updateCollectionSettings` — the summary alone — and taken back by
 * Cancel. A summary changed under it (the save itself, another tab) seeds
 * it again, adjusted during render.
 */
export function useCollectionSettings(summary: CollectionSummary): CollectionSettings {
  const stored = draftOf(summary);
  const [draft, setDraft] = useState(stored);
  const [seed, setSeed] = useState(stored);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!sameDraft(seed, stored)) {
    setSeed(stored);
    setDraft(stored);
  }

  return {
    draft,
    change: (patch) => {
      setSaved(false);
      setDraft((current) => ({ ...current, ...patch }));
    },
    dirty: !sameDraft(draft, stored),
    reset: () => {
      setFailed(false);
      setSaved(false);
      setDraft(stored);
    },
    save: async () => {
      setBusy(true);
      setFailed(false);
      const problem = await updateCollectionSettings(summary.id, {
        name: draft.name,
        description: draft.description.trim(),
        tournament: draft.tournament,
      });
      setBusy(false);
      if (problem !== undefined) setFailed(true);
      else setSaved(true);
    },
    busy,
    failed,
    saved,
  };
}
