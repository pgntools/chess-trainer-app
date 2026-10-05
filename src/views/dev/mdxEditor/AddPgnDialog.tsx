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
import { libraryGameReference, loadReferencedGames, resolveGameReference } from "../../../lib/gameReference";
import { libraryGamePathOf } from "../../home/frontPage/paths";
import { LIBRARY_EXAMPLES, PGN_EXAMPLES, type ComponentExample, type LibraryGame } from "./componentCatalog";
import { SnippetPreview } from "./mdxPreview";
import { IDENTIFIER, namesIn, pgnDefinitionsIn, pgnImportName } from "./pgnImports";

/** A PGN's file name — what the storage service takes. */
const PGN_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pgn$/;
const ID = "mdx-editor-add-pgn";

/** Where step 1's game comes from: a PGN of the article's own, or a game in the Library. */
type SourceKind = "pgn" | "library";

/** A game step 1 gave step 2: a PGN added to the article, by the name it binds, or a Library game, by its address. */
type Source = { kind: "pgn"; id: string; name: string } | { kind: "library"; id: string; game: LibraryGame; label: string };

/** Both tabs: a column of controls at the inline start, the text it is about filling the rest — one over the other below `md`. */
const COLUMNS = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(260px, 360px) minmax(0, 1fr)" },
  // From md the tabs fill the dialog's height, each column scrolling on its own; below it the page scrolls.
  gridTemplateRows: { md: "minmax(0, 1fr)" },
  height: { md: "max(440px, calc(100vh - 260px))" },
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
  /** The article's content — the names it binds, which a new PGN may take none of, and where the PGNs added here are defined. */
  body: string;
  /** PGNs written this session, by path under `articles/` — the preview reads them before the build's glob has caught up. */
  attached: Readonly<Record<string, string>>;
  onAdd: (pgn: PgnToAdd) => void;
  /** Put an example into the content. */
  onInsert: (code: string) => void;
  /** A PGN file is being written. */
  busy: boolean;
  /** What the last PGN add came to; a new `seq` turns to the Output element tab with that PGN. */
  added?: { seq: number; name: string; message: string };
  /** Why the service would not write it. */
  error?: string;
};

/**
 * **Add PGN** (CTA-137) — the MDX editor's way to give an article a game
 * and show it, in two steps: step 2 opens once step 1 has a game for it,
 * and shows only the games step 1 gave it in this dialog.
 *
 * - **1. PGN file** — the game, from one of two places:
 *   - **a PGN** — uploaded or pasted, named, and held **as a file** beside
 *     the article (written by the storage service, `import <name> from
 *     "./<file>.pgn?raw"`; an article with no file yet has no folder for
 *     it) or **inline** (`export const <name> = \`…\`` in the content —
 *     nothing to save but the article);
 *   - **a game in the Library** — its address, `/library/<collection>/<n>`,
 *     as its page shows it, looked up before step 2 opens on it.
 * - **2. Output element** — in a sidebar at the inline start, only the
 *   components that fit that game: a PGN's (`pgn={…}`), or a Library
 *   game's and its collection's. The one picked shows its markup in a box
 *   on top — to adjust, copy or insert at the caret — and, filling the
 *   rest, the component rendered as the article will render it (a PGN read
 *   through its definition in the content, `pgnDefinitionsIn`).
 *
 * The dialog is the window's width (`width="full"`); each tab two columns
 * from `md`, one over the other below it.
 */
