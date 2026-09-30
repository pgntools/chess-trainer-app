import { useState, type ComponentType } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { StatusText } from "../../design-system/components/feedback";
import { SettingsFrame, SettingsSection } from "../../design-system/components/forms";
import { MissState } from "../../design-system/components/states";
import type { RepertoireFolder } from "../../lib/savedRepertoireFolders";
import type { SavedRepertoire } from "../../lib/savedRepertoires";
import { fileRepertoire, updateRepertoireSettings } from "../../lib/savedRepertoireStore";
import { RightPanel } from "../main/rightPanel";
import {
  BoardSection,
  FolderSection,
  GeneralSection,
  type RepertoireSettingsDraft,
  type RepertoireSettingsSectionProps,
} from "./RepertoireSettingsSections";
import { ReadingRepertoires } from "./RepertoireBoard";
import { useRepertoireFolders } from "./useRepertoireFolders";
import { useSavedRepertoires } from "./useSavedRepertoires";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";

/**
 * **A repertoire's settings** (`/repertoires/<id>/settings`) — its title,
 * description and main color, the folder it is filed under (CTA-68 — the one
 * place a repertoire moves between folders), and whatever option comes next.
 *
 * The screen is a **list of sections** over **one draft**: each section
 * (`RepertoireSettingsSections.tsx`) edits the draft through a patch, and
 * nothing is written until Save, which writes the whole draft at once through
 * `updateRepertoireSettings` (and the folder through `fileRepertoire`) — in
 * place, so the repertoire keeps its place in the list. Cancel drops the draft. Both go back where the reader came from
 * (the router state a link here passes), or to the repertoire's board.
 *
 * A `SettingsFrame` of `SettingsSection`s since CTA-113 (the title the
 * page's `h1`, each section an `h2`), the analyses' settings screen's shape.
 *
 * Adding an option never touches this file unless it needs a new *section*;
 * then it is one entry in {@link SECTIONS}.
 */

/** The sections, top to bottom. A new group of options is one entry here. */
const SECTIONS: readonly {
  id: string;
  labelKey: string;
  Body: ComponentType<RepertoireSettingsSectionProps>;
}[] = [
  { id: "general", labelKey: "repertoires.settings.sections.general", Body: GeneralSection },
  { id: "board", labelKey: "repertoires.settings.sections.board", Body: BoardSection },
  { id: "folder", labelKey: "repertoires.settings.sections.folder", Body: FolderSection },
];

function RepertoireSettingsScreen() {
  const { id } = useParams();
  const repertoires = useSavedRepertoires();
  // The draft is seeded from the folders too, so both reads must have landed.
  const folders = useRepertoireFolders();
  const { t } = useTranslation();
  if (repertoires === undefined || folders === undefined) return <ReadingRepertoires />;
  const saved = repertoires.find((row) => row.id === id);

  if (saved === undefined) {
    return (
      <MissState
        backLabel={t("repertoires.detail.back")}
        backLink={{ component: RouterLink, to: "/repertoires" }}
        testId="repertoire-settings-missing"
      >
        {t("repertoires.detail.missing")}
      </MissState>
    );
  }
  // Keyed, so the draft is seeded from this record and no other.
  return <SettingsForm key={saved.id} saved={saved} folders={folders} />;
}

function SettingsForm({
  saved,
  folders,
}: {
  saved: SavedRepertoire;
  folders: readonly RepertoireFolder[];
}) {
  // The screen's title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle(saved.name || t("repertoires.untitled"));

  // Where Save and Cancel go: the screen that linked here, else the board.
  const from = (location.state as { from?: unknown } | null)?.from;
  const back =
    typeof from === "string" ? from : `/repertoires/${encodeURIComponent(saved.id)}`;

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

  const save = async () => {
    setBusy(true);
    const problem =
      (await updateRepertoireSettings(saved.id, draft.name.trim(), {
        ...draft.settings,
        description: draft.settings.description.trim(),
      })) ?? (await fileRepertoire(saved.id, draft.folderId));
    setBusy(false);
    if (problem !== undefined) {
      setFailed(true);
      return;
    }
    navigate(back);
  };

  return (
    <>
      <Box data-testid="repertoire-settings-screen" sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 700 }}>
            {t("repertoires.settings.title")}
          </Typography>
          <Typography variant="body2" dir="auto" sx={{ color: "text.secondary" }} noWrap>
            {saved.name || t("repertoires.untitled")}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <SettingsFrame
            onSave={() => void save()}
            onCancel={() => navigate(back)}
            saveLabel={t("repertoires.settings.save")}
            cancelLabel={t("repertoires.settings.cancel")}
            busy={busy}
            footer={
              failed && (
                <StatusText tone="error" testId="repertoire-settings-problem">
                  {t("repertoires.settings.problem")}
                </StatusText>
              )
            }
            testId="repertoire-settings"
          >
            {SECTIONS.map(({ id, labelKey, Body }) => (
              <SettingsSection key={id} title={t(labelKey)} testId={`repertoire-settings-section-${id}`}>
                <Body draft={draft} onChange={onChange} />
              </SettingsSection>
            ))}
          </SettingsFrame>
        </Box>
      </Box>

      <RightPanel>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("repertoires.storage")}
        </Typography>
      </RightPanel>
    </>
  );
}

export default RepertoireSettingsScreen;
