import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { ConfirmDialog } from "../../../design-system/components/dialogs";
import type { EngineSearchChange, EngineSearchField } from "../../../lib/engineSearchSettings";
import { MOVE_TIME_INSTANT_MS } from "../../../lib/engineSettings";

export type EngineOptionsChangedDialogProps = {
  open: boolean;
  /** What the record ran with that differs from the settings in effect — `searchSettingsChanges`. */
  changes: readonly EngineSearchChange[];
  /**
   * What **Use these settings** would hold to the engine running —
   * `heldToEngine` over the record's values: each held setting and the value
   * it would take. Said under the list, so the reader knows before choosing.
   */
  held?: readonly { field: "threads" | "hashMb"; value: number }[];
  /** What was opened — a saved analysis, or a played game — for the words. */
  record: "analysis" | "game";
  /** **Dismiss**: keep the settings in effect (Escape and the backdrop too). */
  onDismiss: () => void;
  /** **Use these settings**: put the record's back. */
  onUse: () => void;
  /** The dialog's root; the rows `<testId>-change-<field>`, the actions `<testId>-dismiss` and `<testId>-use`. */
  testId: string;
};

/** Each setting's label — the words the top bar's Engine menu shows it under. */
const LABEL_KEY: Record<EngineSearchField, string> = {
  multiPv: "analysis.settings.multiPv",
  depth: "analysis.settings.depth",
  moveTimeMs: "analysis.settings.moveTime",
  infinite: "analysis.settings.infinite",
  threads: "analysis.settings.threads",
  hashMb: "analysis.settings.hash",
};

/** A setting's value as the reader reads it: a move time in seconds or "No limit", infinite on or off. */
const valueWords = (t: TFunction, field: EngineSearchField, value: number | boolean): string => {
  if (typeof value === "boolean") return t(value ? "engineChanged.on" : "engineChanged.off");
  if (field !== "moveTimeMs") return String(value);
  if (value === 0) return t("analysis.settings.moveTimeNone");
  return t("analysis.settings.moveTimeValue", { seconds: value <= MOVE_TIME_INSTANT_MS ? "0" : (value / 1000).toFixed(1) });
};

/**
 * **"Engine options changed"** (CTA-181) — shown once when a record is opened
 * whose engine settings differ from the reader's global ones in effect now: a
 * saved analysis on the Analysis Board, a played game resumed on Play with
 * Engine or Masked Pieces. One line per setting that differs — the record's
 * value, then the current one — and two answers: **Dismiss** (keep the
 * current settings) and **Use these settings** (the record's back, held to
 * the engine running — `held` says beforehand which would be, and to what).
 *
 * Presentational: the changes arrive (`searchSettingsChanges` compares only
 * what the top bar's Engine menu owns, and skips a field the record never
 * carried), the answers leave as callbacks. Its words are `engineChanged.*`.
 */
function EngineOptionsChangedDialog({ open, changes, held = [], record, onDismiss, onUse, testId }: EngineOptionsChangedDialogProps) {
  const { t, i18n } = useTranslation();
  // "Threads would be 1 and Hash (MB) would be 512" — the reader's language's own list.
  const list = new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" });
  return (
    <ConfirmDialog
      open={open}
      onClose={onDismiss}
      onConfirm={onUse}
      title={t("engineChanged.title")}
      message={t(`engineChanged.message.${record}`)}
      confirmLabel={t("engineChanged.use")}
      cancelLabel={t("engineChanged.dismiss")}
      width="sm"
      testId={testId}
      confirmTestId={`${testId}-use`}
      cancelTestId={`${testId}-dismiss`}
    >
      <Box component="ul" data-testid={`${testId}-changes`} sx={{ m: 0, mt: 1, paddingInlineStart: 3 }}>
        {changes.map((change) => (
          <li key={change.field} data-testid={`${testId}-change-${change.field}`}>
            {t("engineChanged.change", {
              setting: t(LABEL_KEY[change.field]),
              recorded: valueWords(t, change.field, change.recorded),
              current: valueWords(t, change.field, change.current),
            })}
          </li>
        ))}
      </Box>
      {held.length > 0 && (
        <Typography variant="body2" color="text.secondary" data-testid={`${testId}-held`} sx={{ mt: 1.5 }}>
          {t("engineChanged.held", {
            settings: list.format(held.map(({ field, value }) => t("engineChanged.heldTo", { setting: t(LABEL_KEY[field]), value }))),
          })}
        </Typography>
      )}
    </ConfirmDialog>
  );
}

export default EngineOptionsChangedDialog;
