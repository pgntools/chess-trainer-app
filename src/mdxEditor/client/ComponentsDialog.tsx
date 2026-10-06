import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { RadioGroupField, TextInputField } from "../../design-system/components/forms";
import { TreeView, type TreeNode } from "../../design-system/patterns/trees";
import { splitPgnGames } from "../../lib/pgn";
import type { TournamentGuess } from "./tournamentKind";
import { collectionGamesOf, collectionSummaryOf, FORMAT_WORDS, guessOf, libraryPgnOf } from "./libraryLookup";
import { collectionPathOf, libraryGamePathOf } from "../../views/home/frontPage/paths";
import { pgnTextOf } from "./articleSources";
import { CATALOG, catalogFor, componentOf, TOURNAMENT_ENTRY, type ExampleSource, type LibraryGame, type MovesLine } from "./componentCatalog";
import { componentLabelOf, componentsIn, elementAt, pgnNameOf, startAtCaret, type ContentElement } from "./contentElements";
import { COLUMNS, ELLIPSIS, MAIN_COLUMN, SIDE_COLUMN, TEXTAREA_SX } from "./dialogLayout";
import { SnippetPreview } from "./mdxPreview";
import SettingsForm from "./SettingsForm";
import { ElementEditor, ItemHead, SectionDialog } from "./SectionDialog";
import { articlePgnsOf, pgnDefinitionsIn } from "./pgnImports";
import { movesLineOf, pgnBytesOf, sizeOf } from "./pgnPages";

const ID = "mdx-editor-components";
/** The source choice that is a Library game rather than one of the article's PGNs. */
const LIBRARY = "library:";

/** A game's first moves, for a sentence — or a short opening where it gave none. */
const movesOf = (source: { moves?: MovesLine }) => source.moves?.line ?? "1. e4 e5 2. Nf3 Nc6";

type ComponentsDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The article's folder under `articles/` — where its imports resolve from. */
  folder: string;
  /** The article's content — its components, and its PGNs, what a component can show. */
  body: string;
  /** PGNs written this session, by path under `articles/` — read before the build's glob has caught up. */
  attached: Readonly<Record<string, string>>;
  /** Where the caret is — the component it sits in opens first. */
  caret: number;
  /** Open on Add a component, whatever the article has. */
  startOnAdd?: boolean;
  /** The PGN chosen in Add a component on arrival — from PGNs' "Add a component with it". */
  initialPgn?: string;
  /** Put the code into the content where the caret is. */
  onInsert: (code: string) => void;
  /** Put a component's new markup in place of `body.slice(start, end)`. */
  onApply: (start: number, end: number, code: string) => void;
  /** Take a component out of the content — asking first. */
  onRemove: (element: ContentElement) => void;
  /** Put the caret on a component in the content. */
  onShow: (start: number, end: number) => void;
  /** Go to PGNs, adding one — for an article with no PGN yet. */
  onAddPgn: () => void;
  /** A component just put in, by where it starts — the list moves to it. */
  picked?: { seq: number; start: number };
  /** What the last action in the dialog came to. */
  message?: string;
};

/**
 * **Add a component** (CTA-137) — a component that shows a game, put into
 * the content where the caret is, in the order it is chosen:
 *
 * 1. **The game** — one of the article's PGNs (PGNs'; one PGN can feed
 *    as many components as the article likes), or the Library by an
 *    address — a whole collection's, `/library/<collection>` (a
 *    tournament's tables, its card, its games), or one game's,
 *    `/library/<collection>/<n>` — looked up.
 * 2. **The component** — a tree of folders by what the game is (a single
 *    game, a player's, a set, a repertoire, a tournament, a position, a
 *    puzzle), holding only the components that fit that game
 *    (`componentCatalog.ts`) — the table a tournament's games look like
 *    suggested, the components not built yet shown as mocks.
 *
 * The one picked shows its markup in a box on top — to adjust, copy or
 * insert at the caret — and under it, side by side, its **Settings** (a
 * form over its props, so nobody needs to know them: `componentSettings.ts`)
 * and the component rendered as the article will render it.
 */
