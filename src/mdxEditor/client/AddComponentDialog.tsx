import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import { BaseDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { RadioGroupField, SelectField, SwitchField, TextInputField } from "../../design-system/components/forms";
import { TreeView, type TreeNode } from "../../design-system/patterns/trees";
import { libraryGameReference, loadReferencedGames, resolveGameReference } from "../../lib/gameReference";
import { loadUploadedCollections, loadUploadedGames } from "../../lib/libraryCollectionStore";
import type { CollectionSummary, TournamentFormat } from "../../lib/libraryCollections";
import { readPgnTags, splitPgnGames } from "../../lib/pgn";
import { findShippedCollection } from "../../lib/shippedCollections";
import { guessTournamentKind, type TournamentGuess } from "./tournamentKind";
import { collectionPathOf, libraryGamePathOf } from "../../views/home/frontPage/paths";
import { articleImportResolver } from "./articleSources";
import { CATALOG, catalogFor, componentOf, TOURNAMENT_ENTRY, type ExampleSource, type LibraryGame, type MovesLine } from "./componentCatalog";
import { elementOf, SETTINGS, valuesOf, writeElement, type SettingField } from "./componentSettings";
import { COLUMNS, ELLIPSIS, SIDE_COLUMN, TEXTAREA_SX } from "./dialogLayout";
import { SnippetPreview } from "./mdxPreview";
import { articlePgnsOf, pgnDefinitionsIn, type ArticlePgn } from "./pgnImports";
import { movesLineOf, pgnBytesOf, sizeOf } from "./pgnPages";

const ID = "mdx-editor-add-component";
/** The source choice that is a Library game rather than one of the article's PGNs. */
const LIBRARY = "library:";

/** A tournament format, for a sentence. */
const FORMAT_WORDS: Record<TournamentFormat, string> = { swiss: "a Swiss", roundRobin: "a round robin", knockout: "a knockout", arena: "an arena", match: "a match" };

/** A collection's summary — a shipped one's, or an upload's once the Library's list is read. */
const collectionSummaryOf = async (id: string): Promise<CollectionSummary | undefined> =>
  findShippedCollection(id) ?? (await loadUploadedCollections()).find((candidate) => candidate.id === id);

/** A Library game's PGN, read — `undefined` for no such game. */
const libraryPgnOf = async (collection: string, number: number): Promise<{ name: string; pgn: string } | undefined> => {
  const reference = libraryGameReference(collection, number);
  await loadReferencedGames(reference);
  return resolveGameReference(reference);
};

/** A Library collection's games, each its PGN — a shipped one's or an upload's; `undefined` where it cannot be read. */
const collectionGamesOf = async (collection: string): Promise<readonly string[] | undefined> => {
  try {
    const shipped = findShippedCollection(collection);
    return (shipped === undefined ? await loadUploadedGames(collection) : await shipped.loadGames()) ?? undefined;
  } catch {
    return undefined;
  }
};

/** The kind of tournament a set of games looks like — from their tags alone. */
const guessOf = (games: readonly string[]): TournamentGuess | undefined => guessTournamentKind(games.map(readPgnTags));

/** A game's first moves, for a sentence — or a short opening where it gave none. */
const movesOf = (source: { moves?: MovesLine }) => source.moves?.line ?? "1. e4 e5 2. Nf3 Nc6";

type AddComponentDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The article's folder under `articles/` — where its imports resolve from. */
  folder: string;
  /** The article's content — its PGNs, what a component can show. */
  body: string;
  /** PGNs written this session, by path under `articles/` — read before the build's glob has caught up. */
  attached: Readonly<Record<string, string>>;
  /** The PGN chosen on arrival — from Add PGN's "Add component". */
  initialPgn?: string;
  /** Put the code into the content. */
  onInsert: (code: string) => void;
  /** Go to Add PGN — for an article with no PGN yet. */
  onAddPgn: () => void;
};

