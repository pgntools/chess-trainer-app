import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import { FormDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { FileInputButton, RadioGroupField, SelectField, TextInputField } from "../../design-system/components/forms";
import { ListScreenHeader } from "../../design-system/components/toolbars";
import { TreeView, type TreeNode } from "../../design-system/patterns/trees";
import { splitPgnGames } from "../../lib/pgn";
import { shippedCollections } from "../../lib/shippedCollections";
import { articleImageFiles, articleImportResolver, articlePgnFiles, folderOf } from "./articleSources";
import type { LibraryGame } from "./componentCatalog";
import {
  builtInsOf,
  GALLERY,
  galleryEntries,
  imageSnippetOf,
  libraryGameOf,
  misfitOf,
  SAMPLE_IMAGE,
  sampleOf,
  snippetOf,
  tournamentMisfitOf,
  type BuiltInExample,
  type GalleryEntry,
  type GallerySource,
} from "./componentGallery";
import { elementsIn } from "./componentSettings";
import { LIST_COLUMN, TEXTAREA_SX } from "./dialogLayout";
import { collectionGamesOf, collectionSummaryOf, FORMAT_WORDS, guessOf, libraryPgnOf } from "./libraryLookup";
import { SnippetPreview } from "./mdxPreview";
import { BIG_PGN_BYTES, pgnBytesOf, sizeOf } from "./pgnPages";
import SettingsForm from "./SettingsForm";
import { ARTICLES_DIR, listStorageFolders, STORAGE_COMMAND, writeStorageFile } from "./storageClient";
import type { TournamentGuess } from "./tournamentKind";

const ID = "mdx-component-gallery";
/** Nothing written this session: the gallery reads only what is on disk, and a picked image (`attached` of its own). */
const NOTHING_ATTACHED: Readonly<Record<string, string>> = {};
const IMAGE_TYPES = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
/** The PGNs and the images beside the Blog's articles — the build's, fixed while the page is open. */
const PGN_FILES = articlePgnFiles();
const IMAGES = articleImageFiles();
/** The Library's shipped collections — a built-in example for a component that reads the Library. */
const SHIPPED = shippedCollections.map(({ id, name }) => ({ id, name }));

/** Where a component reads its games from: a built-in example, a PGN file uploaded, one pasted, or the Library. */
type Choice = "builtin" | "upload" | "paste" | "library";

/** The source an entry reads, with how it was chosen — so the dialog opens on it again — and in words for the pane. */
type Applied = {
  source: GallerySource;
  words: string;
  /** `written`: the PGN went to that file, under `articles/`, rather than into the code. */
  origin:
    | { kind: "builtin"; id: string }
    | { kind: "upload"; name: string; text: string; written?: string }
    | { kind: "paste"; text: string; written?: string }
    | { kind: "library"; address: string };
  /** A file just written, by its path under `articles/` → its text — read before the build's glob has caught up. */
  attached?: Readonly<Record<string, string>>;
};

/** How the code holds an uploaded or pasted PGN — the PGNs section's rule: written in up to `BIG_PGN_BYTES`, a file beside the Blog's articles above it. */
type Holding = "inline" | "file";
const PGN_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pgn$/;
/** A file's name as a PGN file of the Blog's — letters, digits, dots, dashes and underscores, then `.pgn`. */
const pgnFileNameOf = (name: string): string => `${fileNameOf(name.replace(/\.pgn$/i, "")) || "games"}.pgn`;
/** A source's games, each its PGN — `undefined` where they cannot be read. */
const gamesOf = async (source: GallerySource, attached: Readonly<Record<string, string>>): Promise<readonly string[] | undefined> => {
  if (source.kind === "pasted") return splitPgnGames(source.text);
  if (source.kind === "library") return collectionGamesOf(source.game.collection);
  const resolver = articleImportResolver("", attached);
  const key = resolver.keyOf(`./${source.file}?raw`);
  return key === undefined ? undefined : splitPgnGames(await resolver.load(key));
};

/** A source, as one string — what the guess was worked out for. */
const keyOf = (source: GallerySource | undefined): string | undefined =>
  source === undefined
    ? undefined
    : source.kind === "file"
      ? `file:${source.file}`
      : source.kind === "pasted"
        ? `pasted:${source.text}`
        : `library:${source.game.collection}/${source.game.number ?? ""}`;

/** A picked file's name as an article would import it — letters, digits, dots, dashes and underscores. */
const fileNameOf = (name: string): string => name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "") || "image.png";

