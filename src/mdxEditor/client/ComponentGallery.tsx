import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { FileInputButton, RadioGroupField, SelectField, TextInputField } from "../../design-system/components/forms";
import { ListScreenHeader } from "../../design-system/components/toolbars";
import { TreeView, type TreeNode } from "../../design-system/patterns/trees";
import { splitPgnGames } from "../../lib/pgn";
import { findShippedCollection } from "../../lib/shippedCollections";
import { articleImageFiles, articleImportResolver, articlePgnFiles } from "./articleSources";
import type { LibraryGame } from "./componentCatalog";
import {
  GALLERY,
  galleryEntries,
  imageSnippetOf,
  libraryGameOf,
  misfitOf,
  SAMPLE_IMAGE,
  sampleOf,
  snippetOf,
  tournamentMisfitOf,
  type GalleryEntry,
  type GallerySource,
} from "./componentGallery";
import { elementsIn } from "./componentSettings";
import { LIST_COLUMN, TEXTAREA_SX } from "./dialogLayout";
import { collectionGamesOf, collectionSummaryOf, FORMAT_WORDS, guessOf, libraryPgnOf } from "./libraryLookup";
import { SnippetPreview } from "./mdxPreview";
import SettingsForm from "./SettingsForm";
import type { TournamentGuess } from "./tournamentKind";

const ID = "mdx-component-gallery";
/** Nothing written this session: the gallery reads only what is on disk, and a picked image (`attached` of its own). */
const NOTHING_ATTACHED: Readonly<Record<string, string>> = {};
const IMAGE_TYPES = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
/** The PGNs and the images beside the Blog's articles — the build's, fixed while the page is open. */
const PGN_FILES = articlePgnFiles();
const IMAGES = articleImageFiles();

/** Where a component reads its games from: its shipped sample, a PGN beside the Blog's articles, one pasted, or the Library. */
type Choice = "sample" | "file" | "paste" | "library";

/** A source's games, each its PGN — `undefined` where they cannot be read. */
const gamesOf = async (source: GallerySource): Promise<readonly string[] | undefined> => {
  if (source.kind === "pasted") return splitPgnGames(source.text);
  if (source.kind === "library") return collectionGamesOf(source.game.collection);
  const resolver = articleImportResolver("");
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

/** A Library address's game or collection, in words — a shipped collection by its name. */
const libraryWords = (game: LibraryGame): string => {
  const name = findShippedCollection(game.collection)?.name ?? game.collection;
  return game.number === undefined ? `${name}, /library/${game.collection}` : `${name}, game ${game.number} — /library/${game.collection}/${game.number}`;
};

/** A picked file's name as an article would import it — letters, digits, dots, dashes and underscores. */
const fileNameOf = (name: string): string => name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "") || "image.png";

/** Where an import line's path is from — copied into an article, it reads from the article's own folder. */
const importNote = (path: string) =>
  `The import line reads ${path} from the Blog's root, src/views/blog/articles/. In an article, write the path from the article's own folder — ../ for each folder up — or put a copy of the file beside it.`;

/**
 * **Where an entry reads from** — its sample, or a source of the reader's:
 * a PGN beside the Blog's articles, one pasted (written into the snippet),
 * or the Library by an address, looked up as Components' Add a component
 * does. `onSource` is told what the choice comes to; `undefined` while
 * there is none yet.
 */
