import { useId, type KeyboardEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { VisibleLabel } from "../../../components/a11y";
import { InlineAlert } from "../../../components/feedback";
import { FileInputButton } from "../../../components/forms";
import { LoadingSpinnerLine } from "../../../components/states";

/** The parts' own test ids, for a screen whose tests named them before (each defaults from `testId`). */
export type UploadPanelTestIds = Partial<
  Record<"pick" | "input" | "paste" | "submit" | "busy" | "problem", string>
>;

/** What went wrong with the last text: the words, and machine words under them (a parse error). */
export type UploadProblem = { message: ReactNode; detail?: string };

export type UploadPanelProps = {
  /** The file button's words ("Choose a .pgn file"). Absent (with `onFiles`), no file button — the host has one elsewhere. */
  fileLabel?: VisibleLabel;
  /** The file types the button offers. */
  accept?: string | readonly string[];
  /** Files picked — the caller reads them. */
  onFiles?: (files: File[]) => void;
  /** Take several files at once. */
  multiple?: boolean;
  /** A line beside the file button ("…or drop a file anywhere on the editor"). */
  fileHint?: ReactNode;
  /** The paste box's label. */
  pasteLabel: VisibleLabel;
  pasteValue: string;
  onPasteChange: (value: string) => void;
  /** A caption under the paste box — its help, or what the text read as ("Read: 12 games"). */
  pasteHelp?: ReactNode;
  /** The paste box's rows: it grows from `min` to `max`, then scrolls. */
  pasteRows?: { min: number; max: number };
  /** Read the pasted text — the button, or Ctrl / ⌘ + Enter in the box. Off while the box is blank. */
  onSubmit: () => void;
  submitLabel: VisibleLabel;
  /** `contained` when the paste is the panel's main way in; `outlined` (the default) beside a file button. */
  submitVariant?: "contained" | "outlined";
  /** The file button's look: `contained` (the default) as the main way in, `outlined` in a panel. */
  fileVariant?: "contained" | "outlined";
  size?: "small" | "medium";
  /** Everything off — a file is being read, a dialog is open over it. */
  disabled?: boolean;
  /** Reading: the line beside the submit ("Reading…"), a `status`. Absent, not busy. */
  busy?: ReactNode;
  /** The last text's problem, as an alert. `null` or absent for none. */
  problem?: UploadProblem | null;
  /**
   * The root; the parts are `-pick` (the file button), `-input` (its hidden
   * input), `-paste`, `-submit`, `-busy` and `-problem` — each overridable
   * through `testIds`.
   */
  testId: string;
  testIds?: UploadPanelTestIds;
};

/**
 * **Something to bring in, by file or by paste** (CTA-113) — the PGN inputs
 * of the position editor, the Load tab, the repertoire upload and the
 * Library's upload were five copies with three paste-box sizes and two file
 * techniques: a `FileInputButton` (and a line beside it), a paste box that
 * reads left to right and grows then scrolls, the submit (Ctrl / ⌘ + Enter
 * in the box too, where a plain Enter is a new line), a busy line announced
 * as a `status`, and the last text's problem as an `InlineAlert` with its
 * machine words beneath.
 *
 * Generic: it knows no PGN. The words, the file types and every callback are
 * the caller's; `PgnInput` (a block) is this over a PGN.
 */
function UploadPanel({
  fileLabel,
  accept,
  onFiles,
  multiple = false,
  fileHint,
  pasteLabel,
  pasteValue,
  onPasteChange,
  pasteHelp,
  pasteRows = { min: 4, max: 10 },
  onSubmit,
  submitLabel,
  submitVariant = "outlined",
  fileVariant = "contained",
  size = "small",
  disabled = false,
  busy,
  problem,
  testId,
  testIds = {},
}: UploadPanelProps) {
  const helpId = useId();
  const blank = pasteValue.trim() === "";
  const ids = {
    pick: testIds.pick ?? `${testId}-pick`,
    input: testIds.input ?? `${testId}-input`,
    paste: testIds.paste ?? `${testId}-paste`,
    submit: testIds.submit ?? `${testId}-submit`,
    busy: testIds.busy ?? `${testId}-busy`,
    problem: testIds.problem ?? `${testId}-problem`,
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey) &&
      !blank &&
      !disabled
    ) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      {fileLabel !== undefined && onFiles !== undefined && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <FileInputButton
            label={fileLabel}
            accept={accept ?? []}
            onFiles={onFiles}
            multiple={multiple}
            variant={fileVariant}
            size={size}
            disabled={disabled}
            testId={ids.pick}
            inputTestId={ids.input}
          />
          {fileHint !== undefined && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {fileHint}
            </Typography>
          )}
        </Box>
      )}
      <TextField
        multiline
        fullWidth
        minRows={pasteRows.min}
        // Without a cap a pasted file grows the box to its own length and pushes the rest away.
        maxRows={pasteRows.max}
        size={size}
        label={pasteLabel}
        value={pasteValue}
        disabled={disabled}
        onChange={(event) => onPasteChange(event.target.value)}
        onKeyDown={onKeyDown}
        helperText={pasteHelp}
        slotProps={{
          htmlInput: { "data-testid": ids.paste, dir: "ltr" },
          formHelperText: { id: helpId },
        }}
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Button
          size={size}
          variant={submitVariant}
          disabled={blank || disabled}
          onClick={onSubmit}
          data-testid={ids.submit}
        >
          {submitLabel}
        </Button>
        {busy !== undefined && busy !== null && busy !== false && (
          <LoadingSpinnerLine testId={ids.busy}>{busy}</LoadingSpinnerLine>
        )}
      </Box>
      {problem !== undefined && problem !== null && (
        <InlineAlert
          severity="error"
          detail={problem.detail}
          testId={ids.problem}
        >
          {problem.message}
        </InlineAlert>
      )}
    </Box>
  );
}

export default UploadPanel;
