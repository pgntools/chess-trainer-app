import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

import { BaseDialog } from "../../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { FileInputButton, RadioGroupField, SelectField, TextInputField } from "../../../design-system/components/forms";
import { PickerList } from "../../../design-system/components/lists";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { COMPONENT_EXAMPLES } from "./componentCatalog";
import { IDENTIFIER, pgnImportName } from "./pgnImports";

/** A PGN's file name — what the storage service takes. */
const PGN_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pgn$/;
const ID = "mdx-editor-add-pgn";

/** Both tabs: a column of controls at the inline start, the text it is about filling the rest — one over the other below `md`. */
const COLUMNS = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(260px, 360px) minmax(0, 1fr)" },
  minHeight: { md: 440 },
} as const;

/** A box of machine text — a PGN, a component's markup — as the editor's own source box. */
const TEXTAREA_SX = {
  flex: 1,
  minHeight: 240,
  resize: "vertical",
  p: 1.5,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 13,
  lineHeight: 1.5,
  color: "text.primary",
  bgcolor: "background.paper",
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  "&:focus-visible": { outline: 2, outlineStyle: "solid", outlineColor: "primary.main", outlineOffset: 1 },
} as const;

/** How the article holds a PGN: a file beside it, imported, or the text written into it. */
type PgnHolding = "file" | "inline";

/** A PGN the reader adds: how it is held, the name the article binds it to, its file's name and its text. */
export type PgnToAdd = { how: PgnHolding; name: string; fileName: string; text: string };

type AddPgnDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Whether the article has a file yet — a PGN file goes beside it, so a new one takes a PGN only inline. */
  hasFile: boolean;
  /** The article's folder under `articles/`, where a PGN file goes. */
  folder: string;
  /** Every name the content binds, which a new PGN may not take. */
  taken: ReadonlySet<string>;
  /** The names the content binds to a PGN — what the examples can read. */
  pgnNames: readonly string[];
  onAdd: (pgn: PgnToAdd) => void;
  /** Put an example into the content. */
  onInsert: (code: string) => void;
  /** A PGN file is being written. */
  busy: boolean;
  /** What the last add came to; a new `seq` turns to the Output element tab with that PGN. */
  added?: { seq: number; name: string; message: string };
  /** Why the service would not write it. */
  error?: string;
};

/**
 * **Add PGN** (CTA-137) — the MDX editor's way to give an article a game
 * and show it, in two tabs.
 *
 * - **PGN file**: upload a `.pgn` or paste one, name it, and choose how the
 *   article holds it — **as a file** beside the article (written by the
 *   storage service, `import <name> from "./<file>.pgn?raw"`; an article
 *   with no file yet has no folder for it), or **inline** (`export const
 *   <name> = \`…\`` in the content — nothing to save but the article).
 * - **Output element**: the components an article embeds, in a sidebar at
 *   the inline start; the one picked shows its markup beside them, reading
 *   the PGN by its name, in a box to adjust, copy or insert at the caret.
 *   Adding a PGN turns here, with it chosen.
 *
 * The dialog is the window's width (`width="full"`); each tab two columns
 * from `md`, one over the other below it.
 */
