import { useState, type ComponentType } from "react";

import type { RepertoireFolder } from "../../lib/savedRepertoireFolders";
import type { SavedRepertoire } from "../../lib/savedRepertoires";
import { fileRepertoire, updateRepertoireSettings } from "../../lib/savedRepertoireStore";
import {
  BoardSection,
  FolderSection,
  GeneralSection,
  type RepertoireSettingsDraft,
  type RepertoireSettingsSectionProps,
} from "./RepertoireSettingsSections";

/**
 * **A repertoire's settings, as one draft** — shared by the settings screen
 * (`/repertoires/<id>/settings`, `RepertoireSettingsScreen.tsx`) and the
 * player's popup (`RepertoireSettingsDialog.tsx`, CTA-206): the sections, the
 * draft they edit, and Save, which writes it whole.
 */

/** The sections, top to bottom. A new group of options is one entry here. */
export const REPERTOIRE_SETTINGS_SECTIONS: readonly {
  id: string;
  labelKey: string;
  Body: ComponentType<RepertoireSettingsSectionProps>;
}[] = [
  { id: "general", labelKey: "repertoires.settings.sections.general", Body: GeneralSection },
  { id: "board", labelKey: "repertoires.settings.sections.board", Body: BoardSection },
  { id: "folder", labelKey: "repertoires.settings.sections.folder", Body: FolderSection },
];

/**
 * The draft of `saved`'s settings, seeded once: nothing is written until
 * `save`, which writes the whole draft through `updateRepertoireSettings`
 * (and the folder through `fileRepertoire`) — in place, so the repertoire
 * keeps its place in the list — and answers whether it was written.
 */
export function useRepertoireSettingsDraft(saved: SavedRepertoire, folders: readonly RepertoireFolder[]) {
  // A `folderId` naming a folder that is gone reads as Unfiled, as the list
  // reads it, so the tree preselects what the reader actually sees.
  const [draft, setDraft] = useState<RepertoireSettingsDraft>(() => ({
    name: saved.name,
    settings: saved.settings,
    folderId:
      saved.folderId !== null && folders.some((folder) => folder.id === saved.folderId)
        ? saved.folderId
        : null,
  }));
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const onChange: RepertoireSettingsSectionProps["onChange"] = (patch) =>
    setDraft((current) => ({
      name: patch.name ?? current.name,
      settings: { ...current.settings, ...patch.settings },
      // `null` is a real choice (Unfiled), so absence is told by `undefined`.
      folderId: patch.folderId === undefined ? current.folderId : patch.folderId,
    }));

  const save = async (): Promise<boolean> => {
    setBusy(true);
    const problem =
      (await updateRepertoireSettings(saved.id, draft.name.trim(), {
        ...draft.settings,
        description: draft.settings.description.trim(),
      })) ?? (await fileRepertoire(saved.id, draft.folderId));
    setBusy(false);
    setFailed(problem !== undefined);
    return problem === undefined;
  };

  return { draft, onChange, save, busy, failed };
}
