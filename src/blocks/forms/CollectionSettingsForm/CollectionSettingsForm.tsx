import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { RadioGroupField, SettingsSection, SwitchField } from "../../../design-system/components/forms";
import {
  MAX_COLLECTION_DESCRIPTION_CHARS,
  TOURNAMENT_FORMATS,
  type TournamentFormat,
} from "../../../lib/libraryCollections";

/** What the form edits (CTA-121): the title, the description, and the tournament mark. */
export type CollectionSettingsDraft = {
  name: string;
  /** `""` for none — how the screen seeds and reads it, whatever the summary stores. */
  description: string;
  tournament: { enabled: boolean; type: TournamentFormat };
};

export type CollectionSettingsFormProps = {
  value: CollectionSettingsDraft;
  /** Replace any of the three fields — the draft is the screen's. */
  onChange: (patch: Partial<CollectionSettingsDraft>) => void;
  /**
   * Whether the collection's games allow the mark: every game sharing one
   * `Event` (`canBeTournament`). Off, the switch is disabled with its reason
   * — and the mark reads as off whatever is stored (`isTournamentCollection`).
   */
  canBeTournament: boolean;
  /** A save is under way: every field off. */
  disabled?: boolean;
  /** The form's root and the prefix of every id under it. */
  testId: string;
};

/**
 * **A collection's settings** (CTA-121) — its title, a description, and the
 * tournament mark with its type: the five formats as radios, only Swiss and
 * Round robin selectable, each with its one-line description under the
 * group. Presentational: the draft and the games' verdict are props, a
 * change leaves as a patch, and nothing is written here — the screen
 * (`views/library/CollectionSettingsScreen.tsx`) saves through
 * `updateCollectionSettings`. Its words are the app's (`library.settings.*`).
 */
function CollectionSettingsForm({
  value,
  onChange,
  canBeTournament,
  disabled = false,
  testId,
}: CollectionSettingsFormProps) {
  const { t } = useTranslation();
  const marked = canBeTournament && value.tournament.enabled;
  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 3 }}>
      <SettingsSection title={t("library.settings.general")} testId={`${testId}-general`}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            size="small"
            required
            disabled={disabled}
            label={t("library.settings.name")}
            helperText={t("library.settings.nameHelp")}
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
            slotProps={{ htmlInput: { "data-testid": `${testId}-name`, dir: "auto" } }}
          />
          <TextField
            size="small"
            multiline
            minRows={3}
            maxRows={10}
            disabled={disabled}
            label={t("library.settings.description")}
            helperText={t("library.settings.descriptionHelp")}
            value={value.description}
            onChange={(event) => onChange({ description: event.target.value })}
            slotProps={{
              htmlInput: {
                "data-testid": `${testId}-description`,
                maxLength: MAX_COLLECTION_DESCRIPTION_CHARS,
                dir: "auto",
              },
            }}
          />
        </Box>
      </SettingsSection>

      <SettingsSection title={t("library.settings.tournamentSection")} testId={`${testId}-tournament`}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <SwitchField
            label={t("library.settings.tournament")}
            help={canBeTournament ? t("library.settings.tournamentHelp") : t("library.settings.tournamentBlocked")}
            checked={marked}
            onChange={(enabled) => onChange({ tournament: { enabled, type: value.tournament.type } })}
            disabled={disabled || !canBeTournament}
            testId={`${testId}-tournament-switch`}
          />
          {marked && (
            <>
              <RadioGroupField
                label={t("library.settings.type")}
                options={TOURNAMENT_FORMATS.map((format) => ({
                  value: format,
                  label:
                    // The three not selectable yet say so in their own label.
                    format === "swiss" || format === "roundRobin"
                      ? t(`library.settings.formats.${format}`)
                      : `${t(`library.settings.formats.${format}`)} — ${t("library.settings.comingLater")}`,
                  disabled: format !== "swiss" && format !== "roundRobin",
                }))}
                value={value.tournament.type}
                onChange={(type) => onChange({ tournament: { enabled: true, type } })}
                disabled={disabled}
                testId={`${testId}-type`}
              />
              {/* Each format's one-line description, all five at once — the three not selectable yet included. */}
              <Box sx={{ display: "grid", gap: 0.5 }}>
                {TOURNAMENT_FORMATS.map((format) => (
                  <Typography
                    key={format}
                    variant="caption"
                    color="text.secondary"
                    data-testid={`${testId}-${format}-description`}
                    sx={{ paddingInlineStart: 1.5 }}
                  >
                    {t(`library.settings.formats.${format}`)} — {t(`library.settings.formatDescriptions.${format}`)}
                  </Typography>
                ))}
              </Box>
            </>
          )}
        </Box>
      </SettingsSection>
    </Box>
  );
}

export default CollectionSettingsForm;