function AddComponentPane({ folder, body, attached, initialPgn, onInsert, onAddPgn }: ComponentsDialogProps) {
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
    void pgnTextOf(chosenPgn, folder, attached).then((text) => {
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
    <>
      <Typography variant="subtitle1" component="h3" sx={{ flexShrink: 0, fontWeight: 600, px: 0.5 }}>
        Add a component
      </Typography>
      <Box sx={COLUMNS}>
        <Box sx={SIDE_COLUMN} data-testid={`${ID}-sidebar`}>
          <Typography variant="subtitle2" component="h4">
            1. The game
          </Typography>
          {pgns.length === 0 && (
            <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
              <StatusText tone="neutral" testId={`${ID}-no-pgn`}>
                The article has no PGN yet — add one, or show a game from the Library.
              </StatusText>
              <Button size="small" variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={onAddPgn} data-testid={`${ID}-add-pgn`}>
                Add a PGN…
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
                    {/* Its own text, between the two: a space at a span's edge is lost from the radio's name. */}
                    {" — "}
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      {pgn.kind === "file" ? pgn.file : `inline, ${sizeOf(pgnBytesOf(pgn.text))}`}
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

          <Typography variant="subtitle2" component="h4">
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

        <Box sx={MAIN_COLUMN}>
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
                  gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "minmax(240px, 320px) minmax(0, 1fr)" },
                  gridTemplateRows: { xl: "minmax(0, 1fr)" },
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
                  <Typography variant="subtitle2" component="h4">
                    Settings
                  </Typography>
                  <Box sx={{ minHeight: 0, overflowY: { xl: "auto" }, pe: { xl: 1 } }}>
                    <SettingsForm code={code} onCode={setCode} testId={`${ID}-settings`} />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
                  <Typography variant="subtitle2" component="h4" id={`${ID}-preview-label`}>
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
    </>
  );
}

/**
 * **Components** (CTA-137, CTA-139) — the chess components in the content
 * and a new one, in one dialog:
 *
 * - **The article's components** — every element the catalog names
 *   (`componentsIn`; an image is Images'), by its component and what it
 *   reads, a PGN by name or a Library address (the one the caret is in
 *   first). Chosen, one shows its settings as a form beside its code and
 *   the component rendered — its PGN's definition compiled ahead of it —
 *   and Apply puts the new markup in place of the old; it can be **shown
 *   in the content**, or **removed** from it.
 * - **Add a component** — the game, then a component that fits it,
 *   inserted where the caret is; the list then moves to it.
 */
function ComponentsDialog(props: ComponentsDialogProps) {
  const { open, onClose, body, caret, startOnAdd = false, folder, attached, onApply, onRemove, onShow, picked, message } = props;
  const elements = componentsIn(body);
  /** The component chosen, by where it starts — `null` for Add a component. */
  const [selected, setSelected] = useState<number | null>(() => (startOnAdd ? null : startAtCaret(elements, caret)));
  const [seenPick, setSeenPick] = useState(picked?.seq);
  if (picked !== undefined && picked.seq !== seenPick) {
    setSeenPick(picked.seq);
    setSelected(picked.start);
  }
  const element = elementAt(elements, selected);
  const label = element === undefined ? undefined : componentLabelOf(element.code);
  const pgn = element === undefined ? undefined : pgnNameOf(element.code);

  return (
    <SectionDialog
      open={open}
      onClose={onClose}
      title="Components"
      listLabel="The article's components"
      items={elements.map((candidate) => {
        const words = componentLabelOf(candidate.code);
        return {
          id: String(candidate.start),
          label: (
            <Box component="span" dir="ltr" sx={{ display: "block", minWidth: 0 }}>
              <Box component="code" title={`<${words.component}>`} sx={{ ...ELLIPSIS, fontWeight: 600 }}>
                {`<${words.component}>`}
              </Box>
              {words.reads !== undefined && (
                <Box component="span" title={words.reads} sx={{ ...ELLIPSIS, color: "text.secondary", typography: "body2" }}>
                  {words.reads}
                </Box>
              )}
            </Box>
          ),
        };
      })}
      emptyWords="None yet."
      addLabel="Add a component"
      selected={element === undefined ? null : String(element.start)}
      onSelect={(id) => setSelected(id === null ? null : Number(id))}
      paneLabel={label === undefined ? "Add a component" : `The component <${label.component}>${label.reads === undefined ? "" : ` — ${label.reads}`}`}
      message={message}
      testId={ID}
    >
      {element === undefined || label === undefined ? (
        <AddComponentPane {...props} />
      ) : (
        <>
          <ItemHead
            title={
              <Box component="code" dir="ltr">
                {`<${label.component}>`}
              </Box>
            }
            detail={label.reads === undefined ? undefined : <span dir="ltr">{`Reads ${label.reads}`}</span>}
            onShow={() => onShow(element.start, element.end)}
            onRemove={() => onRemove(element)}
            testId={ID}
          />
          <ElementEditor
            // A fresh form for each component, and once its new markup is in.
            key={`${element.start}:${element.code}`}
            code={element.code}
            onApply={(code) => onApply(element.start, element.end, code)}
            definitions={pgn === undefined ? { source: "", lines: 0 } : pgnDefinitionsIn(body, [pgn])}
            folder={folder}
            attached={attached}
            testId={`${ID}-component`}
          />
        </>
      )}
    </SectionDialog>
  );
}

export default ComponentsDialog;
