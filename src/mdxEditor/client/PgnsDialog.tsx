import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ContentCutRoundedIcon from "@mui/icons-material/ContentCutRounded";
import WidgetsRoundedIcon from "@mui/icons-material/WidgetsRounded";

import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { FileInputButton, RadioGroupField, SliderField, TextInputField } from "../../design-system/components/forms";
import { pgnTextOf } from "./articleSources";
import { COLUMNS, ELLIPSIS, MAIN_COLUMN, SIDE_COLUMN, TEXTAREA_SX } from "./dialogLayout";
import { articlePgnsOf, IDENTIFIER, namesIn, pgnImportName, usesOf, type ArticlePgn } from "./pgnImports";
import { BIG_PGN_BYTES, GAMES_PER_PAGE, pgnBytesOf, pgnPagesOf, sizeOf } from "./pgnPages";
import { ItemHead, SectionDialog } from "./SectionDialog";

/** A PGN's file name — what the storage service takes. */
const PGN_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pgn$/;
const ID = "mdx-editor-pgns";

/** How the article holds a PGN: a file beside it, imported, or the text written into it. */
type PgnHolding = "file" | "inline";

/** A PGN the reader adds: how it is held, the name the article binds it to, its file's name and its text. */
export type PgnToAdd = { how: PgnHolding; name: string; fileName: string; text: string };

/** What a name may not be: not an identifier, or one the content binds already. */
const nameProblemOf = (name: string, taken: ReadonlySet<string>): string | undefined =>
  !IDENTIFIER.test(name) ? "A name is letters, digits, _ and $, not starting with a digit — what pgn={…} reads." : taken.has(name) ? `The content already binds ${name}.` : undefined;

/** A PGN's line in the list and its head: its file, or written in and its size — and how often the content reads it. */
const detailOf = (pgn: ArticlePgn, body: string) => {
  const uses = usesOf(body, pgn.name);
  return `${pgn.kind === "file" ? pgn.file : `inline, ${sizeOf(pgnBytesOf(pgn.text))}`} · ${uses === 0 ? "not used yet" : `used ${uses}×`}`;
};

type PgnsDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Whether the article has a file yet — a PGN file goes beside it, so for a new one the article is saved first. */
  hasFile: boolean;
  /** The article's folder under `articles/`, where a PGN file goes. */
  folder: string;
  /** The article's content — its PGNs, and the names it binds, which a new PGN may take none of. */
  body: string;
  /** Files written this session — a PGN file's text, read before the build's glob has caught up. */
  attached: Readonly<Record<string, string>>;
  /** Where the caret is — the PGN it sits in opens first. */
  caret: number;
  /** Open on Add a PGN, whatever the article has. */
  startOnAdd?: boolean;
  onAdd: (pgn: PgnToAdd) => void;
  /** Take a PGN out of the content (its file, if it has one, stays on disk) — asking first while it is read. */
  onRemove: (name: string) => void;
  /** Bind a PGN under another name — its definition and every `pgn={…}` that reads it. */
  onRename: (from: string, to: string) => void;
  /** Write an inline PGN's new text. */
  onUpdateText: (name: string, text: string) => void;
  /** Put the caret on a PGN's definition in the content. */
  onShow: (start: number, end: number) => void;
  /** Go on to Components, adding one with this PGN chosen. */
  onAddComponent: (name: string) => void;
  /** A PGN file is being written. */
  busy: boolean;
  /** What the last add came to — the list moves to it. */
  added?: { seq: number; name: string; message: string };
  /** Why the service would not write it. */
  error?: string;
  /** What the last action in the dialog came to. */
  message?: string;
};

/**
 * **PGNs** (CTA-137, CTA-139) — the article's PGNs and a new one, in one
 * dialog. A PGN is the article's data, apart from any component that shows
 * it (Components does that, one PGN as often as it likes):
 *
 * - **The article's PGNs** — read from the content (`articlePgnsOf`): each
 *   by its name, a file beside the article or written in, and how often the
 *   content reads it. Chosen, one is **renamed** (its definition and every
 *   `pgn={…}` reading it), its text **edited** when it is written in (up to
 *   100 KB; a file's is shown, read only), **shown in the content**,
 *   **removed** from it (a file stays on disk — nothing is ever deleted),
 *   or handed to Components.
 * - **Add a PGN** — uploaded or pasted (a big upload shown cut, a page of
 *   games at a time), named, held **as a file** beside the article
 *   (written by the storage service and imported; for an article with no
 *   folder yet the article is saved first) or **inline** (`export const
 *   <name> = \`…\`` in the content, up to 100 KB). Added, the list moves
 *   to it.
 */
