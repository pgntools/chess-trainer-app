import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ContentCutRoundedIcon from "@mui/icons-material/ContentCutRounded";
import WidgetsRoundedIcon from "@mui/icons-material/WidgetsRounded";

import { BaseDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { FileInputButton, RadioGroupField, SliderField, TextInputField } from "../../design-system/components/forms";
import { COLUMNS, ELLIPSIS, SIDE_COLUMN, TEXTAREA_SX } from "./dialogLayout";
import { articlePgnsOf, IDENTIFIER, namesIn, pgnImportName, usesOf } from "./pgnImports";
import { BIG_PGN_BYTES, GAMES_PER_PAGE, pgnBytesOf, pgnPagesOf, sizeOf } from "./pgnPages";

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
  /** Whether the article has a file yet — a PGN file goes beside it, so for a new one the article is saved first. */
  hasFile: boolean;
  /** The article's folder under `articles/`, where a PGN file goes. */
  folder: string;
  /** The article's content — its PGNs, and the names it binds, which a new PGN may take none of. */
  body: string;
  onAdd: (pgn: PgnToAdd) => void;
  /** Take a PGN out of the content (its file, if it has one, stays on disk). */
  onRemove: (name: string) => void;
  /** Go on to Add component with this PGN chosen. */
  onAddComponent: (name: string) => void;
  /** A PGN file is being written. */
  busy: boolean;
  /** What the last add came to; a new `seq` clears the form for the next. */
  added?: { seq: number; name: string; message: string };
  /** Why the service would not write it. */
  error?: string;
};

/**
 * **Add PGN** (CTA-137) — the article's PGNs, and a new one. A PGN is the
 * article's data, apart from any component that shows it (Add component
 * does that, one PGN as often as it likes):
 *
 * - **The article's PGNs** — read from the content (`articlePgnsOf`): each
 *   by its name, a file beside the article or written in, how often the
 *   content uses it, and a Remove that takes it out of the content (a file
 *   stays on disk — nothing is ever deleted).
 * - **Add a PGN** — uploaded or pasted (a big upload shown cut, a page of
 *   games at a time), named, held **as a file** beside the article
 *   (written by the storage service and imported; for an article with no
 *   folder yet the article is saved first) or **inline** (`export const
 *   <name> = \`…\`` in the content, up to 100 KB). Added, it offers Add
 *   component with it.
 */
