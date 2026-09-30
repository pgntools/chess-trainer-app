import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { ArrowSettingsFields } from "../../../../blocks/forms";
import { FolderPicker } from "../../../../blocks/lists";
import { StatusText } from "../../../../design-system/components/feedback";
import { FieldLabel, SettingsFrame, SettingsSection, SideToggle, SwitchField } from "../../../../design-system/components/forms";
import { LoadingLine, MissState } from "../../../../design-system/components/states";
import {
  MAX_ANALYSIS_DESCRIPTION_CHARS,
  type SavedAnalysis,
  type SavedAnalysisSettingsEdit,
} from "../../../../lib/savedAnalyses";
import { updateSavedAnalysisSettings } from "../../../../lib/savedAnalysisStore";
import type { AnalysisFolder } from "../../../../lib/savedAnalysisFolders";
import { useOwnPageHeading, usePageTitle } from "../../../main/pageTitle";
import { RightPanel } from "../../../main/rightPanel";
import { useAnalysisFolders } from "./useAnalysisFolders";
import { useSavedAnalyses } from "./useSavedAnalyses";

/**
 * **A saved analysis' settings** (`/tools/analysis/saved/<id>/settings`,
 * CTA-73) — the repertoire settings screen's shape over an analysis: one
 * draft, three sections, written on Save.
 *
 * - **General** — the title (the record's `name`) and a description.
 * - **Board** — the side the board opens facing (`orientation`), whether
 *   it opens drawing the next-move arrows (`showArrows`), what sizes them
 *   (`arrowWidthSource`) and their colours (`arrowPalette`, CTA-98). A flip
 *   or the board's Arrows tab is the session's; these are what it opens on.
 *   Every width source is offered here: whether the tree carries its tag is
 *   the board's to say.
 * - **Folder** — where it is filed: Unfiled, or any folder of the nested tree.
 *
 * Since CTA-113 the design system's `SettingsFrame` (the sections scroll,
 * Save and Cancel stay in its foot) with a `SettingsSection` each — the
 * title the page's `h1`, each section an `h2` — a `SideToggle`, a
 * `SwitchField`, the `ArrowSettingsFields` and `FolderPicker` blocks.
 *
 * Save writes the whole draft at once (`updateSavedAnalysisSettings`, in
 * place, so the analysis keeps its place in the list); Cancel drops it. Both
 * go back where the reader came from — the router state a link here passes —
 * else to the analysis on its board.
 */
function AnalysisSettingsScreen() {
  const { id } = useParams();
  const analyses = useSavedAnalyses();
  const folders = useAnalysisFolders();
  const { t } = useTranslation();

  // Arriving by URL: the store's first read is still out — not a miss yet.
  if (analyses === undefined || folders === undefined) {
    return <LoadingLine testId="analysis-settings-loading">{t("savedAnalyses.loading")}</LoadingLine>;
  }
  const saved = analyses.find((row) => row.id === id);
  if (saved === undefined) {
    return (
      <MissState
        backLabel={t("analysis.settingsScreen.back")}
        backLink={{ component: RouterLink, to: "/tools/analysis/saved" }}
        testId="analysis-settings-missing"
      >
        {t("analysis.settingsScreen.missing")}
      </MissState>
    );
  }
  // Keyed, so the draft is seeded from this record and no other.
  return <SettingsForm key={saved.id} saved={saved} folders={folders} />;
}