/** A PGN's text — written in, or read from its file beside the article. */
const textOf = async (pgn: ArticlePgn, folder: string, attached: Readonly<Record<string, string>>): Promise<string | undefined> => {
  if (pgn.kind === "inline") return pgn.text;
  const resolver = articleImportResolver(folder, attached);
  const key = resolver.keyOf(`${pgn.file}?raw`);
  return key === undefined ? undefined : resolver.load(key);
};

/**
 * **The component's settings, as a form** — read from the code and written
 * back to it (`componentSettings.ts`), so the code stays the one source: a
 * change here rewrites it, and the code typed by hand shows here.
 */
function SettingsForm({ code, onCode }: { code: string; onCode: (code: string) => void }) {
  const element = elementOf(code);
  const fields = element === undefined ? undefined : SETTINGS[element.component];
  if (element === undefined) {
    return (
      <StatusText tone="neutral" testId={`${ID}-settings-none`}>
        The code is not one component the form can read — several of them, or one half typed. Its settings show here again once it is.
      </StatusText>
    );
  }
  if (fields === undefined || fields.length === 0) {
    return (
      <StatusText tone="neutral" testId={`${ID}-settings-none`}>
        {`<${element.component}> has no settings to set here — its code is all there is.`}
      </StatusText>
    );
  }
  const values = valuesOf(element.attributes, fields);
  const set = (prop: string, value: string | boolean) => onCode(writeElement(element.component, element.attributes, fields, { ...values, [prop]: value }));
  const fieldOf = (field: SettingField) => {
    const testId = `${ID}-setting-${field.prop}`;
    const value = values[field.prop];
    if (field.kind === "switch") {
      return (
        <Box key={field.prop}>
          <SwitchField label={field.label} checked={typeof value === "boolean" ? value : field.on} onChange={(checked) => set(field.prop, checked)} size="small" testId={testId} />
          {field.help !== undefined && (
            <Typography variant="caption" color="text.secondary" component="p">
              {field.help}
            </Typography>
          )}
        </Box>
      );
    }
    if (field.kind === "choice") {
      return (
        <SelectField
          key={field.prop}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(chosen) => set(field.prop, chosen)}
          options={field.options}
          emptyOption={field.none}
          helperText={field.help}
          testId={testId}
        />
      );
    }
    return (
      <TextInputField
        key={field.prop}
        label={field.label}
        value={typeof value === "string" ? value : ""}
        onChange={(typed) => set(field.prop, typed)}
        type={field.kind === "number" ? "number" : "text"}
        placeholder={field.placeholder}
        dir="ltr"
        helperText={field.help}
        testId={testId}
      />
    );
  };
  return (
    <Box data-testid={`${ID}-settings`} sx={{ display: "grid", gap: 1.5 }}>
      {fields.map(fieldOf)}
    </Box>
  );
}

/**
 * **Add component** (CTA-137) — a component that shows a game, put into
 * the content, in the order it is chosen:
 *
 * 1. **The game** — one of the article's PGNs (Add PGN's; one PGN can feed
 *    as many components as the article likes), or the Library by an
 *    address — a whole collection's, `/library/<collection>` (a
 *    tournament's tables, its card, its games), or one game's,
 *    `/library/<collection>/<n>` — looked up.
 * 2. **The component** — a tree of folders by what the game is (a single
 *    game, a player's, a set, a repertoire, a tournament, a position, a
 *    puzzle), holding only the components that fit that game
 *    (`componentCatalog.ts`).
 *
 * The one picked shows its markup in a box on top — to adjust, copy or
 * insert at the caret — and under it, side by side, its **Settings** (a
 * form over its props, so nobody needs to know them: `componentSettings.ts`)
 * and the component rendered as the article will render it.
 */
