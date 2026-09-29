import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FolderOffRoundedIcon from "@mui/icons-material/FolderOffRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import { useTranslation } from "react-i18next";

import { FieldLabel, SideToggle, SwitchField } from "../../design-system/components/forms";
import { PickerList } from "../../design-system/components/lists";
import {
  MAX_REPERTOIRE_DESCRIPTION_CHARS,
  type RepertoireSettings,
} from "../../lib/repertoireSettings";
import { sortedRepertoireFolders } from "../../lib/savedRepertoireFolders";
import { useRepertoireFolders } from "./useRepertoireFolders";

/**
 * **The sections of a repertoire's settings screen** — one component per group
 * of options, each editing the screen's one draft through `onChange`.
 *
 * The screen (`RepertoireSettingsScreen.tsx`) renders a list of these and owns
 * nothing about any option, so an option lands in exactly one place here: a
 * control in the section it belongs to, or a new section beside these
 * (then one entry in the screen's `SECTIONS`). See
 * `lib/repertoireSettings.ts`, "Adding an option", for the other half.
 */

/**
 * What the screen edits: the title (the record's `name`), the settings, and
 * the folder it is filed under (`folderId`, `null` for Unfiled) — a record
 * field, not a setting, but chosen here and written on the same Save (CTA-68).
 */
export type RepertoireSettingsDraft = {
  name: string;
  settings: RepertoireSettings;
  folderId: string | null;
};

export type RepertoireSettingsSectionProps = {
  draft: RepertoireSettingsDraft;
  /** Replace the title and/or the folder, and/or merge into the settings. */
  onChange: (patch: {
    name?: string;
    settings?: Partial<RepertoireSettings>;
    folderId?: string | null;
  }) => void;
};

/** Title and description — what the repertoire is called and what it is. */
export function GeneralSection({ draft, onChange }: RepertoireSettingsSectionProps) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        size="small"
        label={t("repertoires.settings.name")}
        helperText={t("repertoires.settings.nameHelp")}
        placeholder={t("repertoires.untitled")}
        value={draft.name}
        onChange={(event) => onChange({ name: event.target.value })}
        slotProps={{ htmlInput: { "data-testid": "repertoire-settings-name", dir: "auto" } }}
      />
      <TextField
        multiline
        minRows={3}
        maxRows={10}
        label={t("repertoires.settings.description")}
        helperText={t("repertoires.settings.descriptionHelp")}
        value={draft.settings.description}
        onChange={(event) =>
          onChange({ settings: { description: event.target.value } })
        }
        slotProps={{
          htmlInput: {
            "data-testid": "repertoire-settings-description",
            maxLength: MAX_REPERTOIRE_DESCRIPTION_CHARS,
            dir: "auto",
          },
        }}
      />
      <SwitchField
        checked={draft.settings.protected}
        onChange={(next) => onChange({ settings: { protected: next } })}
        label={t("repertoires.settings.protected")}
        help={t("repertoires.settings.protectedHelp")}
        testId="repertoire-settings-protected"
      />
    </Box>
  );
}

/** How the board shows it — the side it is played from, and its arrows. */
export function BoardSection({ draft, onChange }: RepertoireSettingsSectionProps) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <FieldLabel component="span">{t("repertoires.settings.color")}</FieldLabel>
        <SideToggle
          value={draft.settings.color}
          onChange={(color) => onChange({ settings: { color } })}
          labels={{ white: t("repertoires.settings.white"), black: t("repertoires.settings.black") }}
          ariaLabel={t("repertoires.settings.color")}
          testId="repertoire-settings-color"
        />
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.75 }}>
          {t("repertoires.settings.colorHelp")}
        </Typography>
      </Box>
      <SwitchField
        checked={draft.settings.showArrows}
        onChange={(next) => onChange({ settings: { showArrows: next } })}
        label={t("repertoires.settings.showArrows")}
        help={t("repertoires.settings.showArrowsHelp")}
        testId="repertoire-settings-show-arrows"
      />
      {/* Beside the arrows it colours — off until the reader asks for it. */}
      <SwitchField
        checked={draft.settings.chanceArrows}
        onChange={(next) => onChange({ settings: { chanceArrows: next } })}
        label={t("repertoires.settings.chanceArrows")}
        help={t("repertoires.settings.chanceArrowsHelp")}
        testId="repertoire-settings-chance-arrows"
      />
    </Box>
  );
}

/**
 * Where it is filed — a tree select: Unfiled at the root and every folder
 * under it. Folders are one level (`lib/savedRepertoireFolders.ts`), so the
 * tree has two, and a pick is the draft's `folderId`, written on Save.
 */
export function FolderSection({ draft, onChange }: RepertoireSettingsSectionProps) {
  const { t } = useTranslation();
  const folders = sortedRepertoireFolders(useRepertoireFolders() ?? []);
  return (
    <Box sx={{ display: "grid", gap: 0.5 }}>
      <PickerList
        items={[
          { id: null, label: t("repertoires.folder.unfiled"), icon: <FolderOffRoundedIcon fontSize="small" /> },
          ...folders.map((folder) => ({
            id: folder.id,
            label: folder.name || t("repertoires.untitled"),
            depth: 1,
            icon: <FolderRoundedIcon fontSize="small" />,
          })),
        ]}
        value={draft.folderId}
        onChange={(folderId) => onChange({ folderId })}
        ariaLabel={t("repertoires.settings.folder")}
        testId="repertoire-settings-folder"
        noneTestId="repertoire-settings-folder-unfiled"
      />
      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
        {t(folders.length === 0 ? "repertoires.settings.folderNone" : "repertoires.settings.folderHelp")}
      </Typography>
    </Box>
  );
}