/** Where an import line's path is from — copied into an article, it reads from the article's own folder. */
const importNote = (path: string) =>
  `The import line reads ${path} from the Blog's root, src/views/blog/articles/. In an article, write the path from the article's own folder — ../ for each folder up — or put a copy of the file beside it.`;

/** An entry's own sample, as the source it opens on. */
const sampleApplied = (entry: GalleryEntry, builtIns: readonly BuiltInExample[]): Applied | undefined => {
  const first = builtIns[0];
  return first === undefined || sampleOf(entry) === undefined ? undefined : { source: first.source, words: `Built-in example — ${first.label}`, origin: { kind: "builtin", id: first.id } };
};

/**
 * **Add / update PGN** — where an entry reads its games from, chosen in a
 * dialog: a built-in example (the entry's own first, chosen until another
 * is), a PGN file uploaded or one pasted — held as the PGNs section
 * holds one: written into the code (`export const`) up to
 * `BIG_PGN_BYTES`, above it only as a file the storage service writes
 * into an existing folder of the Blog's (a new one would be a Blog folder),
 * never over another, and imported — or the Library by an address, looked up as Components' Add a component does. A source that
 * does not fit the component says so, and cannot be used.
 */
function SourceDialog({
  entry,
  builtIns,
  current,
  onClose,
  onApply,
}: {
  entry: GalleryEntry;
  builtIns: readonly BuiltInExample[];
  current: Applied | undefined;
  onClose: () => void;
  onApply: (applied: Applied) => void;
}) {
  const origin = current?.origin;
  const [choice, setChoice] = useState<Choice>(origin?.kind ?? "builtin");
  const [builtIn, setBuiltIn] = useState(origin?.kind === "builtin" ? origin.id : (builtIns[0]?.id ?? ""));
  const [uploaded, setUploaded] = useState<{ name: string; text: string } | undefined>(origin?.kind === "upload" ? { name: origin.name, text: origin.text } : undefined);
  const [reading, setReading] = useState<string>();
  const [pasted, setPasted] = useState(origin?.kind === "paste" ? origin.text : "");
  const [address, setAddress] = useState(origin?.kind === "library" ? origin.address : "");
  const [lookup, setLookup] = useState<{ looking: true } | { looking: false; problem: string }>();
  const [found, setFound] = useState<{ address: string; game: LibraryGame; label: string } | undefined>(
    origin?.kind === "library" && current !== undefined && current.source.kind === "library" ? { address: origin.address, game: current.source.game, label: current.words.replace(/^The Library — /, "") } : undefined,
  );

  /** The address looked up: a game's or a collection's, found — or the field says why not. */
  const lookUp = async () => {
    const game = libraryGameOf(address);
    if (game === undefined) {
      return setLookup({ looking: false, problem: "An address is a game's — /library/<collection>/<n> — or a collection's — /library/<collection>. Copy it from its page." });
    }
    setLookup({ looking: true });
    if (game.number !== undefined) {
      const pgn = await libraryPgnOf(game.collection, game.number);
      if (pgn === undefined) return setLookup({ looking: false, problem: `The Library has no game ${game.number} in the collection ${game.collection}.` });
      setLookup(undefined);
      return setFound({ address, game, label: `${pgn.name} — /library/${game.collection}/${game.number}` });
    }
    const summary = await collectionSummaryOf(game.collection);
    if (summary === undefined) return setLookup({ looking: false, problem: `The Library has no collection ${game.collection}.` });
    setLookup(undefined);
    const format = summary.tournament?.enabled === true ? `, ${FORMAT_WORDS[summary.tournament.type]}` : "";
    setFound({ address, game, label: `${summary.name} — ${summary.count.toLocaleString()} games${format}` });
  };

  const upload = async (file: File) => {
    setReading(file.name);
    const text = await file.text();
    setReading(undefined);
    setUploaded({ name: file.name, text });
    setFileName(pgnFileNameOf(file.name));
    setWriteProblem(undefined);
  };

  // An uploaded or pasted PGN: written into the code, or — over BIG_PGN_BYTES always — a file beside the Blog's articles.
  const written = origin?.kind === "upload" || origin?.kind === "paste" ? origin.written : undefined;
  const text = choice === "upload" ? (uploaded?.text ?? "") : choice === "paste" ? pasted : "";
  const bytes = useMemo(() => pgnBytesOf(text), [text]);
  const games = useMemo(() => (text.trim() === "" ? 0 : splitPgnGames(text).length), [text]);
  const big = bytes > BIG_PGN_BYTES;
  const [chosenHolding, setHolding] = useState<Holding>(written === undefined ? "inline" : "file");
  const holding: Holding = big ? "file" : chosenHolding;
  const sampleFolder = entry.sample !== undefined && "file" in entry.sample ? folderOf(entry.sample.file) : "";
  const [folder, setFolder] = useState(written === undefined ? sampleFolder : folderOf(written));
  const [fileName, setFileName] = useState(written?.split("/").at(-1) ?? (origin?.kind === "upload" ? pgnFileNameOf(origin.name) : "games.pgn"));
  const [folders, setFolders] = useState<{ kind: "folders"; paths: string[] } | { kind: "down" } | { kind: "refused"; message: string }>();
  const [writing, setWriting] = useState(false);
  const [writeProblem, setWriteProblem] = useState<string>();
  const wantsFolders = (choice === "upload" || choice === "paste") && holding === "file" && folders === undefined;
  useEffect(() => {
    if (!wantsFolders) return;
    let live = true;
    void listStorageFolders().then((listed) => {
      if (live) setFolders(listed.kind === "folders" ? { kind: "folders", paths: listed.folders.map((candidate) => candidate.path) } : listed);
    });
    return () => {
      live = false;
    };
  }, [wantsFolders]);
  const path = `${folder === "" ? "" : `${folder}/`}${fileName.trim()}`;
  const fileProblem = PGN_FILE.test(fileName.trim()) ? undefined : "A file name is letters, digits, dots, dashes and underscores, then .pgn.";
  const gameCount = `${games.toLocaleString()} game${games === 1 ? "" : "s"}`;

  // What the choice comes to — `undefined` while there is nothing to use yet.
  const example = builtIns.find((candidate) => candidate.id === builtIn);
  const draft: Applied | undefined =
    choice === "builtin"
      ? example === undefined
        ? undefined
        : { source: example.source, words: `Built-in example — ${example.label}`, origin: { kind: "builtin", id: example.id } }
      : choice === "upload" || choice === "paste"
        ? text.trim() === ""
          ? undefined
          : holding === "inline"
            ? {
                source: { kind: "pasted", text },
                words: choice === "upload" ? `Uploaded — ${uploaded?.name ?? ""}, ${gameCount}` : `Pasted — ${gameCount}`,
                origin: choice === "upload" ? { kind: "upload", name: uploaded?.name ?? "", text } : { kind: "paste", text },
              }
            : folders?.kind !== "folders" || fileProblem !== undefined
              ? undefined
              : {
                  source: { kind: "file", file: path },
                  words: `${choice === "upload" ? `Uploaded — ${uploaded?.name ?? ""}` : "Pasted"}, written to ${path} — ${gameCount}`,
                  origin: choice === "upload" ? { kind: "upload", name: uploaded?.name ?? "", text, written: path } : { kind: "paste", text, written: path },
                  attached: { [path]: text },
                }
        : found === undefined || found.address !== address
            ? undefined
            : { source: { kind: "library", game: found.game }, words: `The Library — ${found.label}`, origin: { kind: "library", address } };
  const misfit = draft === undefined ? undefined : misfitOf(entry, draft.source);
  const reads = entry.reads.includes("pgn") ? "PGN" : "game";

  return (
    <FormDialog
      open
      onClose={onClose}
      onSubmit={() => {
        // Enter in the address looks it up; the next one uses it.
        if (choice === "library" && draft === undefined) return void lookUp();
        if (draft === undefined || misfit !== undefined) return;
        // A file: written first — never over another — unless it is the one this PGN already went to.
        const toWrite = (choice === "upload" || choice === "paste") && holding === "file";
        if (!toWrite || (path === written && current?.attached?.[path] === text)) return onApply(draft);
        setWriting(true);
        setWriteProblem(undefined);
        void writeStorageFile(path, text).then((result) => {
          setWriting(false);
          if (result.kind === "written") return onApply(draft);
          setWriteProblem(
            result.kind === "exists"
              ? `${path} is there already — give the file another name.`
              : result.kind === "down"
                ? `The storage service is not answering — start the editor with ${STORAGE_COMMAND}.`
                : result.message,
          );
        });
      }}
      title={`Add / update ${reads} — <${entry.component}>`}
      submitLabel="Use it"
      cancelLabel="Cancel"
      submitDisabled={misfit !== undefined || (draft === undefined && !(choice === "library" && address.trim() !== ""))}
      busy={writing}
      width="sm"
      testId={`${ID}-source-dialog`}
    >
      <Box sx={{ display: "grid", gap: 2, "& > *": { minWidth: 0 } }}>
        <RadioGroupField<Choice>
          label="Where it reads from"
          options={[
            { value: "builtin", label: "A built-in example" },
            ...(entry.reads.includes("pgn")
              ? [
                  { value: "upload" as const, label: "Upload a PGN file" },
                  { value: "paste" as const, label: "Paste a PGN" },
                ]
              : []),
            { value: "library", label: "The Library — a game or a whole collection, by its address" },
          ]}
          value={choice}
          onChange={setChoice}
          size="small"
          testId={`${ID}-source`}
        />
        {choice === "builtin" && (
          <SelectField
            label="The example"
            value={builtIn}
            onChange={setBuiltIn}
            options={builtIns.map((candidate) => ({ value: candidate.id, label: candidate.label }))}
            optionDir="ltr"
            fullWidth
            helperText="Each one shipped with the app: a PGN beside the Blog's articles, or a Library collection."
            testId={`${ID}-builtin`}
          />
        )}
        {choice === "upload" && (
          <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
            <FileInputButton label="Choose a PGN file" accept=".pgn" onFiles={(files) => void upload(files[0])} variant="outlined" size="small" startIcon={<UploadFileRoundedIcon />} testId={`${ID}-upload`} />
            {reading !== undefined && (
              <Typography role="status" variant="body2" color="text.secondary">
                {`Reading ${reading}…`}
              </Typography>
            )}
            {uploaded !== undefined && reading === undefined && (
              <StatusText tone="info" testId={`${ID}-uploaded`}>
                {`${uploaded.name} — ${gameCount}, ${sizeOf(bytes)}.`}
              </StatusText>
            )}
          </Box>
        )}
        {choice === "paste" && (
          <TextInputField
            label="The PGN"
            value={pasted}
            onChange={setPasted}
            multiline
            dir="ltr"
            placeholder={'[Event "…"]\n\n1. e4 e5 2. Nf3 *'}
            testId={`${ID}-pasted`}
          />
        )}
        {(choice === "upload" || choice === "paste") && text.trim() !== "" && (
          <>
            <RadioGroupField<Holding>
              label="How the code holds it"
              options={[
                { value: "inline", label: `Inline — written into the code, up to ${sizeOf(BIG_PGN_BYTES)}`, disabled: big },
                { value: "file", label: "As a file beside the Blog's articles, imported" },
              ]}
              value={holding}
              onChange={setHolding}
              size="small"
              help={
                big
                  ? `This PGN is ${sizeOf(bytes)} — over ${sizeOf(BIG_PGN_BYTES)} it goes in as a file, never written into the code: compiled there on every change, it would hold the page up.`
                  : holding === "inline"
                    ? "Written into the code as it is (export const), so the article needs no file."
                    : "A .pgn written now by the storage service — never over another file — and imported."
              }
              testId={`${ID}-holding`}
            />
            {holding === "file" &&
              (folders === undefined ? (
                <Typography role="status" variant="body2" color="text.secondary">
                  Asking the storage service for the Blog's folders…
                </Typography>
              ) : folders.kind !== "folders" ? (
                <InlineAlert severity="error" title="No file can be written" testId={`${ID}-no-service`}>
                  {folders.kind === "down" ? `The storage service is not answering — start the editor with ${STORAGE_COMMAND}.` : folders.message}
                </InlineAlert>
              ) : (
                <>
                  <SelectField
                    label="The folder"
                    value={folder}
                    onChange={setFolder}
                    options={folders.paths.map((candidate) => ({ value: candidate, label: candidate === "" ? "The Blog's root" : candidate }))}
                    optionDir="ltr"
                    fullWidth
                    helperText="An existing folder under src/views/blog/articles/ — a new one would be a new Blog folder."
                    testId={`${ID}-folder`}
                  />
                  <TextInputField
                    label="The file name"
                    value={fileName}
                    onChange={(value) => {
                      setFileName(value);
                      setWriteProblem(undefined);
                    }}
                    dir="ltr"
                    error={fileProblem !== undefined || writeProblem !== undefined}
                    helperText={fileProblem ?? writeProblem ?? `Written to ${ARTICLES_DIR}/${path}.`}
                    testId={`${ID}-file-name`}
                  />
                </>
              ))}
          </>
        )}
        {choice === "library" && (
          <>
            <TextInputField
              label="The address"
              value={address}
              onChange={(value) => {
                setAddress(value);
                setLookup(undefined);
              }}
              placeholder="/library/<collection> or /library/<collection>/<n>"
              dir="ltr"
              error={lookup?.looking === false}
              helperText={lookup?.looking === false ? lookup.problem : "As the address bar shows it — a whole collection, /library/candidates2026, or one game of it, /library/candidates2026/12."}
              testId={`${ID}-address`}
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => void lookUp()}
                disabled={address.trim() === "" || lookup?.looking === true}
                aria-busy={lookup?.looking === true || undefined}
                data-testid={`${ID}-look-up`}
              >
                Look it up
              </Button>
              {found !== undefined && found.address === address && (
                <StatusText tone="info" testId={`${ID}-found`}>
                  {`Found ${found.label}.`}
                </StatusText>
              )}
            </Box>
          </>
        )}
        {misfit !== undefined && (
          <InlineAlert severity="warning" title="That does not fit" testId={`${ID}-misfit`}>
            {misfit}
          </InlineAlert>
        )}
      </Box>
    </FormDialog>
  );
}