function AddPgnDialog({ open, onClose, hasFile, folder, taken, pgnNames, onAdd, onInsert, busy, added, error }: AddPgnDialogProps) {
  const [tab, setTab] = useState<"pgn" | "output">("pgn");
  const [how, setHow] = useState<PgnHolding>(hasFile ? "file" : "inline");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [component, setComponent] = useState<string>();
  const [chosenPgn, setChosenPgn] = useState<string>();

  // A PGN added: the Output element tab, reading it, and the form cleared for the next.
  const [seenSeq, setSeenSeq] = useState(added?.seq);
  if (added !== undefined && added.seq !== seenSeq) {
    setSeenSeq(added.seq);
    setTab("output");
    setChosenPgn(added.name);
    setText("");
    setFileName("");
    setName("");
  }

  const upload = async (file: File) => {
    setText(await file.text());
    setFileName(file.name);
    setName(pgnImportName(file.name, taken));
  };

  const theName = name.trim() === "" ? pgnImportName("games.pgn", taken) : name.trim();
  const theFile = fileName.trim() === "" ? `${theName}.pgn` : fileName.trim();
  const nameProblem = !IDENTIFIER.test(theName)
    ? "A name is letters, digits, _ and $, not starting with a digit — what pgn={…} reads."
    : taken.has(theName)
      ? `The content already binds ${theName}.`
      : undefined;
  const fileProblem = how === "file" && !PGN_FILE.test(theFile) ? "A file name is letters, digits, dots, dashes and underscores, then .pgn." : undefined;
  const blocked = text.trim() === "" || nameProblem !== undefined || fileProblem !== undefined || (how === "file" && !hasFile) || busy;
  const path = `${folder === "" ? "" : `${folder}/`}${theFile}`;

  const names = [...new Set([...pgnNames, ...(added === undefined ? [] : [added.name])])];
  const pgn = chosenPgn !== undefined && names.includes(chosenPgn) ? chosenPgn : (names.at(-1) ?? "games");
  const example = COMPONENT_EXAMPLES.find((candidate) => candidate.name === component);
  const items = (usesPgn: boolean) =>
    COMPONENT_EXAMPLES.filter((candidate) => candidate.usesPgn === usesPgn).map((candidate) => ({
      id: candidate.name,
      label: (
        <>
          <Box component="span" dir="ltr" sx={{ fontFamily: "monospace" }}>{`<${candidate.name}>`}</Box>
          {` — ${candidate.summary}`}
        </>
      ),
    }));

  // The code on the right: the picked example, for the reader to adjust before copying or inserting it.
  const exampleCode = example?.code(pgn) ?? "";
  const [code, setCode] = useState(exampleCode);
  const [seenCode, setSeenCode] = useState(exampleCode);
  const [copied, setCopied] = useState<"copied" | "failed">();
  if (exampleCode !== seenCode) {
    setSeenCode(exampleCode);
    setCode(exampleCode);
    setCopied(undefined);
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Add PGN"
      width="full"
      dividers
      testId={`${ID}-dialog`}
      actions={
        <Button onClick={onClose} disabled={busy} data-testid={`${ID}-close`}>
          Close
        </Button>
      }
    >
      <PanelTabs
        tabs={[
          { id: "pgn", label: "PGN file" },
          { id: "output", label: "Output element" },
        ]}
        value={tab}
        onChange={(id) => setTab(id === "output" ? "output" : "pgn")}
        size="compact"
        fullWidth={false}
        ariaLabel="Add PGN"
        idPrefix={ID}
        testId={`${ID}-tabs`}
      />
      <Box {...tabPanelProps(ID, tab)} sx={{ ...COLUMNS, pt: 2 }}>
        {tab === "pgn" ? (
          <>
            <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
                <FileInputButton label="Upload PGN" accept=".pgn" onFiles={(files) => void upload(files[0])} variant="outlined" size="small" testId={`${ID}-upload`} />
                <Typography variant="body2" color="text.secondary">
                  or paste it into the box
                </Typography>
              </Box>
              <RadioGroupField
                label="How the article holds it"
                row
                options={[
                  { value: "file", label: "As a file" },
                  { value: "inline", label: "Inline" },
                ]}
                value={how}
                onChange={setHow}
                help={
                  how === "file"
                    ? "A .pgn beside the article, written now by the storage service and imported — best for a long game or a whole event."
                    : "Written into the content as export const — nothing to save but the article."
                }
                testId={`${ID}-how`}
              />
              {how === "file" && !hasFile && (
                <InlineAlert severity="info" title="The article has no folder yet" testId={`${ID}-no-folder`}>
                  A file goes beside the article: save the article first, or add the PGN inline.
                </InlineAlert>
              )}
              <TextInputField
                label="Name in the article"
                value={name}
                onChange={setName}
                placeholder={theName}
                dir="ltr"
                error={nameProblem !== undefined}
                helperText={nameProblem ?? `What a component reads: pgn={${theName}}.`}
                testId={`${ID}-name`}
              />
              {how === "file" && (
                <TextInputField
                  label="File name"
                  value={fileName}
                  onChange={setFileName}
                  placeholder={theFile}
                  dir="ltr"
                  error={fileProblem !== undefined}
                  helperText={fileProblem ?? <span dir="ltr">{`src/views/blog/articles/${path}`}</span>}
                  testId={`${ID}-file-name`}
                />
              )}
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
                <Button
                  variant="contained"
                  onClick={() => onAdd({ how, name: theName, fileName: theFile, text })}
                  disabled={blocked}
                  aria-busy={busy || undefined}
                  data-testid={`${ID}-add`}
                >
                  Add to the article
                </Button>
                {added !== undefined && (
                  <StatusText tone="info" testId={`${ID}-added`}>
                    {added.message}
                  </StatusText>
                )}
              </Box>
              {error !== undefined && (
                <InlineAlert severity="error" title="The service would not write it" testId={`${ID}-error`}>
                  {error}
                </InlineAlert>
              )}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
              <Typography component="label" htmlFor={`${ID}-text`} variant="subtitle2">
                PGN
              </Typography>
              <Box
                component="textarea"
                id={`${ID}-text`}
                data-testid={`${ID}-text`}
                dir="ltr"
                spellCheck={false}
                value={text}
                placeholder={'[Event "…"]\n\n1. e4 e5 …'}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)}
                sx={TEXTAREA_SX}
              />
            </Box>
          </>
        ) : (
          <>
            <Box
              data-testid={`${ID}-sidebar`}
              sx={{
                display: "grid",
                gap: 2,
                alignContent: "start",
                minHeight: 0,
                maxHeight: { xs: 320, md: "none" },
                overflowY: "auto",
                pe: { md: 2 },
                borderInlineEnd: { md: 1 },
                borderColor: { md: "divider" },
              }}
            >
              {names.length === 0 ? (
                <StatusText tone="neutral" testId={`${ID}-no-pgn`}>
                  The article has no PGN yet — add one in the PGN file tab. The examples read it as games.
                </StatusText>
              ) : (
                <SelectField
                  label="The PGN the examples read"
                  value={pgn}
                  onChange={setChosenPgn}
                  options={names.map((value) => ({ value, label: value }))}
                  optionDir="ltr"
                  testId={`${ID}-pgn`}
                />
              )}
              <Box>
                <Typography variant="subtitle2" component="p" sx={{ mb: 0.5 }}>
                  From the article's PGN
                </Typography>
                <PickerList items={items(true)} value={component} onChange={(id) => id !== null && setComponent(id)} ariaLabel="From the article's PGN" testId={`${ID}-pgn-components`} />
              </Box>
              <Box>
                <Typography variant="subtitle2" component="p" sx={{ mb: 0.5 }}>
                  From the app's data
                </Typography>
                <PickerList items={items(false)} value={component} onChange={(id) => id !== null && setComponent(id)} ariaLabel="From the app's data" testId={`${ID}-data-components`} />
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
              {added !== undefined && (
                <StatusText tone="info" testId={`${ID}-added-output`}>
                  {added.message}
                </StatusText>
              )}
              {example === undefined ? (
                <StatusText tone="neutral" testId={`${ID}-pick`}>
                  Pick a component on the left: its code shows here, to adjust, copy or insert into the content.
                </StatusText>
              ) : (
                <>
                  <Typography component="label" htmlFor={`${ID}-code`} variant="subtitle2">
                    {`Code — <${example.name}>`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {example.summary}
                  </Typography>
                  <Box
                    component="textarea"
                    id={`${ID}-code`}
                    data-testid={`${ID}-code`}
                    dir="ltr"
                    spellCheck={false}
                    value={code}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setCode(event.target.value)}
                    sx={TEXTAREA_SX}
                  />
                  <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
                    <Button variant="contained" onClick={() => onInsert(code)} disabled={code.trim() === ""} data-testid={`${ID}-insert`}>
                      Insert into the content
                    </Button>
                    <Button startIcon={<ContentCopyRoundedIcon />} onClick={() => void copy()} disabled={code.trim() === ""} data-testid={`${ID}-copy`}>
                      Copy the code
                    </Button>
                    {copied !== undefined && (
                      <StatusText tone={copied === "copied" ? "success" : "error"} testId={`${ID}-copied`}>
                        {copied === "copied" ? "Copied." : "Could not copy — select the text instead."}
                      </StatusText>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </>
        )}
      </Box>
    </BaseDialog>
  );
}

export default AddPgnDialog;