function AddPgnDialog({ open, onClose, hasFile, folder, body, onAdd, onRemove, onAddComponent, busy, added, error }: AddPgnDialogProps) {
  const taken = namesIn(body);
  const pgns = articlePgnsOf(body);
  const [chosenHow, setHow] = useState<PgnHolding>(hasFile ? "file" : "inline");
  const [text, setText] = useState("");
  // A big PGN goes in only as a file: inline it would be compiled on every keystroke, and kept with the draft.
  const bytes = useMemo(() => pgnBytesOf(text), [text]);
  const big = bytes > BIG_PGN_BYTES;
  const how: PgnHolding = big ? "file" : chosenHow;
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  /** A big upload shown in part: its pages, and how many of them are shown. The whole file is still what is added. */
  const [cut, setCut] = useState<{ pages: string[]; games: number; shown: number }>();

  // A PGN added: the form cleared for the next.
  const [seenSeq, setSeenSeq] = useState(added?.seq);
  if (added !== undefined && added.seq !== seenSeq) {
    setSeenSeq(added.seq);
    setText("");
    setCut(undefined);
    setFileName("");
    setName("");
  }

  const upload = async (file: File) => {
    const uploaded = await file.text();
    setText(uploaded);
    // A big file: enough of it to see how it is written, not all of it in the box.
    const paged = pgnBytesOf(uploaded) > BIG_PGN_BYTES ? pgnPagesOf(uploaded) : undefined;
    setCut(paged !== undefined && paged.pages.length > 1 ? { ...paged, shown: 1 } : undefined);
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
  // An article with no folder yet is saved first, its PGN file then put beside it — the editor does both.
  const blocked = text.trim() === "" || nameProblem !== undefined || fileProblem !== undefined || busy;
  const path = `${folder === "" ? "" : `${folder}/`}${theFile}`;
  const justAdded = added !== undefined && pgns.some((pgn) => pgn.name === added.name) ? added : undefined;

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
      <Box sx={COLUMNS}>
        <Box sx={SIDE_COLUMN}>
          <Box>
            <Typography variant="subtitle2" component="h3" id={`${ID}-list-label`} sx={{ mb: 0.5 }}>
              The article's PGNs
            </Typography>
            {pgns.length === 0 ? (
              <StatusText tone="neutral" testId={`${ID}-list-none`}>
                None yet — add one below.
              </StatusText>
            ) : (
              <Box component="ul" aria-labelledby={`${ID}-list-label`} data-testid={`${ID}-list`} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
                {pgns.map((pgn) => {
                  const uses = usesOf(body, pgn.name);
                  const detail = `${pgn.kind === "file" ? pgn.file : `inline, ${sizeOf(pgnBytesOf(pgn.text))}`} · ${uses === 0 ? "not used yet" : `used ${uses}×`}`;
                  return (
                    <Box
                      component="li"
                      key={pgn.name}
                      data-testid={`${ID}-list-${pgn.name}`}
                      sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5, border: 1, borderColor: "divider", borderRadius: 1 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {/* A long name or file cut short — the whole of it on hover. */}
                        <Box component="code" dir="ltr" title={pgn.name} sx={{ ...ELLIPSIS, fontWeight: 600 }}>
                          {pgn.name}
                        </Box>
                        <Typography variant="body2" color="text.secondary" dir="ltr" title={detail} sx={ELLIPSIS}>
                          {detail}
                        </Typography>
                      </Box>
                      <Button size="small" startIcon={<WidgetsRoundedIcon />} onClick={() => onAddComponent(pgn.name)} sx={{ flexShrink: 0 }} data-testid={`${ID}-list-${pgn.name}-component`}>
                        Add component
                      </Button>
                      <Button size="small" color="error" onClick={() => onRemove(pgn.name)} disabled={busy} sx={{ flexShrink: 0 }} data-testid={`${ID}-list-${pgn.name}-remove`}>
                        Remove
                      </Button>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          <Typography variant="subtitle2" component="h3">
            Add a PGN
          </Typography>
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
              { value: "inline", label: `Inline — up to ${sizeOf(BIG_PGN_BYTES)}`, disabled: big },
            ]}
            value={how}
            onChange={setHow}
            help={
              big
                ? `This PGN is ${sizeOf(bytes)} — over ${sizeOf(BIG_PGN_BYTES)} it goes in as a file beside the article, never written into the content.`
                : how === "file"
                  ? "A .pgn beside the article, written now by the storage service and imported — best for a long game or a whole event."
                  : "Written into the content as export const — nothing to save but the article."
            }
            testId={`${ID}-how`}
          />
          {how === "file" && !hasFile && (
            <InlineAlert severity="info" title="The article has no folder yet" testId={`${ID}-no-folder`}>
              A file goes beside the article, so Add asks where to save the article first, then puts the PGN beside it and imports it.
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
              helperText={
                fileProblem ?? (
                  <Box component="span" dir="ltr" title={`src/views/blog/articles/${path}`} sx={ELLIPSIS}>
                    {`src/views/blog/articles/${path}`}
                  </Box>
                )
              }
              testId={`${ID}-file-name`}
            />
          )}
          <Box>
            <Button variant="contained" onClick={() => onAdd({ how, name: theName, fileName: theFile, text })} disabled={blocked} aria-busy={busy || undefined} data-testid={`${ID}-add`}>
              {how === "file" && !hasFile ? "Save the article, then add" : "Add to the article"}
            </Button>
          </Box>
          {justAdded !== undefined && (
            <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
              <StatusText tone="info" testId={`${ID}-added`}>
                {justAdded.message}
              </StatusText>
              <Button variant="outlined" size="small" startIcon={<WidgetsRoundedIcon />} onClick={() => onAddComponent(justAdded.name)} data-testid={`${ID}-added-component`}>
                {`Add a component with ${justAdded.name}`}
              </Button>
            </Box>
          )}
          {error !== undefined && (
            <InlineAlert severity="error" title="The service would not write it" testId={`${ID}-error`}>
              {error}
            </InlineAlert>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0, overflowY: { md: "auto" } }}>
          <Typography component="label" htmlFor={`${ID}-text`} variant="subtitle2">
            PGN
          </Typography>
          <Box
            component="textarea"
            id={`${ID}-text`}
            data-testid={`${ID}-text`}
            dir="ltr"
            spellCheck={false}
            // Cut, the box is a view of the file: read only, so what it shows never stands for what is added.
            readOnly={cut !== undefined}
            aria-describedby={cut === undefined ? undefined : `${ID}-cut-words`}
            value={cut === undefined ? text : cut.pages.slice(0, cut.shown).join("\n\n")}
            placeholder={'[Event "…"]\n\n1. e4 e5 …'}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)}
            sx={cut === undefined ? TEXTAREA_SX : { ...TEXTAREA_SX, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          />
          {cut !== undefined && (
            <Box
              data-testid={`${ID}-cut`}
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 2,
                mt: -0.5,
                px: 1.5,
                py: 1,
                border: 1,
                borderTop: "1px dashed",
                borderColor: "divider",
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "1 1 220px", minWidth: 0 }}>
                <ContentCutRoundedIcon fontSize="small" aria-hidden sx={{ color: "text.secondary" }} />
                <Typography variant="body2" id={`${ID}-cut-words`}>
                  {`Cut here — showing ${Math.min(cut.shown * GAMES_PER_PAGE, cut.games).toLocaleString()} of ${cut.games.toLocaleString()} games (${sizeOf(bytes)}). The whole file is what is added.`}
                </Typography>
              </Box>
              <Box sx={{ flex: "1 1 200px", minWidth: 160 }}>
                <SliderField
                  label="Pages shown"
                  value={cut.shown}
                  onChange={(shown) => setCut({ ...cut, shown })}
                  min={1}
                  max={cut.pages.length}
                  valueLabel={`${cut.shown} / ${cut.pages.length}`}
                  testId={`${ID}-pages`}
                />
              </Box>
              <Button size="small" onClick={() => setCut(undefined)} data-testid={`${ID}-show-all`}>
                Show all
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </BaseDialog>
  );
}

export default AddPgnDialog;
