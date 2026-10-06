import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import { FormDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { FileInputButton, RadioGroupField, SelectField, TextInputField } from "../../design-system/components/forms";
import { splitPgnGames } from "../../lib/pgn";
import type { LibraryGame } from "./componentCatalog";
import { HEAVY_GAMES, libraryGameOf, misfitOf, type BuiltInExample, type GalleryEntry } from "./componentGallery";
import { GALLERY_ID, gamesWords, type Applied, type Choice } from "./gallerySource";
import HeavyPgnDialog from "./HeavyPgnDialog";
import { collectionSummaryOf, FORMAT_WORDS, libraryPgnOf } from "./libraryLookup";
import { pgnBytesOf, sizeOf } from "./pgnPages";
import { isHeavyPgn } from "./pgnStats";

const ID = GALLERY_ID;

/**
 * **Add / update PGN** (CTA-140) — where a Components gallery entry reads
 * its games from, chosen in a dialog: a built-in example (the entry's own
 * first, chosen until another is), a PGN file uploaded or one pasted, or
 * the Library by an address, looked up as Components' Add a component
 * does. A light PGN is written into the code (`export const`); a **heavy**
 * one — more than `HEAVY_GAMES` games, or over `BIG_PGN_BYTES` — opens
 * `HeavyPgnDialog` first, which shows what it holds and asks where it goes
 * (saved to disk, saved as a Library collection, or pasted anyway); a light
 * one can be taken there too. A source that does not fit the component
 * says so, and cannot be used.
 */
function GallerySourceDialog({
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
  /** The source chosen — for `entryId`, the entry's own, or the Library entry a saved collection opens on. */
  onApply: (applied: Applied, entryId: string) => void;
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
    origin?.kind === "library" && current !== undefined && current.source.kind === "library"
      ? { address: origin.address, game: current.source.game, label: current.words.replace(/^The Library — /, "") }
      : undefined,
  );
  /** The heavy-PGN dialog, open over this one. */
  const [weighing, setWeighing] = useState(false);

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

  // An uploaded or pasted PGN: its weight, read once per text.
  const text = choice === "upload" ? (uploaded?.text ?? "") : choice === "paste" ? pasted : "";
  const bytes = useMemo(() => pgnBytesOf(text), [text]);
  const games = useMemo(() => (text.trim() === "" ? 0 : splitPgnGames(text).length), [text]);
  const heavy = text.trim() !== "" && isHeavyPgn(games, bytes, HEAVY_GAMES);
  const written = origin?.kind === "upload" || origin?.kind === "paste" ? origin.written : undefined;

  const upload = async (file: File) => {
    setReading(file.name);
    const read = await file.text();
    setReading(undefined);
    setUploaded({ name: file.name, text: read });
    // A heavy file is asked about at once.
    if (isHeavyPgn(splitPgnGames(read).length, pgnBytesOf(read), HEAVY_GAMES)) setWeighing(true);
  };

  // What the choice comes to — `undefined` while there is nothing to use yet; a heavy PGN goes through its own dialog.
  const example = builtIns.find((candidate) => candidate.id === builtIn);
  const draft: Applied | undefined =
    choice === "builtin"
      ? example === undefined
        ? undefined
        : { source: example.source, words: `Built-in example — ${example.label}`, origin: { kind: "builtin", id: example.id } }
      : choice === "upload" || choice === "paste"
        ? text.trim() === "" || heavy
          ? undefined
          : {
              source: { kind: "pasted", text },
              words: choice === "upload" ? `Uploaded — ${uploaded?.name ?? ""}, ${gamesWords(games)}` : `Pasted — ${gamesWords(games)}`,
              origin: choice === "upload" ? { kind: "upload", name: uploaded?.name ?? "", text } : { kind: "paste", text },
            }
        : found === undefined || found.address !== address
          ? undefined
          : { source: { kind: "library", game: found.game }, words: `The Library — ${found.label}`, origin: { kind: "library", address } };
  const misfit = draft === undefined ? undefined : misfitOf(entry, draft.source);
  const reads = entry.reads.includes("pgn") ? "PGN" : "game";
  const pgnChosen = (choice === "upload" || choice === "paste") && text.trim() !== "";

  return (
    <>
      <FormDialog
        open
        onClose={onClose}
        onSubmit={() => {
          // Enter in the address looks it up; the next one uses it.
          if (choice === "library" && draft === undefined) return void lookUp();
          // A heavy PGN: asked about first. The file it already went to is offered again there.
          if (pgnChosen && heavy) return setWeighing(true);
          if (draft !== undefined && misfit === undefined) onApply(draft, entry.id);
        }}
        title={`Add / update ${reads} — <${entry.component}>`}
        submitLabel={pgnChosen && heavy ? "Choose how to use it…" : "Use it"}
        cancelLabel="Cancel"
        submitDisabled={misfit !== undefined || (draft === undefined && !(choice === "library" && address.trim() !== "") && !(pgnChosen && heavy))}
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
                  {`${uploaded.name} — ${gamesWords(games)}, ${sizeOf(bytes)}.`}
                </StatusText>
              )}
            </Box>
          )}
          {choice === "paste" && <TextInputField label="The PGN" value={pasted} onChange={setPasted} multiline dir="ltr" placeholder={'[Event "…"]\n\n1. e4 e5 2. Nf3 *'} testId={`${ID}-pasted`} />}
          {pgnChosen &&
            (heavy ? (
              <InlineAlert severity="info" title="A heavy PGN" testId={`${ID}-heavy`}>
                {`${gamesWords(games)}, ${sizeOf(bytes)}${written === undefined ? "" : ` — written to ${written}`}: choose how to use it — saved to disk, saved as a Library collection, or pasted anyway.`}
              </InlineAlert>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ flex: "1 1 220px" }}>
                  Written into the code as it is (export const), so the article needs no file.
                </Typography>
                <Button size="small" onClick={() => setWeighing(true)} data-testid={`${ID}-more-options`}>
                  More options…
                </Button>
              </Box>
            ))}
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
      {weighing && pgnChosen && (
        <HeavyPgnDialog
          entry={entry}
          text={text}
          name={choice === "upload" ? uploaded?.name : undefined}
          kind={choice === "upload" ? "upload" : "paste"}
          current={current}
          onClose={() => setWeighing(false)}
          onDone={onApply}
        />
      )}
    </>
  );
}

export default GallerySourceDialog;
