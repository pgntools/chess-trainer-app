import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { FormDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { RadioGroupField, SelectField, TextInputField } from "../../design-system/components/forms";
import { addCollection } from "../../lib/libraryCollectionStore";
import type { CollectionTournament } from "../../lib/libraryCollections";
import { splitPgnGames } from "../../lib/pgn";
import { indexCollection } from "../../views/library/indexCollection";
import { folderOf } from "./articleSources";
import { collectionSourceFor, entryForKind, HEAVY_GAMES, KIND_WORDS, libraryEntryFor, type GalleryEntry } from "./componentGallery";
import { GALLERY_ID, gamesWords, PGN_FILE, pgnFileNameOf, SERVICE_DOWN, useBlogFolders, writePgnFile, type Applied, type BlogFolders } from "./gallerySource";
import { BIG_PGN_BYTES, sizeOf } from "./pgnPages";
import { isHeavyPgn, pgnStatsOf, type PgnStats } from "./pgnStats";
import { ARTICLES_DIR } from "./storageClient";

const ID = `${GALLERY_ID}-heavy`;

/** What to do with an uploaded or pasted PGN. */
type Action = "disk" | "collection" | "inline";

/** The tournament mark a collection of these games gets — the formats the Library's table reads. */
const markOf = (stats: PgnStats): CollectionTournament | undefined =>
  stats.guess?.kind === "swiss" || stats.guess?.kind === "roundRobin" || stats.guess?.kind === "match" ? { enabled: true, type: stats.guess.kind } : undefined;

/** A PGN file's folder and name under `articles/` — an existing folder only: a new one would be a new Blog folder. */
export function PgnFileFields({
  folders,
  folder,
  onFolder,
  fileName,
  onFileName,
  problem,
}: {
  folders: BlogFolders | undefined;
  folder: string;
  onFolder: (folder: string) => void;
  fileName: string;
  onFileName: (name: string) => void;
  problem?: string;
}) {
  if (folders === undefined) {
    return (
      <Typography role="status" variant="body2" color="text.secondary">
        Asking the storage service for the Blog's folders…
      </Typography>
    );
  }
  if (folders.kind !== "folders") {
    return (
      <InlineAlert severity="error" title="No file can be written" testId={`${GALLERY_ID}-no-service`}>
        {folders.kind === "down" ? SERVICE_DOWN : folders.message}
      </InlineAlert>
    );
  }
  const path = `${folder === "" ? "" : `${folder}/`}${fileName.trim()}`;
  const nameProblem = PGN_FILE.test(fileName.trim()) ? undefined : "A file name is letters, digits, dots, dashes and underscores, then .pgn.";
  return (
    <>
      <SelectField
        label="The folder"
        value={folder}
        onChange={onFolder}
        options={folders.paths.map((candidate) => ({ value: candidate, label: candidate === "" ? "The Blog's root" : candidate }))}
        optionDir="ltr"
        fullWidth
        helperText="An existing folder under src/views/blog/articles/ — a new one would be a new Blog folder."
        testId={`${GALLERY_ID}-folder`}
      />
      <TextInputField
        label="The file name"
        value={fileName}
        onChange={onFileName}
        dir="ltr"
        error={nameProblem !== undefined || problem !== undefined}
        helperText={nameProblem ?? problem ?? `Written to ${ARTICLES_DIR}/${path}.`}
        testId={`${GALLERY_ID}-file-name`}
      />
    </>
  );
}

/** The PGN's stats, as a list of terms and what they come to. */
function StatsList({ stats }: { stats: PgnStats }) {
  const { results } = stats;
  const rows: [string, string][] = [
    ["Games", `${stats.games.toLocaleString()}, ${sizeOf(stats.bytes)}`],
    ...(stats.events.length === 0
      ? []
      : [["Events", `${stats.events[0].name}${stats.events.length > 1 ? ` and ${(stats.events.length - 1).toLocaleString()} more` : ""}`] as [string, string]]),
    ...(stats.dates === undefined ? [] : [["Dates", stats.dates.first === stats.dates.last ? stats.dates.first : `${stats.dates.first} – ${stats.dates.last}`] as [string, string]]),
    ["Players", stats.players.toLocaleString()],
    ...(stats.teams === 0 ? [] : [["Teams", stats.teams.toLocaleString()] as [string, string]]),
    ...(stats.rounds === undefined ? [] : [["Rounds", String(stats.rounds)] as [string, string]]),
    ["Results", `White won ${results["1-0"].toLocaleString()}, Black won ${results["0-1"].toLocaleString()}, drawn ${results["1/2-1/2"].toLocaleString()}${results["*"] > 0 ? `, unfinished ${results["*"].toLocaleString()}` : ""}`],
    ["Annotated", `comments in ${gamesWords(stats.commented)}, side lines in ${gamesWords(stats.withSideLines)}`],
  ];
  return (
    <Box component="dl" data-testid={`${ID}-stats`} sx={{ m: 0, display: "grid", gridTemplateColumns: "max-content minmax(0, 1fr)", columnGap: 2, rowGap: 0.5 }}>
      {rows.map(([term, value]) => (
        <Box key={term} sx={{ display: "contents" }}>
          <Typography component="dt" variant="body2" sx={{ fontWeight: 600 }}>
            {term}
          </Typography>
          <Typography component="dd" variant="body2" dir="auto" sx={{ m: 0, overflowWrap: "anywhere" }}>
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * **A heavy PGN — what to do with it** (CTA-140): an upload or a paste of
 * more than `HEAVY_GAMES` games, or over `BIG_PGN_BYTES`, is not written
 * into the code unasked — compiled there on every change, it holds the page
 * up. What it holds is shown first (`pgnStats.ts`: its games, events,
 * dates, players, results, and the kind of tournament it looks like), then
 * three ways on:
 *
 * 1. **Save to disk** — a `.pgn` the storage service writes into an
 *    existing folder of the Blog's, never over another, imported.
 * 2. **Save as a Library collection** — indexed and kept in this browser's
 *    Library, then read by its address — by the entry, or, for one that
 *    reads no collection, by the Library's table for these games
 *    (`libraryEntryFor`), which the gallery then opens.
 * 3. **Paste anyway** — written into the code all the same.
 *
 * A PGN that is not heavy can be brought here too, for 1 or 2.
 */
function HeavyPgnDialog({
  entry,
  text,
  name,
  kind,
  current,
  onClose,
  onDone,
}: {
  entry: GalleryEntry;
  text: string;
  /** The uploaded file's name — absent for a paste. */
  name?: string;
  kind: "upload" | "paste";
  /** The source in use — a file it already went to is not written again. */
  current: Applied | undefined;
  onClose: () => void;
  /** It is done: the source, for `entryId` — the entry's own, or the Library entry a collection opens on. */
  onDone: (applied: Applied, entryId: string) => void;
}) {
  const games = useMemo(() => splitPgnGames(text), [text]);
  const stats = useMemo(() => pgnStatsOf(text, games), [text, games]);
  const heavy = isHeavyPgn(stats.games, stats.bytes, HEAVY_GAMES);
  const written = current?.origin.kind === "upload" || current?.origin.kind === "paste" ? current.origin.written : undefined;
  const [action, setAction] = useState<Action>(heavy ? "disk" : "inline");
  const folders = useBlogFolders(action === "disk");
  const sampleFolder = entry.sample !== undefined && "file" in entry.sample ? folderOf(entry.sample.file) : "";
  const [folder, setFolder] = useState(written === undefined ? sampleFolder : folderOf(written));
  const [fileName, setFileName] = useState(written?.split("/").at(-1) ?? pgnFileNameOf(name ?? stats.events[0]?.name ?? "games"));
  const [collectionName, setCollectionName] = useState(name?.replace(/\.pgn$/i, "") ?? stats.events[0]?.name ?? "Pasted games");
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState<{ done: number; total: number } | "writing">();

  const target = libraryEntryFor(entry);
  const best = stats.guess === undefined ? undefined : entryForKind(stats.guess.kind, "pgn");
  const path = `${folder === "" ? "" : `${folder}/`}${fileName.trim()}`;
  const origin = (extra: { written?: string } = {}): Applied["origin"] => (kind === "upload" ? { kind, name: name ?? "", text, ...extra } : { kind, text, ...extra });
  const from = kind === "upload" ? `Uploaded — ${name ?? ""}` : "Pasted";

  const blocked =
    action === "disk"
      ? folders?.kind !== "folders" || !PGN_FILE.test(fileName.trim())
      : action === "collection"
        ? target === undefined || collectionName.trim() === ""
        : false;

  const submit = async () => {
    setProblem(undefined);
    if (action === "inline") {
      return onDone({ source: { kind: "pasted", text }, words: `${from}, ${gamesWords(stats.games)}`, origin: origin() }, entry.id);
    }
    if (action === "disk") {
      const applied: Applied = {
        source: { kind: "file", file: path },
        words: `${from}, written to ${path} — ${gamesWords(stats.games)}`,
        origin: origin({ written: path }),
        attached: { [path]: text },
      };
      // The file this PGN already went to is not written again.
      if (path === written && current?.attached?.[path] === text) return onDone(applied, entry.id);
      setBusy("writing");
      const failed = await writePgnFile(path, text);
      setBusy(undefined);
      return failed === undefined ? onDone(applied, entry.id) : setProblem(failed);
    }
    if (target === undefined) return;
    setBusy({ done: 0, total: games.length });
    try {
      const rows = await indexCollection(games, (done, total) => setBusy({ done, total }));
      setBusy("writing");
      const made = await addCollection(collectionName.trim(), games, rows, undefined, undefined, null, { tournament: markOf(stats) });
      setBusy(undefined);
      if ("problem" in made) return setProblem("The Library could not keep it — this browser's storage refused it.");
      const address = `/library/${made.collection.id}`;
      onDone(
        {
          source: collectionSourceFor(target, made.collection.id),
          words: `Saved as a Library collection — ${made.collection.name}, ${address} — ${gamesWords(made.collection.count)}`,
          origin: { kind: "address", address },
        },
        target.id,
      );
    } catch {
      setBusy(undefined);
      setProblem("Its games could not be read into the Library's index.");
    }
  };

  const submitLabel = action === "disk" ? "Save to disk" : action === "collection" ? "Save as a collection" : heavy ? "Paste anyway" : "Paste it";
  return (
    <FormDialog
      open
      onClose={onClose}
      onSubmit={() => void submit()}
      title={heavy ? `A heavy PGN${name === undefined ? "" : ` — ${name}`}` : `The PGN${name === undefined ? "" : ` — ${name}`}`}
      submitLabel={submitLabel}
      cancelLabel="Back"
      submitDisabled={blocked}
      busy={busy !== undefined}
      width="sm"
      testId={ID}
    >
      <Box sx={{ display: "grid", gap: 2, "& > *": { minWidth: 0 } }}>
        {heavy && (
          <Typography variant="body2">
            {`More than ${HEAVY_GAMES} games${stats.bytes > BIG_PGN_BYTES ? `, or over ${sizeOf(BIG_PGN_BYTES)},` : ""} is heavy: written into the code, it is compiled on every change and holds the page up. Here is what it holds — then choose where it goes.`}
          </Typography>
        )}
        <StatsList stats={stats} />
        {stats.guess === undefined ? (
          <StatusText tone="neutral" testId={`${ID}-guess`}>
            Its games do not look like a tournament the tables know.
          </StatusText>
        ) : (
          <InlineAlert severity="info" title={`Looks like ${KIND_WORDS[stats.guess.kind]}`} testId={`${ID}-guess`}>
            {`${stats.guess.reason}.${best === undefined ? "" : ` Shown best by ${best.label}, <${best.component}>${best.id === entry.id ? " — this one" : ""}.`}`}
          </InlineAlert>
        )}
        <RadioGroupField<Action>
          label="What to do with it"
          options={[
            { value: "disk", label: "Save to disk — a .pgn beside the Blog's articles, imported" },
            {
              value: "collection",
              label:
                target === undefined
                  ? "Save as a Library collection — nothing here shows one"
                  : `Save as a Library collection, then read it by its address${target.id === entry.id ? "" : ` — in ${target.label}, <${target.component}>`}`,
              disabled: target === undefined,
            },
            { value: "inline", label: heavy ? "Paste anyway — written into the code" : "Paste it — written into the code" },
          ]}
          value={action}
          onChange={(next) => {
            setAction(next);
            setProblem(undefined);
          }}
          size="small"
          testId={`${ID}-action`}
        />
        {action === "disk" && (
          <PgnFileFields
            folders={folders}
            folder={folder}
            onFolder={setFolder}
            fileName={fileName}
            onFileName={(next) => {
              setFileName(next);
              setProblem(undefined);
            }}
            problem={problem}
          />
        )}
        {action === "collection" && (
          <TextInputField
            label="The collection's name"
            value={collectionName}
            onChange={setCollectionName}
            dir="auto"
            helperText="Kept in this browser's Library — an article that names it shows it only here. The gallery then reads it by its address."
            testId={`${ID}-collection-name`}
          />
        )}
        {action === "inline" && heavy && (
          <InlineAlert severity="warning" title={`${sizeOf(stats.bytes)} in the code`} testId={`${ID}-inline-warning`}>
            The page compiles the code on every change: with this much in it, it may freeze while it does.
          </InlineAlert>
        )}
        {busy !== undefined && (
          <Typography role="status" variant="body2" color="text.secondary" data-testid={`${ID}-progress`}>
            {busy === "writing" ? "Writing…" : `Indexing its games — ${busy.done.toLocaleString()} of ${busy.total.toLocaleString()}…`}
          </Typography>
        )}
        {problem !== undefined && action !== "disk" && (
          <InlineAlert severity="error" title="It did not go in" testId={`${ID}-problem`}>
            {problem}
          </InlineAlert>
        )}
      </Box>
    </FormDialog>
  );
}

export default HeavyPgnDialog;