function AddPgnDialog({ open, onClose, hasFile, folder, body, attached, onAdd, onInsert, busy, added, error }: AddPgnDialogProps) {
  const taken = namesIn(body);
  const [tab, setTab] = useState<"pgn" | "output">("pgn");
  const [kind, setKind] = useState<SourceKind>("pgn");
  const [how, setHow] = useState<PgnHolding>(hasFile ? "file" : "inline");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lookup, setLookup] = useState<{ looking: true } | { looking: false; problem: string }>();
  /** The Library game found last — its PGN shown beside the address. */
  const [found, setFound] = useState<{ address: string; label: string; pgn: string }>();
  const [component, setComponent] = useState<string>();
  /** The games step 1 gave step 2, in order — until there is one, step 2 is closed. */
  const [sources, setSources] = useState<Source[]>([]);
  const [chosen, setChosen] = useState<string>();

  const addSource = (source: Source) => {
    setSources((before) => [...before.filter((known) => known.id !== source.id), source]);
    setChosen(source.id);
    setTab("output");
  };

  // A PGN added: step 2, reading it, and the form cleared for the next.
  const [seenSeq, setSeenSeq] = useState(added?.seq);
  if (added !== undefined && added.seq !== seenSeq) {
    setSeenSeq(added.seq);
    addSource({ kind: "pgn", id: added.name, name: added.name });
    setText("");
    setFileName("");
    setName("");
  }

  const upload = async (file: File) => {
    setText(await file.text());
    setFileName(file.name);
    setName(pgnImportName(file.name, taken));
  };

  /** The address looked up in the Library: step 2 opens on the game, or step 1 says why not. */
  const lookUpLibraryGame = async () => {
    const path = libraryGamePathOf(address);
    if (path === undefined) return setLookup({ looking: false, problem: "A game's address is /library/<collection>/<n> — copy it from the game's page." });
    setLookup({ looking: true });
    const reference = libraryGameReference(path.collectionId, path.number);
    await loadReferencedGames(reference);
    const game = resolveGameReference(reference);
    if (game === undefined) return setLookup({ looking: false, problem: `The Library has no game ${path.number} in the collection ${path.collectionId}.` });
    setLookup(undefined);
    const id = `/library/${path.collectionId}/${path.number}`;
    setFound({ address: id, label: game.name, pgn: game.pgn });
    addSource({ kind: "library", id, game: { collection: path.collectionId, number: path.number }, label: game.name });
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

  // Step 2: the game it shows, and the components that fit it.
  const source = sources.find((candidate) => candidate.id === chosen) ?? sources.at(-1);
  const groups: { title: string; examples: readonly ComponentExample[] }[] =
    source === undefined
      ? []
      : source.kind === "pgn"
        ? [{ title: "From the PGN", examples: PGN_EXAMPLES }]
        : [
            { title: "This game", examples: LIBRARY_EXAMPLES.filter((candidate) => candidate.shows === "game") },
            { title: "Its collection", examples: LIBRARY_EXAMPLES.filter((candidate) => candidate.shows === "collection") },
          ];
  const example = groups.flatMap((group) => group.examples).find((candidate) => candidate.name === component);
  const itemsOf = (examples: readonly ComponentExample[]) =>
    examples.map((candidate) => ({
      id: candidate.name,
      label: (
        <>
          <Box component="span" dir="ltr" sx={{ fontFamily: "monospace" }}>{`<${candidate.name}>`}</Box>
          {` — ${candidate.summary}`}
        </>
      ),
    }));
  const exampleCode =
    example === undefined || source === undefined
      ? ""
      : example.takes === "pgn"
        ? source.kind === "pgn"
          ? example.code(source.name)
          : ""
        : source.kind === "library"
          ? example.code(source.game)
          : "";
  const sourceLabel = (candidate: Source) => (candidate.kind === "pgn" ? `${candidate.name} — the PGN added` : `${candidate.label} — ${candidate.id}`);

  // What the preview compiles: a PGN's definition in the content, then the code that reads it by name.
  const definitions = source?.kind === "pgn" ? pgnDefinitionsIn(body, [source.name]) : { source: "", lines: 0 };

  // The code on top: the picked example, for the reader to adjust before copying or inserting it.
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
          { id: "pgn", label: "1. PGN file" },
          // Step 2 opens once step 1 has a game for it.
          { id: "output", label: "2. Output element", disabled: sources.length === 0 },
        ]}
        value={tab}
        onChange={(id) => setTab(id === "output" && sources.length > 0 ? "output" : "pgn")}
        size="compact"
        fullWidth={false}
        ariaLabel="Add PGN"
        idPrefix={ID}
        testId={`${ID}-tabs`}
      />
      <Box {...tabPanelProps(ID, tab)} sx={{ ...COLUMNS, pt: 2 }}>
        {tab === "pgn" ? (
          <>
            <Box sx={{ display: "grid", gap: 2, alignContent: "start", minHeight: 0, overflowY: { md: "auto" } }}>
              <RadioGroupField
                label="Where the game comes from"
                options={[
                  { value: "pgn", label: "A PGN — upload or paste it" },
                  { value: "library", label: "A game in the Library — by its address" },
                ]}
                value={kind}
                onChange={setKind}
                testId={`${ID}-source`}
              />
              {kind === "pgn" ? (
                <>
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
                </>
              ) : (
                <>
                  <TextInputField
                    label="The game's address"
                    value={address}
                    onChange={(value) => {
                      setAddress(value);
                      setLookup(undefined);
                    }}
                    placeholder="/library/<collection>/<n>"
                    dir="ltr"
                    error={lookup?.looking === false}
                    helperText={lookup?.looking === false ? lookup.problem : "As the address bar shows it on the game's page — /library/ugmuub1nqfeoh2/4511."}
                    testId={`${ID}-address`}
                  />
                  <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
                    <Button
                      variant="contained"
                      onClick={() => void lookUpLibraryGame()}
                      disabled={address.trim() === "" || lookup?.looking === true}
                      aria-busy={lookup?.looking === true || undefined}
                      data-testid={`${ID}-use-game`}
                    >
                      Use this game
                    </Button>
                    {found !== undefined && (
                      <StatusText tone="info" testId={`${ID}-found`}>
                        {`Found ${found.label}.`}
                      </StatusText>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Nothing is added to the article: its components name the game by its address.
                  </Typography>
                </>
              )}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minHeight: 0 }}>
              {kind === "pgn" ? (
                <>
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
                </>
              ) : found === undefined ? (
                <StatusText tone="neutral" testId={`${ID}-game-pgn-none`}>
                  The game's PGN shows here once it is found.
                </StatusText>
              ) : (
                <>
                  <Typography component="label" htmlFor={`${ID}-game-pgn`} variant="subtitle2">
                    {`The game's PGN — ${found.address}`}
                  </Typography>
                  <Box component="textarea" id={`${ID}-game-pgn`} data-testid={`${ID}-game-pgn`} dir="ltr" readOnly value={found.pgn} sx={TEXTAREA_SX} />
                </>
              )}
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
              {source !== undefined &&
                (sources.length === 1 ? (
                  <StatusText tone="neutral" testId={`${ID}-showing`}>
                    <>
                      {"The examples show "}
                      <Box component="span" dir="ltr" sx={{ fontFamily: "monospace" }}>
                        {source.kind === "pgn" ? source.name : source.id}
                      </Box>
                      {source.kind === "pgn" ? " — the PGN just added." : ` — ${source.label}.`}
                    </>
                  </StatusText>
                ) : (
                  <SelectField
                    label="The game the examples show"
                    value={source.id}
                    onChange={setChosen}
                    options={sources.map((candidate) => ({ value: candidate.id, label: sourceLabel(candidate) }))}
                    optionDir="ltr"
                    testId={`${ID}-showing-select`}
                  />
                ))}
              {groups.map((group) => (
                <Box key={group.title}>
                  <Typography variant="subtitle2" component="p" sx={{ mb: 0.5 }}>
                    {group.title}
                  </Typography>
                  <PickerList
                    items={itemsOf(group.examples)}
                    value={component}
                    onChange={(id) => id !== null && setComponent(id)}
                    ariaLabel={group.title}
                    testId={`${ID}-components-${group.title.toLowerCase().replace(/\W+/g, "-")}`}
                  />
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0, overflowY: { md: "auto" } }}>
              {example === undefined || source === undefined ? (
                <StatusText tone="neutral" testId={`${ID}-pick`}>
                  Pick a component on the left: its code shows here, to adjust, copy or insert into the content, and the component under it.
                </StatusText>
              ) : (
                <>
                  <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1 }}>
                    <Typography component="label" htmlFor={`${ID}-code`} variant="subtitle2">
                      {`Code — <${example.name}>`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {example.summary}
                    </Typography>
                  </Box>
                  <Box
                    component="textarea"
                    id={`${ID}-code`}
                    data-testid={`${ID}-code`}
                    dir="ltr"
                    spellCheck={false}
                    value={code}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setCode(event.target.value)}
                    sx={{ ...TEXTAREA_SX, flex: "none", minHeight: 72, height: 112 }}
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
                  <Typography variant="subtitle2" component="h3" id={`${ID}-preview-label`}>
                    {`Preview — ${source.kind === "pgn" ? source.name : source.id}`}
                  </Typography>
                  <Box
                    role="region"
                    aria-labelledby={`${ID}-preview-label`}
                    sx={{ flex: 1, minHeight: 240, overflowY: "auto", p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}
                  >
                    <SnippetPreview source={`${definitions.source}${code}`} folder={folder} attached={attached} lineOffset={definitions.lines} testId={`${ID}-preview`} />
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
