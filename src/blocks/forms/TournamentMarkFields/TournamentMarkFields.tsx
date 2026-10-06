import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { RadioGroupField, SwitchField } from "../../../design-system/components/forms";
import { isTableFormat, formatOfKind, TOURNAMENT_FORMATS, type CollectionTournament } from "../../../lib/libraryCollections";
import type { TournamentGuess } from "../../../lib/tournamentKind";
import { TournamentSuggestion } from "../TournamentSuggestion";

export type TournamentMarkFieldsProps = {
  /** The mark being edited: on or off, and its type (kept while off). */
  value: CollectionTournament;
  /** The whole next mark. */
  onChange: (mark: CollectionTournament) => void;
  /**
   * Whether the games allow the mark — every game sharing one `Event`
   * (`canBeTournament`). Off, the switch is disabled with its reason as its
   * description, and no type is offered.
   */
  canBeTournament: boolean;
  /** The type the games look like (`guessTournamentKind`), offered with an Apply. Absent, none. */
  suggestion?: TournamentGuess;
  /** A save is under way: every field off. */
  disabled?: boolean;
  /**
   * The prefix of its parts: `-tournament-switch`, `-suggestion` (its
   * `-apply`, `-text`), `-type` (each radio `-type-<format>`) and each
   * format's `-<format>-description`.
   */
  testId: string;
};

/**
 * **A collection's tournament mark, as fields** (CTA-142; CTA-121's
 * settings section, taken out so the import popup asks it too): the
 * switch — off, with its reason, where the games do not share one `Event` —
 * the type the games look like with an Apply (`TournamentSuggestion`), and,
 * while on, the formats as radios — every one selectable, Arena's label
 * saying it has no standings table yet — each one's line under the group. Presentational: the mark
 * and the verdict are props, a change leaves whole. Its words are the
 * Library's (`library.settings.*`).
 */
function TournamentMarkFields({ value, onChange, canBeTournament, suggestion, disabled = false, testId }: TournamentMarkFieldsProps) {
  const { t } = useTranslation();
  const marked = canBeTournament && value.enabled;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SwitchField
        label={t("library.settings.tournament")}
        help={canBeTournament ? t("library.settings.tournamentHelp") : t("library.settings.tournamentBlocked")}
        checked={marked}
        onChange={(enabled) => onChange({ enabled, type: value.type })}
        disabled={disabled || !canBeTournament}
        testId={`${testId}-tournament-switch`}
      />
      {canBeTournament && suggestion !== undefined && (
        <TournamentSuggestion
          guess={suggestion}
          selected={marked && value.type === formatOfKind(suggestion.kind)}
          onApply={() => onChange({ enabled: true, type: formatOfKind(suggestion.kind) })}
          disabled={disabled}
          testId={`${testId}-suggestion`}
        />
      )}
      {marked && (
        <>
          <RadioGroupField
            label={t("library.settings.type")}
            options={TOURNAMENT_FORMATS.map((format) => ({
              value: format,
              label:
                // Arena — selectable, but no table yet — says so in its own label.
                isTableFormat(format)
                  ? t(`library.settings.formats.${format}`)
                  : `${t(`library.settings.formats.${format}`)} — ${t("library.settings.comingLater")}`,
            }))}
            value={value.type}
            onChange={(type) => onChange({ enabled: true, type })}
            disabled={disabled}
            testId={`${testId}-type`}
          />
          {/* Each format's one-line description, all at once — Arena's too. */}
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
  );
}

export default TournamentMarkFields;
