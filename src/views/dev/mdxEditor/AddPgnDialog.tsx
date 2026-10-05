import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { BaseDialog } from "../../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { CopyField, FileInputButton, RadioGroupField, SelectField, TextInputField } from "../../../design-system/components/forms";
import { PickerList } from "../../../design-system/components/lists";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { COMPONENT_EXAMPLES } from "./componentCatalog";
import { IDENTIFIER, pgnImportName } from "./pgnImports";

/** A PGN's file name — what the storage service takes. */
const PGN_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pgn$/;
const ID = "mdx-editor-add-pgn";

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
 * - **Output element**: the components an article embeds; the one picked
 *   shows its markup, reading the PGN by its name, to copy or to insert at
 *   the caret. Adding a PGN turns here, with it chosen.
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

  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Add PGN"
      width="sm"
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
        fullWidth
        ariaLabel="Add PGN"
        idPrefix={ID}
        testId={`${ID}-tabs`}
      />
      <Box {...tabPanelProps(ID, tab)} sx={{ display: "grid", gap: 2, pt: 2 }}>
        {tab === "pgn" ? (
          <>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <FileInputButton label="Upload PGN" accept=".pgn" onFiles={(files) => void upload(files[0])} variant="outlined" size="small" testId={`${ID}-upload`} />
              <Typography variant="body2" color="text.secondary">
                or paste it below
              </Typography>
            </Box>
            <TextInputField label="PGN" value={text} onChange={setText} multiline dir="ltr" placeholder={'[Event "…"]\n\n1. e4 e5 …'} testId={`${ID}-text`} />
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
          </>
        ) : (
          <>
            {added !== undefined && (
              <StatusText tone="info" testId={`${ID}-added-output`}>
                {added.message}
              </StatusText>
            )}
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
              <PickerList
                items={items(false)}
                value={component}
                onChange={(id) => id !== null && setComponent(id)}
                ariaLabel="From the app's data"
                maxHeight={200}
                testId={`${ID}-data-components`}
              />
            </Box>
            {example !== undefined && (
              <>
                <CopyField
                  label={`<${example.name}>`}
                  value={example.code(pgn)}
                  copyLabel="Copy the code"
                  copiedLabel="Copied."
                  failedLabel="Could not copy — select the text instead."
                  testId={`${ID}-code`}
                />
                <Box>
                  <Button variant="contained" onClick={() => onInsert(example.code(pgn))} data-testid={`${ID}-insert`}>
                    Insert into the content
                  </Button>
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </BaseDialog>
  );
}

export default AddPgnDialog;