function AddComponentDialog({ open, onClose, folder, body, attached, initialPgn, onInsert, onAddPgn }: AddComponentDialogProps) {
  const pgns = articlePgnsOf(body);
  const [choice, setChoice] = useState<string | undefined>(initialPgn !== undefined && pgns.some((pgn) => pgn.name === initialPgn) ? initialPgn : undefined);
  const [address, setAddress] = useState("");
  const [lookup, setLookup] = useState<{ looking: true } | { looking: false; problem: string }>();
  /** The Library game found — the source while the choice is the Library. */
  const [found, setFound] = useState<{ id: string; game: LibraryGame; label: string; moves?: MovesLine }>();
  /** The chosen PGN's first moves, read once it is chosen — the Position and Puzzle examples'. */
  const [moves, setMoves] = useState<{ name: string; moves?: MovesLine }>();
  const [component, setComponent] = useState<string>();
  const [openFolders, setOpenFolders] = useState<ReadonlySet<string>>(() => new Set(CATALOG.map((folder) => folder.id)));
  /** What kind of tournament the chosen game's file (or collection) looks like — for the source it was worked out for. */
  const [guessed, setGuessed] = useState<{ source: string; guess?: TournamentGuess }>();

  const chosenPgn = pgns.find((pgn) => pgn.name === choice);
  useEffect(() => {
    if (chosenPgn === undefined) return;
    let live = true;
    void textOf(chosenPgn, folder, attached).then((text) => {
      if (!live) return;
      setMoves({ name: chosenPgn.name, moves: text === undefined ? undefined : movesLineOf(text) });
      setGuessed({ source: chosenPgn.name, guess: text === undefined ? undefined : guessOf(splitPgnGames(text)) });
    });
    return () => {
      live = false;
    };
    // The PGN by its name and where it lives — not the object, which is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenPgn?.name, chosenPgn?.kind === "file" ? chosenPgn.file : undefined, folder, attached]);

  /**
   * The address looked up in the Library — a game's, or a whole
   * collection's — and what it names becomes the source; or the field says
   * why not.
   */
  const lookUpLibrary = async () => {
    const gamePath = libraryGamePathOf(address);
    const collection = gamePath?.collectionId ?? collectionPathOf(address);
    if (collection === undefined) {
      return setLookup({ looking: false, problem: "An address is a game's — /library/<collection>/<n> — or a collection's — /library/<collection>. Copy it from its page." });
    }
    setLookup({ looking: true });
    if (gamePath !== undefined) {
      const game = await libraryPgnOf(collection, gamePath.number);
      if (game === undefined) return setLookup({ looking: false, problem: `The Library has no game ${gamePath.number} in the collection ${collection}.` });
      setLookup(undefined);
      const id = `/library/${collection}/${gamePath.number}`;
      setFound({ id, game: { collection, number: gamePath.number }, label: game.name, moves: movesLineOf(game.pgn) });
      // The tournament tables show the game's collection: guess from all of it.
      const games = await collectionGamesOf(collection);
      return setGuessed({ source: id, guess: games === undefined ? undefined : guessOf(games) });
    }
    const summary = await collectionSummaryOf(collection);
    if (summary === undefined) return setLookup({ looking: false, problem: `The Library has no collection ${collection}.` });
    // Its first game's opening — what the Position and Puzzle examples start from.
    const first = await libraryPgnOf(collection, 1);
    setLookup(undefined);
    const format = summary.tournament?.enabled === true ? `, ${FORMAT_WORDS[summary.tournament.type]}` : "";
    setFound({
      id: `/library/${collection}`,
      game: { collection },
      label: `${summary.name} — ${summary.count.toLocaleString()} games${format}`,
      moves: first === undefined ? undefined : movesLineOf(first.pgn),
    });
    const games = await collectionGamesOf(collection);
    setGuessed({ source: `/library/${collection}`, guess: games === undefined ? undefined : guessOf(games) });
  };

  const source: ExampleSource | undefined =
    choice === LIBRARY
      ? found === undefined
        ? undefined
        : { kind: "library", game: found.game, moves: found.moves }
      : chosenPgn === undefined
        ? undefined
        : { kind: "pgn", name: chosenPgn.name, moves: moves?.name === chosenPgn.name ? moves.moves : undefined };
  const sourceName = choice === LIBRARY ? found?.id : chosenPgn?.name;

  const folders = source === undefined ? [] : catalogFor(source);
  const entries = folders.flatMap((folder) => folder.entries);
  const entry = entries.find((candidate) => candidate.id === component);
  // The tournament table the games look like they want — a suggestion, the reader's to take.
  const guess = guessed !== undefined && guessed.source === sourceName ? guessed.guess : undefined;
  const suggested = guess === undefined ? undefined : entries.find((candidate) => candidate.id === TOURNAMENT_ENTRY[guess.kind]);
  const nodes: TreeNode[] = folders.map((folder) => ({
    id: folder.id,
    label: folder.title,
    icon: <FolderRoundedIcon fontSize="small" />,
    secondary: folder.entries.length,
    children: folder.entries.map((candidate) => ({
      id: candidate.id,
      label: `${candidate.label}${candidate.mock === true ? " — mock" : ""}${candidate.id === suggested?.id ? " — suggested" : ""}`,
    })),
  }));
  const exampleCode = entry === undefined || source === undefined ? "" : (entry.code(source) ?? "");

  // What the preview compiles: the chosen PGN's definition in the content, then the code that reads it by name.
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
      onClose={onClose}
      title="Add component"
      width="full"
      dividers
      testId={`${ID}-dialog`}
      actions={
        <Button onClick={onClose} data-testid={`${ID}-close`}>
          Close
        </Button>
      }
    >
      <Box sx={COLUMNS}>
        <Box sx={{ ...SIDE_COLUMN, pe: { md: 2 }, borderInlineEnd: { md: 1 }, borderColor: { md: "divider" } }} data-testid={`${ID}-sidebar`}>
          <Typography variant="subtitle2" component="h3">
            1. The game
          </Typography>
          {pgns.length === 0 && (
            <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
              <StatusText tone="neutral" testId={`${ID}-no-pgn`}>
                The article has no PGN yet — add one, or show a game from the Library.
              </StatusText>
              <Button size="small" variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={onAddPgn} data-testid={`${ID}-add-pgn`}>
                Add PGN…
              </Button>
            </Box>
          )}
          <RadioGroupField
            label="Where it comes from"
            options={[
              ...pgns.map((pgn) => ({
                value: pgn.name,
                // A long name or file cut short — the whole of it on hover.
                label: (
                  <Box
                    component="span"
                    dir="ltr"
                    title={`${pgn.name} — ${pgn.kind === "file" ? pgn.file : `inline, ${sizeOf(pgnBytesOf(pgn.text))}`}`}
                    sx={{ ...ELLIPSIS, maxWidth: { xs: "calc(100vw - 140px)", md: 300 } }}
                  >
                    <code>{pgn.name}</code>
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      {` — ${pgn.kind === "file" ? pgn.file : `inline, ${sizeOf(pgnBytesOf(pgn.text))}`}`}
                    </Box>
                  </Box>
                ),
              })),
              { value: LIBRARY, label: "The Library — a game or a whole collection, by its address" },
            ]}
            value={choice ?? ""}
            onChange={(value) => {
              setChoice(value);
              setComponent(undefined);
            }}
            testId={`${ID}-source`}
          />
          {choice === LIBRARY && (
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
                helperText={
                  lookup?.looking === false
                    ? lookup.problem
                    : "As the address bar shows it — a whole collection, /library/candidates2026, or one game of it, /library/candidates2026/12."
                }
                testId={`${ID}-address`}
              />
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => void lookUpLibrary()}
                  disabled={address.trim() === "" || lookup?.looking === true}
                  aria-busy={lookup?.looking === true || undefined}
                  data-testid={`${ID}-use-game`}
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

          <Typography variant="subtitle2" component="h3">
            2. The component
          </Typography>
          {source === undefined ? (
            <StatusText tone="neutral" testId={`${ID}-pick-game`}>
              Pick the game first: the components that fit it show here.
            </StatusText>
          ) : (
            <>
              {suggested !== undefined && guess !== undefined && (
                <InlineAlert severity="info" title={`Suggested: ${suggested.label}`} testId={`${ID}-suggested`}>
                  <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
                    <span>{`The games look like it — ${guess.reason}.`}</span>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setComponent(suggested.id);
                        setOpenFolders((before) => new Set([...before, "tournament"]));
                      }}
                      disabled={component === suggested.id}
                      data-testid={`${ID}-suggested-pick`}
                    >
                      {component === suggested.id ? "Picked" : "Pick it"}
                    </Button>
                  </Box>
                </InlineAlert>
              )}
              <TreeView
                nodes={nodes}
                open={openFolders}
                onToggle={(id) =>
                  setOpenFolders((before) => {
                    const next = new Set(before);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                activeId={component}
                onSelect={(node) => setComponent(node.id)}
                ariaLabel="What the game is"
                hint="Arrow keys to move, right and left to open and close a folder, Enter to pick a component"
                testId={`${ID}-components`}
              />
            </>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0, overflowY: { md: "auto" } }}>
          {entry === undefined || source === undefined ? (
            <StatusText tone="neutral" testId={`${ID}-pick`}>
              Pick the game, then a component: its code shows here, to adjust, copy or insert into the content, and the component under it.
            </StatusText>
          ) : (
            <>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1 }}>
                <Typography component="label" htmlFor={`${ID}-code`} variant="subtitle2">
                  {`${entry.label} — <${componentOf(code) ?? componentOf(exampleCode) ?? "…"}>`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {entry.summary}
                </Typography>
              </Box>
              {entry.mock === true && (
                <InlineAlert severity="info" title="A mock — not built yet" testId={`${ID}-mock`}>
                  The code is a sketch of what it would take; there is nothing to insert until the component is built.
                </InlineAlert>
              )}
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
                <Button variant="contained" onClick={() => onInsert(code)} disabled={code.trim() === "" || entry.mock === true} data-testid={`${ID}-insert`}>
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
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(240px, 320px) minmax(0, 1fr)" },
                  gridTemplateRows: { lg: "minmax(0, 1fr)" },
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
                  <Typography variant="subtitle2" component="h3">
                    Settings
                  </Typography>
                  <Box sx={{ minHeight: 0, overflowY: { lg: "auto" }, pe: { lg: 1 } }}>
                    <SettingsForm code={code} onCode={setCode} />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
                  <Typography variant="subtitle2" component="h3" id={`${ID}-preview-label`}>
                    {entry.mock === true ? "Preview — a mock" : `Preview — ${sourceName ?? ""}`}
                  </Typography>
                  <Box
                    role="region"
                    aria-labelledby={`${ID}-preview-label`}
                    sx={{ flex: 1, minHeight: 240, overflowY: "auto", p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}
                  >
                    {entry.mock === true ? (
                      <Box data-testid={`${ID}-mock-preview`} sx={{ display: "grid", gap: 1.5, maxWidth: 520 }}>
                        <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }}>
                          {`${entry.label} — how it would look`}
                        </Typography>
                        {entry.id === "puzzle-board" ? (
                          <Typography variant="body2">
                            {/\bhideNextMoves(?!=\{false\})/.test(code)
                              ? `A board at the position after ${movesOf(source)} — the moves after it hidden, each shown once the reader plays it on the board.`
                              : `A board at the position after ${movesOf(source)}, the moves after it listed beside it, as a game shows them.`}
                          </Typography>
                        ) : (
                          <Typography variant="body2">{entry.summary.replace(/^Not built yet — /, "")}.</Typography>
                        )}
                      </Box>
                    ) : (
                      <SnippetPreview source={`${definitions.source}${code}`} folder={folder} attached={attached} lineOffset={definitions.lines} testId={`${ID}-preview`} />
                    )}
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </BaseDialog>
  );
}

export default AddComponentDialog;