function SourcePicker({ entry, onSource }: { entry: GalleryEntry; onSource: (source: GallerySource | undefined) => void }) {
  const sample = sampleOf(entry);
  const [choice, setChoice] = useState<Choice>("sample");
  const [file, setFile] = useState(() => (sample?.kind === "file" ? sample.file : (PGN_FILES[0] ?? "")));
  const [pasted, setPasted] = useState("");
  const [address, setAddress] = useState("");
  const [lookup, setLookup] = useState<{ looking: true } | { looking: false; problem: string }>();
  const [found, setFound] = useState<{ game: LibraryGame; label: string }>();

  const source: GallerySource | undefined =
    choice === "sample"
      ? sample
      : choice === "file"
        ? file === ""
          ? undefined
          : { kind: "file", file }
        : choice === "paste"
          ? pasted.trim() === ""
            ? undefined
            : { kind: "pasted", text: pasted }
          : found === undefined
            ? undefined
            : { kind: "library", game: found.game };
  const key = keyOf(source);
  // Told once per source, not per render: the object is new on every one.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onSource(source), [key]);

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
      return setFound({ game, label: `${pgn.name} — /library/${game.collection}/${game.number}` });
    }
    const summary = await collectionSummaryOf(game.collection);
    if (summary === undefined) return setLookup({ looking: false, problem: `The Library has no collection ${game.collection}.` });
    setLookup(undefined);
    const format = summary.tournament?.enabled === true ? `, ${FORMAT_WORDS[summary.tournament.type]}` : "";
    setFound({ game, label: `${summary.name} — ${summary.count.toLocaleString()} games${format}` });
  };

  const sampleWords = sample === undefined ? "" : sample.kind === "file" ? sample.file : sample.kind === "library" ? libraryWords(sample.game) : "";
  return (
    <Box sx={{ display: "grid", gap: 1.5, "& > *": { minWidth: 0 } }}>
      <RadioGroupField<Choice>
        label="Where it reads from"
        options={[
          {
            value: "sample",
            label: (
              <span>
                {"The sample — "}
                <Box component="span" dir="ltr" sx={{ overflowWrap: "anywhere" }}>
                  {sampleWords}
                </Box>
              </span>
            ),
          },
          { value: "file", label: "A PGN beside the Blog's articles" },
          { value: "paste", label: "A PGN pasted here" },
          { value: "library", label: "The Library — a game or a whole collection, by its address" },
        ]}
        value={choice}
        onChange={setChoice}
        size="small"
        testId={`${ID}-source`}
      />
      {choice === "file" && (
        <SelectField label="The PGN file" value={file} onChange={setFile} options={PGN_FILES.map((path) => ({ value: path, label: path }))} optionDir="ltr" fullWidth testId={`${ID}-file`} />
      )}
      {choice === "paste" && (
        <TextInputField
          label="The PGN"
          value={pasted}
          onChange={setPasted}
          multiline
          dir="ltr"
          placeholder={'[Event "…"]\n\n1. e4 e5 2. Nf3 *'}
          helperText="Written into the code as it is (export const), so the article needs no file."
          testId={`${ID}-pasted`}
        />
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
              variant="contained"
              size="small"
              onClick={() => void lookUp()}
              disabled={address.trim() === "" || lookup?.looking === true}
              aria-busy={lookup?.looking === true || undefined}
              data-testid={`${ID}-look-up`}
            >
              Look it up
            </Button>
            {found !== undefined && (
              <StatusText tone="info" testId={`${ID}-found`}>
                {`Found ${found.label}.`}
              </StatusText>
            )}
          </Box>
        </>
      )}
    </Box>
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
  const [source, setSource] = useState<GallerySource | undefined>(() => sampleOf(entry));
  const [image, setImage] = useState<{ snippet: string; attached: Readonly<Record<string, string>>; note: string }>();
  const misfit = source === undefined ? undefined : misfitOf(entry, source);

  // What kind of tournament the games look like — a table's fit, and the Library's table's format.
  const key = keyOf(source);
  const [guessed, setGuessed] = useState<{ key: string; guess?: TournamentGuess }>();
  useEffect(() => {
    if (entry.tournament === undefined || source === undefined || key === undefined || misfit !== undefined) return;
    let live = true;
    void gamesOf(source).then((games) => {
      if (live) setGuessed({ key, guess: games === undefined ? undefined : guessOf(games) });
    });
    return () => {
      live = false;
    };
    // The source by its key — the object is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.tournament, key, misfit]);
  const guess = guessed !== undefined && guessed.key === key ? guessed.guess : undefined;
  const otherKind = source === undefined ? undefined : tournamentMisfitOf(entry, source, guess);

  const reads = entry.reads.length > 0;
  const generated =
    entry.image === true ? image?.snippet : reads && (source === undefined || misfit !== undefined) ? undefined : snippetOf(entry, source, guess?.kind);
  const note = entry.image === true ? image?.note : source?.kind === "file" ? importNote(source.file) : undefined;
  const attached = entry.image === true ? (image?.attached ?? NOTHING_ATTACHED) : NOTHING_ATTACHED;

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

      {entry.image === true ? <ImagePicker onImage={setImage} /> : reads ? <SourcePicker entry={entry} onSource={setSource} /> : null}
      {!reads && entry.image !== true && (
        <Typography variant="body2" color="text.secondary">
          It reads no game: its code is all there is.
        </Typography>
      )}
      {misfit !== undefined && (
        <InlineAlert severity="warning" title="That does not fit" testId={`${ID}-misfit`}>
          {misfit}
        </InlineAlert>
      )}
      {otherKind !== undefined && (
        <InlineAlert severity="warning" title="Another kind of tournament?" testId={`${ID}-other-kind`}>
          {otherKind}
        </InlineAlert>
      )}

      {generated === undefined ? (
        misfit === undefined && (
          <StatusText tone="neutral" testId={`${ID}-waiting`}>
            {entry.image === true ? "Pick an image: its code and the image show here." : "Pick where it reads from: its code and the component show here."}
          </StatusText>
        )
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
 * that fits it — switchable to a PGN beside the Blog's articles, one
 * pasted, or the Library by an address — its settings as a form, its code
 * to copy, and the component rendered as an article renders it. It
 * overlaps Components' Add a component on purpose; unlike it, it writes
 * nothing: no article, no storage-service call.
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