function PgnsDialog(props: PgnsDialogProps) {
  const { open, onClose, body, caret, startOnAdd = false, busy, added, message } = props;
  const pgns = articlePgnsOf(body);
  const [selected, setSelected] = useState<string | null>(() =>
    startOnAdd ? null : ((pgns.find((pgn) => caret >= pgn.start && caret <= pgn.end) ?? pgns[0])?.name ?? null),
  );
  // A PGN added: the list moves to it.
  const [seenSeq, setSeenSeq] = useState(added?.seq);
  if (added !== undefined && added.seq !== seenSeq) {
    setSeenSeq(added.seq);
    setSelected(added.name);
  }
  // One removed (or not there yet): the first, else Add.
  const pgn = selected === null ? undefined : (pgns.find((candidate) => candidate.name === selected) ?? pgns[0]);

  return (
    <SectionDialog
      open={open}
      onClose={onClose}
      title="PGNs"
      listLabel="The article's PGNs"
      items={pgns.map((candidate) => {
        const detail = detailOf(candidate, body);
        return {
          id: candidate.name,
          // A long name or file cut short — the whole of it on hover.
          label: (
            <Box component="span" dir="ltr" sx={{ display: "block", minWidth: 0 }}>
              <Box component="code" title={candidate.name} sx={{ ...ELLIPSIS, fontWeight: 600 }}>
                {candidate.name}
              </Box>
              <Box component="span" title={detail} sx={{ ...ELLIPSIS, color: "text.secondary", typography: "body2" }}>
                {detail}
              </Box>
            </Box>
          ),
        };
      })}
      emptyWords="None yet."
      addLabel="Add a PGN"
      selected={pgn?.name ?? null}
      onSelect={setSelected}
      paneLabel={pgn === undefined ? "Add a PGN" : `The PGN ${pgn.name}`}
      message={message}
      busy={busy}
      testId={ID}
    >
      {pgn === undefined ? (
        <AddPgnPane {...props} />
      ) : (
        <PgnPane
          // A fresh form for each PGN, and for its text once written.
          key={`${pgn.name}:${pgn.kind === "inline" ? pgn.text : pgn.file}`}
          {...props}
          pgn={pgn}
          onRename={(from, to) => {
            props.onRename(from, to);
            setSelected(to);
          }}
        />
      )}
    </SectionDialog>
  );
}