function SettingsForm({ saved, folders }: { saved: SavedAnalysis; folders: readonly AnalysisFolder[] }) {
  // The screen's title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle(saved.name || t("savedAnalyses.untitled"));

  // Where Save and Cancel go: the screen that linked here, else the board.
  const from = (location.state as { from?: unknown } | null)?.from;
  const back = typeof from === "string" ? from : `/tools/analysis?analysis=${encodeURIComponent(saved.id)}`;

  // A folder that is gone reads as Unfiled, as the list reads it.
  const [draft, setDraft] = useState<SavedAnalysisSettingsEdit>(() => ({
    name: saved.name,
    description: saved.description,
    orientation: saved.orientation,
    showArrows: saved.showArrows,
    arrowWidthSource: saved.arrowWidthSource,
    arrowPalette: saved.arrowPalette,
    folderId: saved.folderId !== null && folders.some((folder) => folder.id === saved.folderId) ? saved.folderId : null,
  }));
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const change = (patch: Partial<SavedAnalysisSettingsEdit>) => setDraft((current) => ({ ...current, ...patch }));

  const save = async () => {
    setBusy(true);
    const problem = await updateSavedAnalysisSettings(saved.id, draft);
    setBusy(false);
    if (problem !== undefined) {
      setFailed(true);
      return;
    }
    navigate(back);
  };

  return (
    <>
      <Box data-testid="analysis-settings-screen" sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 700 }}>
            {t("analysis.settingsScreen.title")}
          </Typography>
          <Typography variant="body2" dir="auto" sx={{ color: "text.secondary" }} noWrap>
            {saved.name || t("savedAnalyses.untitled")}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <SettingsFrame
            onSave={() => void save()}
            onCancel={() => navigate(back)}
            saveLabel={t("analysis.settingsScreen.save")}
            cancelLabel={t("analysis.settingsScreen.cancel")}
            busy={busy}
            footer={
              failed && (
                <StatusText tone="error" testId="analysis-settings-problem">
                  {t("analysis.changes.problem.storage")}
                </StatusText>
              )
            }
            testId="analysis-settings"
          >
            <SettingsSection title={t("analysis.settingsScreen.sections.general")} testId="analysis-settings-section-general">
              <TextField
                size="small"
                label={t("analysis.settingsScreen.name")}
                placeholder={t("savedAnalyses.untitled")}
                value={draft.name}
                onChange={(event) => change({ name: event.target.value })}
                slotProps={{ htmlInput: { "data-testid": "analysis-settings-name", dir: "auto" } }}
              />
              <TextField
                multiline
                minRows={3}
                maxRows={10}
                label={t("analysis.settingsScreen.description")}
                helperText={t("analysis.settingsScreen.descriptionHelp")}
                value={draft.description}
                onChange={(event) => change({ description: event.target.value })}
                slotProps={{
                  htmlInput: { "data-testid": "analysis-settings-description", maxLength: MAX_ANALYSIS_DESCRIPTION_CHARS, dir: "auto" },
                }}
              />
            </SettingsSection>

            <SettingsSection title={t("analysis.settingsScreen.sections.board")} testId="analysis-settings-section-board">
              <Box>
                <FieldLabel component="span">{t("analysis.settingsScreen.color")}</FieldLabel>
                <SideToggle
                  value={draft.orientation}
                  onChange={(orientation) => change({ orientation })}
                  labels={{ white: t("analysis.settingsScreen.white"), black: t("analysis.settingsScreen.black") }}
                  ariaLabel={t("analysis.settingsScreen.color")}
                  testId="analysis-settings-color"
                />
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.75 }}>
                  {t("analysis.settingsScreen.colorHelp")}
                </Typography>
              </Box>
              <SwitchField
                label={t("analysis.settings.arrows")}
                help={t("analysis.settingsScreen.arrowsHelp")}
                checked={draft.showArrows}
                onChange={(showArrows) => change({ showArrows })}
                testId="analysis-settings-show-arrows"
              />
              <ArrowSettingsFields
                widthSource={draft.arrowWidthSource}
                onWidthSourceChange={(arrowWidthSource) => change({ arrowWidthSource })}
                palette={draft.arrowPalette}
                onPaletteChange={(arrowPalette) => change({ arrowPalette })}
                testId="analysis-settings-arrows"
              />
            </SettingsSection>

            <SettingsSection title={t("analysis.settingsScreen.sections.folder")} testId="analysis-settings-section-folder">
              <FolderPicker
                folders={folders}
                value={draft.folderId}
                onChange={(folderId) => change({ folderId })}
                noneLabel={t("savedAnalyses.folder.unfiled")}
                untitledLabel={t("savedAnalyses.folder.untitled")}
                ariaLabel={t("analysis.settingsScreen.sections.folder")}
                testId="analysis-settings-folder-picker"
                noneTestId="analysis-settings-folder-unfiled"
              />
            </SettingsSection>
          </SettingsFrame>
        </Box>
      </Box>

      <RightPanel>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("savedAnalyses.storage")}
        </Typography>
      </RightPanel>
    </>
  );
}

export default AnalysisSettingsScreen;
