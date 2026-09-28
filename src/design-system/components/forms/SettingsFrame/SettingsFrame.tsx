import type { FormEvent, ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

import type { VisibleLabel } from "../../a11y";

export type SettingsFrameProps = {
  /** The sections — `SettingsSection`s. */
  children: ReactNode;
  /** Keep the draft. */
  onSave: () => void;
  /** Drop the draft (and, usually, leave). */
  onCancel: () => void;
  saveLabel: VisibleLabel;
  cancelLabel: VisibleLabel;
  /** Nothing to keep yet (the draft is unchanged, or invalid). */
  saveDisabled?: boolean;
  /** The save is under way: both buttons off, a spinner in Save. */
  busy?: boolean;
  /** Anything in the foot before the buttons (a problem line). */
  footer?: ReactNode;
  /** The frame's test id; the parts are `-body`, `-save` and `-cancel`. */
  testId: string;
};

/**
 * **A settings screen** (CTA-108): its sections in the one region that
 * scrolls, over a fixed foot with Save (`contained`) and Cancel (text) — a
 * form, so Enter in a one-line field saves. The draft is the caller's
 * (`useDraft` keeps one); this frame only lays it out and submits it. The
 * analyses' and the repertoires' settings screens were this layout twice.
 */
function SettingsFrame({
  children,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
  saveDisabled = false,
  busy = false,
  footer,
  testId,
}: SettingsFrameProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!saveDisabled && !busy) onSave();
  };
  return (
    <Box
      component="form"
      noValidate
      onSubmit={submit}
      data-testid={testId}
      sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}
    >
      <Box data-testid={`${testId}-body`} sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gap: 3, alignContent: "start", pb: 2 }}>
        {children}
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          pt: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{footer}</Box>
        <Button onClick={onCancel} disabled={busy} data-testid={`${testId}-cancel`}>
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saveDisabled || busy}
          aria-busy={busy || undefined}
          startIcon={busy ? <CircularProgress aria-hidden size={16} color="inherit" /> : undefined}
          data-testid={`${testId}-save`}
        >
          {saveLabel}
        </Button>
      </Box>
    </Box>
  );
}

export default SettingsFrame;
