import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import { BaseDialog } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { CopyField } from "../../../design-system/components/forms";

type SaveDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The theme's file name — `ocean.ts`. */
  fileName: string;
  /** Its source, from the generator. */
  source: string;
  /** The theme's id — the commands name it. */
  id: string;
  name: string;
  nameHe: string;
  /** Whether the theme is registered already (replace its file) or new (bootstrap it first). */
  registered: boolean;
  /** The theme opened had hand-written overrides, which the file cannot carry. */
  handOverrides: boolean;
  onDownload: () => void;
  onExportDraft: () => void;
};

/** A command, as the reader types it: monospace, left to right. */
function Command({ children }: { children: string }) {
  return (
    <Box component="code" dir="ltr" sx={{ display: "block", fontFamily: "fontFamilyMonospace", fontSize: "0.8rem", bgcolor: "background.sunken", borderRadius: 1, px: 1, py: 0.5, overflowX: "auto", whiteSpace: "pre" }}>
      {children}
    </Box>
  );
}

const quoted = (text: string) => `"${text.replaceAll('"', '\\"')}"`;

/**
 * **Saving the theme** (CTA-115) — no server: the theme leaves as its
 * source file (downloaded, or copied), identical to what
 * `yarn theme:bootstrap` writes, which the contributor puts into the repo by
 * hand; or as a draft file, to carry an unfinished theme to a later
 * session. Beside them, how to use the file.
 */
function SaveDialog({ open, onClose, fileName, source, id, name, nameHe, registered, handOverrides, onDownload, onExportDraft }: SaveDialogProps) {
  const path = `src/design-system/themes/${fileName}`;
  const bootstrap = `yarn theme:bootstrap --id ${id} --name ${quoted(name || id)}${nameHe === "" ? "" : ` --name-he ${quoted(nameHe)}`}`;
  return (
    <BaseDialog open={open} onClose={onClose} title="Save the theme" width="sm" dividers actions={<Button onClick={onClose}>Close</Button>} testId="theme-editor-save">
      <Box sx={{ display: "grid", gap: 3 }}>
        {handOverrides && (
          <InlineAlert severity="warning" testId="theme-editor-save-overrides">
            The theme you opened has hand-written MUI overrides. The file below cannot carry them — copy them over from the old file.
          </InlineAlert>
        )}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={onDownload} data-testid="theme-editor-save-download">
            Download {fileName}
          </Button>
          <Button variant="outlined" startIcon={<DataObjectRoundedIcon />} onClick={onExportDraft} data-testid="theme-editor-save-draft">
            Export draft (JSON)
          </Button>
        </Box>
        <CopyField
          label={fileName}
          value={source}
          copyLabel="Copy to clipboard"
          copiedLabel="Copied."
          failedLabel="Could not copy — select the text instead."
          maxRows={10}
          testId="theme-editor-save-source"
        />
        <Box component="section" aria-labelledby="theme-editor-save-howto" sx={{ display: "grid", gap: 1 }} data-testid="theme-editor-save-howto">
          <Typography id="theme-editor-save-howto" variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
            How to use this file
          </Typography>
          <Box component="ol" sx={{ m: 0, paddingInlineStart: 3, display: "grid", gap: 1 }}>
            {registered ? (
              <Typography component="li" variant="body2">
                The theme is registered: replace <code>{path}</code> with the download.
              </Typography>
            ) : (
              <Typography component="li" variant="body2">
                A new theme: register it first — it writes the file, the registry entry and both catalog names —
                <Command>{bootstrap}</Command>
                then replace <code>{path}</code> with the download. (Or register it by hand: docs/design/README.md, "Adding things".)
              </Typography>
            )}
            <Typography component="li" variant="body2">
              Run the contrast test, then the whole suite:
              <Command>{"npx vitest run src/design-system/themes/contrast.test.ts\nyarn test:run"}</Command>
            </Typography>
            <Typography component="li" variant="body2">
              Open a pull request — CONTRIBUTING.md, "Create a theme".
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            The editor writes nothing anywhere: the draft lives in this tab until you download it.
          </Typography>
        </Box>
      </Box>
    </BaseDialog>
  );
}

export default SaveDialog;
