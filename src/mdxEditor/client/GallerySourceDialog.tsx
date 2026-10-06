import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import { FormDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { FileInputButton, RadioGroupField, SelectField, TextInputField } from "../../design-system/components/forms";
import { splitPgnGames } from "../../lib/pgn";
import { isBrowserOnly, sourceAddressOf, sourcePathOf, type SourceAddress } from "../../lib/embedSource";
import { findShippedCollection } from "../../lib/shippedCollections";
import { HEAVY_GAMES, misfitOf, type BuiltInExample, type GalleryEntry } from "./componentGallery";
import { GALLERY_ID, gamesWords, type Applied, type Choice } from "./gallerySource";
import HeavyPgnDialog from "./HeavyPgnDialog";
import { describeAddress } from "./libraryLookup";
import { pgnBytesOf, sizeOf } from "./pgnPages";
import { isHeavyPgn } from "./pgnStats";

const ID = GALLERY_ID;

/** Each kind of address, for the pane's line. */
const KIND_NAMES: Readonly<Record<SourceAddress["kind"], string>> = {
  collection: "The Library",
  libraryGame: "The Library",
  analysis: "A saved analysis",
  playedGame: "A played game",
  repertoire: "A repertoire",
};

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
  const [address, setAddress] = useState(origin?.kind === "address" ? origin.address : "");
  const [lookup, setLookup] = useState<{ looking: true } | { looking: false; problem: string }>();
  const [found, setFound] = useState<{ address: string; named: SourceAddress; label: string } | undefined>(
    origin?.kind === "address" && current !== undefined && current.source.kind === "address"
      ? { address: origin.address, named: current.source.address, label: current.words.replace(/^[^—]*— /, "") }
      : undefined,
  );
  /** The heavy-PGN dialog, open over this one. */
  const [weighing, setWeighing] = useState(false);

  /** The address looked up — whatever it names in the app, found in its store — or the field says why not. */
  const lookUp = async () => {
    const named = sourceAddressOf(address);
    if (named === undefined) {
      return setLookup({
        looking: false,
        problem: "An address is a screen's, as the address bar shows it: /library/<collection>, /library/<collection>/<n>, /tools/analysis?analysis=<id>, /engine/play?saved=<id> or /repertoires/<id>.",
      });
    }
    setLookup({ looking: true });
    const described = await describeAddress(named);
    if ("problem" in described) return setLookup({ looking: false, problem: described.problem });
    setLookup(undefined);
    setFound({ address, named, label: described.label });
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
          : { source: { kind: "address", address: found.named }, words: `${KIND_NAMES[found.named.kind]} — ${found.label}`, origin: { kind: "address", address: sourcePathOf(found.named) } };
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
          if (choice === "address" && draft === undefined) return void lookUp();
          // A heavy PGN: asked about first. The file it already went to is offered again there.
          if (pgnChosen && heavy) return setWeighing(true);
          if (draft !== undefined && misfit === undefined) onApply(draft, entry.id);
        }}
        title={`Add / update ${reads} — <${entry.component}>`}
        submitLabel={pgnChosen && heavy ? "Choose how to use it…" : "Use it"}
        cancelLabel="Cancel"
        submitDisabled={misfit !== undefined || (draft === undefined && !(choice === "address" && address.trim() !== "") && !(pgnChosen && heavy))}
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
              { value: "address", label: "An address in the app — a Library collection or game, a saved analysis, a played game, a repertoire" },
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
          {choice === "address" && (
            <>
              <TextInputField
                label="The address"
                value={address}
                onChange={(value) => {
                  setAddress(value);
                  setLookup(undefined);
                }}
                placeholder="/library/candidates2026, /tools/analysis?analysis=…"
                dir="ltr"
                error={lookup?.looking === false}
                helperText={lookup?.looking === false ? lookup.problem : "Copy it from the address bar on its screen — the host and all."}
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
              {found !== undefined && found.address === address && isBrowserOnly(found.named, (id) => findShippedCollection(id) !== undefined) && (
                <InlineAlert severity="info" title="In this browser only" testId={`${ID}-browser-only`}>
                  It is yours, kept where you made it: an article naming it shows "not in this browser" to every other reader, and on the published site.
                </InlineAlert>
              )}
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
