import { useId, useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

import { monospaceOf } from "../../../theme/typography";
import type { VisibleLabel } from "../../a11y";
import StatusText from "../../feedback/StatusText/StatusText";
import IconAction from "../../toolbars/IconAction/IconAction";
import FieldLabel from "../FieldLabel/FieldLabel";

export type CopyFieldProps = {
  /** The field's label ("FEN"). */
  label: VisibleLabel;
  /** What it holds — machine words (a FEN, a PGN), set in monospace, left to right. */
  value: string;
  /** The copy button's words: its tooltip, and — with the label — its name ("Copy: FEN"). */
  copyLabel: string;
  /** Said once the clipboard took it ("Copied."). */
  copiedLabel: string;
  /** Said when it would not ("Could not copy — select the text instead."). */
  failedLabel: string;
  /** The copy is off (an illegal position's FEN) — the value still shows. */
  disabled?: boolean;
  /** Said under the field while `disabled`, in place of the copy's outcome. */
  disabledHint?: string;
  /** The rows the field grows to before it scrolls. */
  maxRows?: number;
  /** On the text input; the parts are `-copy`, `-copy-state` and `-copy-disabled`. */
  testId: string;
};

/**
 * **A value to copy out** (CTA-113) — the way a FEN or a PGN leaves a screen:
 * its label over a read-only field (monospace, `dir="ltr"`, the theme's
 * token) with a copy button, the outcome said under it as a `status` (or an
 * `alert` when the clipboard refused). The write is guarded: it needs a
 * secure context and the permission, and a copy that fails says so rather
 * than pretending — the text stays selectable. It was `CopyableValue`.
 */
function CopyField({
  label,
  value,
  copyLabel,
  copiedLabel,
  failedLabel,
  disabled = false,
  disabledHint,
  maxRows = 6,
  testId,
}: CopyFieldProps) {
  const inputId = useId();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        <IconAction label={`${copyLabel}: ${String(label)}`} disabled={disabled} onClick={copy} testId={`${testId}-copy`}>
          <ContentCopyRoundedIcon fontSize="small" />
        </IconAction>
      </Box>
      <TextField
        id={inputId}
        fullWidth
        multiline
        size="small"
        maxRows={maxRows}
        value={value}
        slotProps={{
          htmlInput: {
            "data-testid": testId,
            readOnly: true,
            // Machine words in a panel that mirrors: the attribute, never CSS (the RTL plugin flips it).
            dir: "ltr",
          },
        }}
        sx={{ "& textarea": { fontFamily: monospaceOf, fontSize: "0.75rem" } }}
      />
      {disabled && disabledHint !== undefined ? (
        <StatusText tone="warning" testId={`${testId}-copy-disabled`}>
          {disabledHint}
        </StatusText>
      ) : (
        state !== "idle" && (
          <StatusText tone={state === "copied" ? "success" : "error"} testId={`${testId}-copy-state`}>
            {state === "copied" ? copiedLabel : failedLabel}
          </StatusText>
        )
      )}
    </Box>
  );
}

export default CopyField;