/** One of the article's PGNs: its name, its text, and what can be done with it. */
function PgnPane({ pgn, body, folder, attached, onRemove, onRename, onUpdateText, onShow, onAddComponent, busy }: PgnsDialogProps & { pgn: ArticlePgn }) {
  const taken = namesIn(body);
  taken.delete(pgn.name);
  const [name, setName] = useState(pgn.name);
  const theName = name.trim();
  const nameProblem = theName === pgn.name ? undefined : nameProblemOf(theName, taken);
  const uses = usesOf(body, pgn.name);

  const [text, setText] = useState(pgn.kind === "inline" ? pgn.text : "");
  const bytes = useMemo(() => pgnBytesOf(text), [text]);
  const big = pgn.kind === "inline" && bytes > BIG_PGN_BYTES;

  // A file's text, read once — shown, read only; a big one in part.
  const [file, setFile] = useState<{ text?: string; pages?: { shown: string; games: number; all: number } }>();
  useEffect(() => {
    if (pgn.kind !== "file") return;
    let live = true;
    void pgnTextOf(pgn, folder, attached).then((read) => {
      if (!live) return;
      if (read === undefined || pgnBytesOf(read) <= BIG_PGN_BYTES) return setFile({ text: read });
      const paged = pgnPagesOf(read);
      setFile({ text: read, pages: { shown: paged.pages[0] ?? "", games: Math.min(GAMES_PER_PAGE, paged.games), all: paged.games } });
    });
    return () => {
      live = false;
    };
    // The file by its path — not the object, which is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pgn.kind === "file" ? pgn.file : undefined, folder, attached]);

  return (
    <>
      <ItemHead
        title={
          <Box component="code" dir="ltr">
            {pgn.name}
          </Box>
        }
        detail={<span dir="ltr">{detailOf(pgn, body)}</span>}
        onShow={() => onShow(pgn.start, pgn.end)}
        onRemove={() => onRemove(pgn.name)}
        extra={
          <Button size="small" startIcon={<WidgetsRoundedIcon />} onClick={() => onAddComponent(pgn.name)} data-testid={`${ID}-component`}>
            Add a component with it
          </Button>
        }
        busy={busy}
        testId={ID}
      />
      <Box sx={COLUMNS}>
        <Box sx={SIDE_COLUMN}>
          <TextInputField
            label="Name in the article"
            value={name}
            onChange={setName}
            dir="ltr"
            error={nameProblem !== undefined}
            helperText={nameProblem ?? `What a component reads: pgn={${theName === "" ? "…" : theName}}. Renamed, ${uses === 0 ? "its definition changes" : `its definition and the ${uses === 1 ? "one use" : `${uses} uses`} change with it`}.`}
            testId={`${ID}-name`}
          />
          <Box>
            <Button variant="outlined" onClick={() => onRename(pgn.name, theName)} disabled={theName === pgn.name || nameProblem !== undefined || busy} data-testid={`${ID}-rename`}>
              Rename
            </Button>
          </Box>
          {pgn.kind === "inline" ? (
            <>
              {big && (
                <InlineAlert severity="warning" title={`Over ${sizeOf(BIG_PGN_BYTES)}`} testId={`${ID}-too-big`}>
                  {`This text is ${sizeOf(bytes)}: a PGN this size goes in as a file beside the article, never written into the content. Add it as a file under Add a PGN, then remove this one.`}
                </InlineAlert>
              )}
              <Box>
                <Button variant="contained" onClick={() => onUpdateText(pgn.name, text)} disabled={text === pgn.text || text.trim() === "" || big || busy} data-testid={`${ID}-update`}>
                  Update the text
                </Button>
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {"A file beside the article: its text is shown, read only. Edit the file itself, or add a new PGN and remove this one."}
            </Typography>
          )}
        </Box>
        <Box sx={MAIN_COLUMN}>
          <Typography component="label" htmlFor={`${ID}-text`} variant="subtitle2">
            {pgn.kind === "inline" ? "PGN" : `PGN — ${pgn.file}, read only`}
          </Typography>
          {pgn.kind === "inline" ? (
            <Box
              component="textarea"
              id={`${ID}-text`}
              data-testid={`${ID}-text`}
              dir="ltr"
              spellCheck={false}
              value={text}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)}
              sx={TEXTAREA_SX}
            />
          ) : (
            <>
              <Box
                component="textarea"
                id={`${ID}-text`}
                data-testid={`${ID}-text`}
                dir="ltr"
                spellCheck={false}
                readOnly
                aria-busy={file === undefined || undefined}
                value={file === undefined ? "" : (file.pages?.shown ?? file.text ?? "")}
                placeholder={file === undefined ? "Reading…" : "The file is not there — nothing beside the article answers to it."}
                sx={TEXTAREA_SX}
              />
              {file?.pages !== undefined && file.text !== undefined && (
                <StatusText tone="neutral" testId={`${ID}-text-cut`}>
                  {`Cut here — showing ${file.pages.games.toLocaleString()} of ${file.pages.all.toLocaleString()} games (${sizeOf(pgnBytesOf(file.text))}).`}
                </StatusText>
              )}
            </>
          )}
        </Box>
      </Box>
    </>
  );
}

/** **Add a PGN** — uploaded or pasted, named, held as a file beside the article or written into it. */
function AddPgnPane({ hasFile, folder, body, onAdd, busy, error }: PgnsDialogProps) {
  const taken = namesIn(body);
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
  const nameProblem = nameProblemOf(theName, taken);
  const fileProblem = how === "file" && !PGN_FILE.test(theFile) ? "A file name is letters, digits, dots, dashes and underscores, then .pgn." : undefined;
  // An article with no folder yet is saved first, its PGN file then put beside it — the editor does both.
  const blocked = text.trim() === "" || nameProblem !== undefined || fileProblem !== undefined || busy;
  const path = `${folder === "" ? "" : `${folder}/`}${theFile}`;

  return (
    <>
      <Typography variant="subtitle1" component="h3" sx={{ flexShrink: 0, fontWeight: 600, px: 0.5 }}>
        Add a PGN
      </Typography>
      <Box sx={COLUMNS}>
        <Box sx={SIDE_COLUMN}>
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
            testId={`${ID}-new-name`}
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
          {error !== undefined && (
            <InlineAlert severity="error" title="The service would not write it" testId={`${ID}-error`}>
              {error}
            </InlineAlert>
          )}
        </Box>

        <Box sx={MAIN_COLUMN}>
          <Typography component="label" htmlFor={`${ID}-new-text`} variant="subtitle2">
            PGN
          </Typography>
          <Box
            component="textarea"
            id={`${ID}-new-text`}
            data-testid={`${ID}-new-text`}
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
                mt: -1,
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
    </>
  );
}

export default PgnsDialog;
