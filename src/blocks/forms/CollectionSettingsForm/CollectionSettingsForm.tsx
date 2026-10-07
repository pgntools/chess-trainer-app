import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

import { SettingsSection } from "../../../design-system/components/forms";
import { MAX_COLLECTION_DESCRIPTION_CHARS, type TournamentFormat } from "../../../lib/libraryCollections";
import type { TournamentGuess } from "../../../lib/tournamentKind";
import { TournamentMarkFields } from "../TournamentMarkFields";

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
  /**
   * The type the games look like (CTA-142, `guessTournamentKind` over their
   * tags), shown with an Apply that turns the mark on with it. Absent — no
   * guess, or the games still being read — nothing is suggested; nor is
   * anything while the games cannot be a tournament.
   */
  suggestion?: TournamentGuess;
  /** A save is under way: every field off. */
  disabled?: boolean;
  /** The form's root and the prefix of every id under it. */
  testId: string;
};

/**
 * **A collection's settings** (CTA-121) — its title, a description, and the
 * tournament mark with its type: the formats as radios, every one with a
 * table selectable (CTA-142; Arena "coming later"), each with its one-line
 * description under the group — and, over them, the type the games look
 * like with an Apply (`TournamentSuggestion`). Presentational: the draft,
 * the games' verdict and the guess are props, a change leaves as a patch,
 * and nothing is written here — the screen
 * (`views/library/CollectionSettingsScreen.tsx`) saves through
 * `updateCollectionSettings`. Its words are the app's (`library.settings.*`).
 */
function CollectionSettingsForm({
  value,
  onChange,
  canBeTournament,
  suggestion,
  disabled = false,
  testId,
}: CollectionSettingsFormProps) {
  const { t } = useTranslation();
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
        <TournamentMarkFields
          value={value.tournament}
          onChange={(tournament) => onChange({ tournament })}
          canBeTournament={canBeTournament}
          suggestion={suggestion}
          disabled={disabled}
          testId={testId}
        />
      </SettingsSection>
    </Box>
  );
}

export default CollectionSettingsForm;
