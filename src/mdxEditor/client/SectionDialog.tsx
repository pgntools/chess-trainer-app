import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";

import { BaseDialog } from "../../design-system/components/dialogs";
import { StatusText } from "../../design-system/components/feedback";
import { PickerList } from "../../design-system/components/lists";
import { elementOf } from "./componentSettings";
import { COLUMNS, LIST_COLUMN, MAIN_COLUMN, PANE, SECTION, SIDE_COLUMN, TEXTAREA_SX } from "./dialogLayout";
import { SnippetPreview } from "./mdxPreview";
import SettingsForm from "./SettingsForm";

type SectionDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The dialog's title — the section's name: "PGNs". */
  title: string;
  /** The list's heading and accessible name — "The article's PGNs". */
  listLabel: string;
  /** The article's items, each its id and its words. */
  items: readonly { id: string; label: ReactNode }[];
  /** What the list says with no item — above its Add entry. */
  emptyWords: string;
  /** The list's last entry, which shows the add flow — "Add a PGN". */
  addLabel: string;
  /** The item chosen — `null` for the Add entry. */
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** The editor's accessible name — what it edits, or the add flow's. */
  paneLabel: string;
  /** The editor: the chosen item's, or the add flow. */
  children: ReactNode;
  /** What the last action in the dialog came to — beside Close. */
  message?: string;
  /** Something is being written: the dialog stays until it is. */
  busy?: boolean;
  /** The root of every test id — `<testId>-dialog`, `-list`, `-pane`, `-close`. */
  testId: string;
};

/**
 * **A section of the MDX editor** (CTA-139) — PGNs, Components, Images:
 * one dialog with the article's items of that kind listed at the inline
 * start (an Add entry last), and the chosen one's editor filling the rest —
 * edit it, remove it, show it in the content, or add a new one, without
 * leaving the dialog.
 */
export function SectionDialog({ open, onClose, title, listLabel, items, emptyWords, addLabel, selected, onSelect, paneLabel, children, message, busy = false, testId }: SectionDialogProps) {
  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      width="full"
      dividers
      testId={`${testId}-dialog`}
      actions={
        <>
          {message !== undefined && (
            <Box sx={{ flex: 1, minWidth: 0, px: 1 }}>
              <StatusText tone="info" testId={`${testId}-message`}>
                {message}
              </StatusText>
            </Box>
          )}
          <Button onClick={onClose} disabled={busy} data-testid={`${testId}-close`}>
            Close
          </Button>
        </>
      }
    >
      <Box sx={SECTION}>
        <Box sx={LIST_COLUMN}>
          <Typography variant="subtitle2" component="h3">
            {listLabel}
          </Typography>
          {items.length === 0 && (
            <StatusText tone="neutral" testId={`${testId}-list-empty`}>
              {emptyWords}
            </StatusText>
          )}
          <PickerList
            items={[...items, { id: null, label: addLabel, icon: <AddRoundedIcon fontSize="small" /> }]}
            value={selected}
            onChange={onSelect}
            ariaLabel={listLabel}
            testId={`${testId}-list`}
            noneTestId={`${testId}-list-add`}
          />
        </Box>
        <Box role="region" aria-label={paneLabel} sx={PANE} data-testid={`${testId}-pane`}>
          {children}
        </Box>
      </Box>
    </BaseDialog>
  );
}

type ItemHeadProps = {
  /** The item's name, as a heading. */
  title: ReactNode;
  /** A line under it — what it is, where, how often it is read. */
  detail?: ReactNode;
  /** Put the caret on it in the content and close the dialog. */
  onShow: () => void;
  /** Take it out of the content — the caller asks first. */
  onRemove: () => void;
  /** Buttons before Show in the content. */
  extra?: ReactNode;
  busy?: boolean;
  testId: string;
};

/** **An item's head** (CTA-139) — its name and a line about it, then what the section does with any item: show it in the content, remove it. */
export function ItemHead({ title, detail, onShow, onRemove, extra, busy = false, testId }: ItemHeadProps) {
  return (
    <Box sx={{ flexShrink: 0, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1, px: 0.5 }}>
      <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
          {title}
        </Typography>
        {detail !== undefined && (
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            {detail}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {extra}
        <Button size="small" startIcon={<ManageSearchRoundedIcon />} onClick={onShow} data-testid={`${testId}-show`}>
          Show in the content
        </Button>
        <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={onRemove} disabled={busy} data-testid={`${testId}-remove`}>
          Remove
        </Button>
      </Box>
    </Box>
  );
}

type ElementEditorProps = {
  /** The element's markup as the content has it. */
  code: string;
  /** Put the new markup in its place. */
  onApply: (code: string) => void;
  /** What the preview compiles ahead of the markup — the definitions it reads — and how many lines that is. */
  definitions: { source: string; lines: number };
  folder: string;
  attached: Readonly<Record<string, string>>;
  testId: string;
};

/**
 * **An element of the content, edited in place** (CTA-139) — the
 * Components and Images sections': its settings as a form beside its code
 * (`SettingsForm`, each rewriting the other), and under the code the
 * element as the article will render it. Apply puts the new markup in
 * place of the old.
 */
export function ElementEditor({ code: original, onApply, definitions, folder, attached, testId }: ElementEditorProps) {
  const [code, setCode] = useState(original);
  const changed = code !== original;
  return (
    <Box sx={COLUMNS}>
      <Box sx={SIDE_COLUMN}>
        <Typography variant="subtitle2" component="h4">
          Settings
        </Typography>
        <SettingsForm code={code} onCode={setCode} testId={`${testId}-settings`} />
      </Box>
      <Box sx={MAIN_COLUMN}>
        <Typography component="label" htmlFor={`${testId}-code`} variant="subtitle2">
          {`Code — <${elementOf(code)?.component ?? elementOf(original)?.component ?? "…"}>`}
        </Typography>
        <Box
          component="textarea"
          id={`${testId}-code`}
          data-testid={`${testId}-code`}
          dir="ltr"
          spellCheck={false}
          value={code}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setCode(event.target.value)}
          sx={{ ...TEXTAREA_SX, flex: "none", minHeight: 72, height: 96 }}
        />
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
          <Button variant="contained" onClick={() => onApply(code)} disabled={!changed || code.trim() === ""} data-testid={`${testId}-apply`}>
            Apply
          </Button>
          <Button onClick={() => setCode(original)} disabled={!changed} data-testid={`${testId}-revert`}>
            Undo the changes
          </Button>
        </Box>
        <Typography variant="subtitle2" component="h4" id={`${testId}-preview-label`}>
          Preview
        </Typography>
        <Box role="region" aria-labelledby={`${testId}-preview-label`} sx={{ flex: "1 0 240px", minHeight: 240, overflowY: "auto", p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}>
          <SnippetPreview source={`${definitions.source}${code}`} folder={folder} attached={attached} lineOffset={definitions.lines} testId={`${testId}-preview`} />
        </Box>
      </Box>
    </Box>
  );
}
