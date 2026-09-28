import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

export type FileInputButtonProps = {
  label: ReactNode;
  /** The file types offered — `".pgn"`, or a list (`[".pgn", ".zip"]`). */
  accept: string | readonly string[];
  /** The files picked — never called with none. */
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  variant?: "contained" | "outlined";
  size?: "small" | "medium";
  /** The icon at the start; `null` for none. */
  startIcon?: ReactNode;
  disabled?: boolean;
  /** On the button; the hidden input is `<testId>-input`. */
  testId: string;
};

/**
 * **A button that picks a file** (CTA-108): a `label` button over a hidden
 * `<input type="file">` — the one technique, where the PGN inputs used two.
 * The input is emptied after each pick, so choosing the same file again
 * still reads it.
 */
function FileInputButton({
  label,
  accept,
  onFiles,
  multiple = false,
  variant = "contained",
  size = "medium",
  startIcon,
  disabled = false,
  testId,
}: FileInputButtonProps) {
  return (
    <Button
      component="label"
      variant={variant}
      size={size}
      disabled={disabled}
      startIcon={startIcon === undefined ? <UploadFileRoundedIcon /> : startIcon}
      data-testid={testId}
    >
      {label}
      <input
        hidden
        type="file"
        accept={typeof accept === "string" ? accept : accept.join(",")}
        multiple={multiple}
        disabled={disabled}
        data-testid={`${testId}-input`}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
    </Button>
  );
}

export default FileInputButton;
