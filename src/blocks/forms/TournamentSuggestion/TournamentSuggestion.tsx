import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TipsAndUpdatesOutlinedIcon from "@mui/icons-material/TipsAndUpdatesOutlined";
import { useTranslation } from "react-i18next";

import { IconAction } from "../../../design-system/components/toolbars";
import { formatOfKind } from "../../../lib/libraryCollections";
import type { TournamentGuess } from "../../../lib/tournamentKind";
import { suggestionReasonOf } from "./suggestionReason";

export type TournamentSuggestionProps = {
  /** The type the games look like (`guessTournamentKind`). */
  guess: TournamentGuess;
  /** The draft already holds it: the mark on, this type chosen. */
  selected: boolean;
  /** Turn the mark on with the suggested type — in the draft; the reader still saves. */
  onApply: () => void;
  /**
   * Turn the suggestion down (CTA-142, the games table's: "not a tournament").
   * Present, a close button at the end; absent (the settings), none.
   */
  onDismiss?: () => void;
  /** A save is under way. */
  disabled?: boolean;
  /** The root; the button is `-apply`, the close button `-dismiss`, the words `-text`. */
  testId: string;
};

/**
 * **The tournament type a collection's games look like** (CTA-142) — the
 * guess (`lib/tournamentKind.ts`) named with the settings' own word for the
 * format and its reason, in the reader's language, and an **Apply** that
 * puts it in the draft (the mark on, the type chosen). Once the draft holds
 * it, Apply is off and the line says so: Save keeps it. The games table
 * offers it too, where Apply marks the collection at once and a close
 * button (`onDismiss`) turns it down. Presentational: the guess arrives,
 * Apply and Dismiss leave as callbacks.
 */
function TournamentSuggestion({ guess, selected, onApply, onDismiss, disabled = false, testId }: TournamentSuggestionProps) {
  const { t } = useTranslation();
  const type = t(`library.settings.formats.${formatOfKind(guess.kind)}`);
  return (
    <Box
      data-testid={testId}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        flexWrap: "wrap",
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <TipsAndUpdatesOutlinedIcon fontSize="small" color="primary" aria-hidden="true" />
      <Box sx={{ flex: "1 1 16rem", minWidth: 0 }}>
        <Typography variant="subtitle2" component="p">
          {t("library.settings.suggestion.title")}
        </Typography>
        <Typography variant="body2" data-testid={`${testId}-text`}>
          {t("library.settings.suggestion.text", { type, reason: suggestionReasonOf(t, guess) })}
        </Typography>
        {selected && (
          <Typography variant="caption" role="status" data-testid={`${testId}-selected`} sx={{ color: "text.secondary" }}>
            {t("library.settings.suggestion.selected")}
          </Typography>
        )}
      </Box>
      <Button
        variant="outlined"
        size="small"
        onClick={onApply}
        disabled={disabled || selected}
        aria-label={t("library.settings.suggestion.applyName", { type })}
        data-testid={`${testId}-apply`}
      >
        {t("library.settings.suggestion.apply")}
      </Button>
      {onDismiss !== undefined && (
        <IconAction label={t("library.settings.suggestion.dismiss")} onClick={onDismiss} disabled={disabled} testId={`${testId}-dismiss`}>
          <CloseRoundedIcon fontSize="small" />
        </IconAction>
      )}
    </Box>
  );
}

export default TournamentSuggestion;