/** `<ArticleImage>`'s source: an image beside the Blog's articles, or a file of the reader's — shown from this tab alone, never written. */
function ImagePicker({ onImage }: { onImage: (image: { snippet: string; attached: Readonly<Record<string, string>>; note: string } | undefined) => void }) {
  const [choice, setChoice] = useState<"blog" | "local">("blog");
  const [blogImage, setBlogImage] = useState(() => (IMAGES.includes(SAMPLE_IMAGE.file) ? SAMPLE_IMAGE.file : (IMAGES[0] ?? "")));
  const [local, setLocal] = useState<File>();
  const [localUrl, setLocalUrl] = useState<string>();
  useEffect(() => {
    if (local === undefined) return;
    const url = URL.createObjectURL(local);
    // A new file, a new preview: an object URL is made outside React and handed in once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [local]);

  const localName = local === undefined ? undefined : fileNameOf(local.name);
  useEffect(() => {
    if (choice === "blog") {
      onImage(
        blogImage === ""
          ? undefined
          : { snippet: imageSnippetOf(blogImage, blogImage === SAMPLE_IMAGE.file ? SAMPLE_IMAGE.alt : undefined), attached: NOTHING_ATTACHED, note: importNote(blogImage) },
      );
    } else {
      onImage(
        localName === undefined || localUrl === undefined
          ? undefined
          : {
              snippet: imageSnippetOf(localName),
              attached: { [localName]: localUrl },
              note: `${localName} is shown from this browser alone — the gallery writes it nowhere. Put the file beside the article, or point the import line at where it is.`,
            },
      );
    }
    // The parent's setter is stable; what it is told changes with the choice and the image.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, blogImage, localName, localUrl]);

  return (
    <Box sx={{ display: "grid", gap: 1.5, "& > *": { minWidth: 0 } }}>
      <RadioGroupField<"blog" | "local">
        label="The image"
        options={[
          { value: "blog", label: "An image beside the Blog's articles" },
          { value: "local", label: "A file of your own — previewed here, written nowhere" },
        ]}
        value={choice}
        onChange={setChoice}
        size="small"
        testId={`${ID}-image-source`}
      />
      {choice === "blog" &&
        (IMAGES.length === 0 ? (
          <StatusText tone="neutral" testId={`${ID}-no-images`}>
            No image is beside the Blog's articles yet — pick a file of your own.
          </StatusText>
        ) : (
          <SelectField label="The image file" value={blogImage} onChange={setBlogImage} options={IMAGES.map((path) => ({ value: path, label: path }))} optionDir="ltr" fullWidth testId={`${ID}-image-file`} />
        ))}
      {choice === "local" && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
          <FileInputButton label="Choose an image" accept={IMAGE_TYPES} onFiles={(files) => setLocal(files[0])} variant="outlined" size="small" startIcon={<AddPhotoAlternateOutlinedIcon />} testId={`${ID}-image-upload`} />
          {local !== undefined && (
            <Typography variant="body2" color="text.secondary" dir="ltr">
              {local.name}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

/**
 * **One entry, to try** — where it reads from, its code (editable, to
 * copy), its settings as a form over the code, and the component rendered
 * as an article renders it. The code is the one source: the form rewrites
 * it, typing in it re-reads the form and the preview.
 */
function EntryPane({ entry }: { entry: GalleryEntry }) {
  const builtIns = builtInsOf(entry, PGN_FILES, SHIPPED);
  // The entry's own sample until another source is chosen in Add / update PGN.
  const [applied, setApplied] = useState(() => sampleApplied(entry, builtIns));
  const [choosing, setChoosing] = useState(false);
  const source = applied?.source;
  const [image, setImage] = useState<{ snippet: string; attached: Readonly<Record<string, string>>; note: string }>();

  // What kind of tournament the games look like — a table's fit, and the Library's table's format.
  const key = keyOf(source);
  const [guessed, setGuessed] = useState<{ key: string; guess?: TournamentGuess }>();
  useEffect(() => {
    if (entry.tournament === undefined || source === undefined || key === undefined) return;
    let live = true;
    void gamesOf(source, applied?.attached ?? NOTHING_ATTACHED).then((games) => {
      if (live) setGuessed({ key, guess: games === undefined ? undefined : guessOf(games) });
    });
    return () => {
      live = false;
    };
    // The source by its key — the object is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.tournament, key]);
  const guess = guessed !== undefined && guessed.key === key ? guessed.guess : undefined;
  const otherKind = source === undefined ? undefined : tournamentMisfitOf(entry, source, guess);

  const reads = entry.reads.length > 0;
  const generated =
    entry.image === true ? image?.snippet : reads && source === undefined ? undefined : snippetOf(entry, source, guess?.kind);
  const note = entry.image === true ? image?.note : source?.kind === "file" ? importNote(source.file) : undefined;
  const attached = entry.image === true ? (image?.attached ?? NOTHING_ATTACHED) : (applied?.attached ?? NOTHING_ATTACHED);

  // The code, for the reader to adjust: written afresh whenever what it is written for changes.
  const [code, setCode] = useState(generated ?? "");
  const [seen, setSeen] = useState(generated);
  const [copied, setCopied] = useState<"copied" | "failed">();
  if (generated !== seen) {
    setSeen(generated);
    if (generated !== undefined) setCode(generated);
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
  // The component's own element in the code, for the form — past the PGN's or the image's definition.
  const [element] = elementsIn(code, entry.component);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, minHeight: 0, overflowY: { md: "auto" }, pe: { md: 1 } }} data-testid={`${ID}-entry`}>
      <Box>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
          <Box component="code" dir="ltr">{`<${entry.component}>`}</Box>
          {` — ${entry.label}`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {entry.summary}
        </Typography>
      </Box>
      {entry.mock !== undefined && (
        <InlineAlert severity="info" title="Not built yet" testId={`${ID}-mock`}>
          A sketch of a component to come, and the code it would take — nothing renders it, and an article that names it fails.
        </InlineAlert>
      )}

      {entry.image === true && <ImagePicker onImage={setImage} />}
      {reads && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ minWidth: 0, flex: "1 1 240px" }}>
            <Typography variant="subtitle2" component="h3">
              Where it reads from
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }} data-testid={`${ID}-reads`}>
              {applied?.words ?? "Nothing yet — add a PGN."}
            </Typography>
          </Box>
          <Button variant="outlined" size="small" startIcon={<EditNoteRoundedIcon />} onClick={() => setChoosing(true)} data-testid={`${ID}-choose-source`}>
            {entry.reads.includes("pgn") ? "Add / update PGN…" : "Add / update game…"}
          </Button>
        </Box>
      )}
      {choosing && (
        <SourceDialog
          entry={entry}
          builtIns={builtIns}
          current={applied}
          onClose={() => setChoosing(false)}
          onApply={(next) => {
            setApplied(next);
            setChoosing(false);
          }}
        />
      )}
      {!reads && entry.image !== true && (
        <Typography variant="body2" color="text.secondary">
          It reads no game: its code is all there is.
        </Typography>
      )}
      {otherKind !== undefined && (
        <InlineAlert severity="warning" title="Another kind of tournament?" testId={`${ID}-other-kind`}>
          {otherKind}
        </InlineAlert>
      )}

      {generated === undefined ? (
        <StatusText tone="neutral" testId={`${ID}-waiting`}>
          {entry.image === true ? "Pick an image: its code and the image show here." : "Add a PGN: its code and the component show here."}
        </StatusText>
      ) : (
        <>
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography component="label" htmlFor={`${ID}-code`} variant="subtitle2">
              The code
            </Typography>
            <Box
              component="textarea"
              id={`${ID}-code`}
              data-testid={`${ID}-code`}
              dir="ltr"
              spellCheck={false}
              value={code}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setCode(event.target.value)}
              sx={{ ...TEXTAREA_SX, flex: "none", minHeight: 72, height: 136 }}
            />
            {note !== undefined && (
              <Typography variant="caption" color="text.secondary" component="p" data-testid={`${ID}-note`}>
                {note}
              </Typography>
            )}
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <Button variant="contained" startIcon={<ContentCopyRoundedIcon />} onClick={() => void copy()} disabled={code.trim() === ""} data-testid={`${ID}-copy`}>
                Copy the code
              </Button>
              {copied !== undefined && (
                <StatusText tone={copied === "copied" ? "success" : "error"} testId={`${ID}-copied`}>
                  {copied === "copied" ? "Copied — paste it into an article." : "Could not copy — select the text instead."}
                </StatusText>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(240px, 320px) minmax(0, 1fr)" },
              alignItems: "start",
            }}
          >
            <Box sx={{ display: "grid", gap: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" component="h3">
                Settings
              </Typography>
              <SettingsForm
                code={element?.code ?? code}
                onCode={(next) => setCode(element === undefined ? next : `${code.slice(0, element.start)}${next}${code.slice(element.end)}`)}
                testId={`${ID}-settings`}
              />
            </Box>
            <Box sx={{ display: "grid", gap: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" component="h3" id={`${ID}-preview-label`}>
                {entry.mock === undefined ? "Preview" : "Preview — a sketch"}
              </Typography>
              <Box
                role="region"
                aria-labelledby={`${ID}-preview-label`}
                sx={{ minHeight: 240, minWidth: 0, overflowX: "auto", p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}
              >
                {entry.mock !== undefined ? (
                  <Box data-testid={`${ID}-sketch`} sx={{ display: "grid", gap: 1.5, maxWidth: 520 }}>
                    <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }}>
                      {`${entry.label} — how it would look`}
                    </Typography>
                    <Typography variant="body2">{entry.mock.sketch}</Typography>
                  </Box>
                ) : (
                  <SnippetPreview source={code} folder="" attached={attached} testId={`${ID}-preview`} />
                )}
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

/**
 * **The Components gallery** (CTA-140) — every component an article can
 * embed, to try before it goes into one: a tree of them by what they are
 * (`componentGallery.ts`), and the one picked opened on a shipped sample
 * that fits it — its source changed in Add / update PGN (a dialog: another
 * built-in example, a PGN uploaded or pasted, or the Library by an
 * address) — its settings as a form, its code
 * to copy, and the component rendered as an article renders it. It
 * overlaps Components' Add a component on purpose; unlike it, it edits no
 * article — the one thing it writes is a big PGN's file, asked for.
 */
function ComponentGallery() {
  const entries = galleryEntries();
  const [active, setActive] = useState(entries[0].id);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(GALLERY.map((folder) => folder.id)));
  const entry = entries.find((candidate) => candidate.id === active) ?? entries[0];
  const nodes: TreeNode[] = GALLERY.map((folder) => ({
    id: folder.id,
    label: folder.title,
    icon: <FolderRoundedIcon fontSize="small" />,
    secondary: folder.entries.length,
    children: folder.entries.map((candidate) => ({ id: candidate.id, label: `${candidate.label}${candidate.mock === undefined ? "" : " — not built"}` })),
  }));

  return (
    <Box data-testid={ID} sx={{ height: { md: "100%" }, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <ListScreenHeader title="Components gallery" count={`${new Set(entries.map((candidate) => candidate.component)).size} components`} testId={`${ID}-header`} />
      <Typography variant="body2" color="text.secondary">
        Every component an article can embed, on a sample that fits it: set it up, read its code, see it as an article shows it — then copy the code into an article. Nothing here is saved.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(220px, 300px) minmax(0, 1fr)" },
          gridTemplateRows: { md: "minmax(0, 1fr)" },
          flex: { md: 1 },
          minHeight: 0,
        }}
      >
        <Box sx={LIST_COLUMN}>
          <TreeView
            nodes={nodes}
            open={open}
            onToggle={(id) =>
              setOpen((before) => {
                const next = new Set(before);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            activeId={entry.id}
            onSelect={(node) => setActive(node.id)}
            ariaLabel="Components"
            hint="Arrow keys to move, right and left to open and close a folder, Enter to pick a component"
            testId={`${ID}-tree`}
          />
        </Box>
        {/* A fresh pane for each entry: its source, its code and its form start again. */}
        <EntryPane key={entry.id} entry={entry} />
      </Box>
    </Box>
  );
}

export default ComponentGallery;
