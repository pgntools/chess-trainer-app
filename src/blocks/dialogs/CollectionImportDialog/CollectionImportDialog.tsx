import { useMemo, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
// eslint-disable-next-line no-restricted-imports -- migration.md §4.4: two thumbs on one span; SliderField is one value
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { ChipsAutocomplete } from "../../../design-system/components/autocompletes";
import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { visuallyHidden } from "../../../design-system/components/a11y";
import { DateRangeFields, SelectField, SwitchField, TextInputField } from "../../../design-system/components/forms";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import { formatBytes } from "../../../lib/formatBytes";
import type { GameHeaders } from "../../../lib/gameModel";
import { readPgnTags } from "../../../lib/pgn";
import { readTagLines, type PgnTag } from "../../../lib/pgnTagStamp";
import { guessTournamentKind, type TournamentGuess } from "../../../lib/tournamentKind";
import { TournamentMarkFields } from "../../forms/TournamentMarkFields";
import { GamesPickerDialog } from "../GamesPickerDialog";
import {
  canBeTournament,
  collectionFacetsOf,
  collectionMetadataOf,
  eventGroupsOf,
  filteredRows,
  playersOf,
  type CollectionImportSource,
  TOURNAMENT_FORMATS,
  formatOfKind,
  type CollectionRow,
  type CollectionTournament,
  type RowFilter,
  type TournamentFormat,
} from "../../../lib/libraryCollections";

/**
 * What the popup says about the tournament mark (CTA-142): the one mark for
 * a new collection whose kept games share one `Event` (absent unless the
 * reader turned it on), and — on a split — whether each event's collection
 * is marked with the type its games look like.
 */
export type ImportTournamentChoice = {
  mark?: CollectionTournament;
  /**
   * On a split with *Mark each event's tournament type* on: the type an
   * event's collection is marked as — the file's index in the source and the
   * event's name — as the reader left it in the table (the guess, unless
   * changed); `undefined` for none.
   */
  eventType?: (fileIndex: number, event: string) => TournamentFormat | undefined;
};

/** One event of a split, as the type table lists it. */
type EventRow = {
  key: string;
  fileIndex: number;
  /** Absent: the games with no `Event` — the "Unknown" collection, which cannot be a tournament. */
  event?: string;
  games: number;
  players: number;
  dates?: { first: string; last: string };
  /** The type its games look like, where they tell. */
  guess?: TournamentFormat;
};

/** An event's key in the type table: its file and its name. */
const eventKeyOf = (fileIndex: number, event: string | undefined) => `${fileIndex}\u0000${event === undefined ? "\u0001" : event}`;

/** "Not a tournament" in the type select. */
const NO_TYPE = "";

/** The tags of a file's kept games (`headers` its games' tags, read once). */
const tagsOf = (headers: readonly GameHeaders[] | undefined, rows: readonly CollectionRow[]): GameHeaders[] =>
  rows.map((row) => headers?.[row.number - 1]).filter((tags): tags is GameHeaders => tags !== undefined);

export type CollectionImportDialogProps = {
  /** What was read — the file (or the paste) and the texts in it. */
  source: CollectionImportSource;
  /** Add games to this collection (`?into=`), by name — the title and the button say so. Absent, a new one. */
  intoName?: string;
  /** What went wrong the last time Import was pressed — in the reader's words. */
  problem?: ReactNode;
  /**
   * **A plain choice of games** (CTA-186, Analysis V2's new Project): what
   * came in, the filters and the count — no *Split by event*, no tournament
   * mark — under the host's title and button. Absent, the Library's popup as
   * it was.
   */
  choiceOnly?: {
    title: string;
    confirmLabel: string;
    /**
     * **The games picked by hand** (CTA-208): a *Select games…* button opens
     * the games picker (`GamesPickerDialog`) over the games the filters keep;
     * the games picked there are the ones kept. The host's words: the
     * button, its *Change*, the way back to every game the filters keep, and
     * the line saying how many are picked. Absent, no picker.
     */
    selectGames?: { select: string; change: string; clear: string; selected: (count: number) => string };
  };
  /**
   * **The TAGS field** (CTA-234, the Library's imports): tag pairs typed one
   * a line, `[Name "Value"]`, handed to `onImport` for the host to stamp on
   * every kept game. A malformed line is said on the field and keeps Import
   * off. Absent, no field — and no tags.
   */
  tagsField?: boolean;
  /** Cancel, Escape or the backdrop. */
  onCancel: () => void;
  /**
   * Import: each file's rows the filters keep, in file order (a file may keep
   * none), and whether *Split by event* is on — a new-collection import's
   * choice; `false` where the switch is not offered (*Add games*) — and the
   * TAGS field's tag pairs (CTA-234; none where it is blank or not shown).
   */
  onImport: (kept: CollectionRow[][], splitByEvent: boolean, tournament: ImportTournamentChoice, tags: PgnTag[]) => void;
  /**
   * The root, and its parts: `-source`, `-file-<n>`, `-summary` (`-players`,
   * `-elo`, `-dates`, `-events`), `-elo` (`-elo-value`), `-from`, `-to`,
   * `-player`, `-tags`, `-several`, `-split` (`-split-help`), `-mark` (the tournament
   * fields' prefix: `-mark-tournament-switch`, `-mark-suggestion`,
   * `-mark-type-<format>`), `-auto-type`, `-event-types` (the table; each
   * row `-event-types-row-<n>`, its select `-event-types-type-<n>`, in
   * order), `-select` (the picker's button; `-select-clear`, `-selected`, the
   * picker `-picker`), `-count`, `-problem`, `-cancel`, `-confirm`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **The import-options popup** (CTA-113; the popup of CTA-103) — what
 * `/library/new` opens once a picked `.pgn` or `.zip`, a paste, or *Add
 * games* has been read, **before** anything is indexed or kept.
 *
 * - **What came in**: the file's name and size and the games read; for a
 *   zip, each `.pgn` in it with its own count; then the games' metadata at a
 *   glance (`collectionMetadataOf`: players, the Elo span, the date span,
 *   events).
 * - **Filters, applied before the index pass**, each shown only where some
 *   game carries its field (`collectionFacetsOf`): min / max Elo on one range
 *   slider over the games' own span — a thumb at its end is no bound, so the
 *   slider left whole filters nothing (a game missing an Elo is out while a
 *   bound is set); a date range (`DateRangeFields`, inside the games' first
 *   and last day); and players (a `ChipsAutocomplete`, several OR'd, typed
 *   free), suggested from the games the Elo range leaves — worked out when
 *   the list opens, never on each move of the slider. All go through
 *   `filteredRows`, so they cannot drift from the table's. A live "N of M"
 *   count; Import is off at none.
 *
 * - ***Split by event*** (CTA-127), offered on every new-collection import —
 *   never on *Add games* — and off with its reason where the kept games would
 *   make exactly one collection per file anyway (every file's kept games
 *   share one `Event`, or none of them has one). The filters are applied
 *   first, so the switch and its reason follow them live.
 * - **The tournament mark** (CTA-142), on a new collection: where every kept
 *   game shares one `Event` (and no split), the settings' own fields
 *   (`TournamentMarkFields`) — the switch, the type the games look like with
 *   an Apply, the type; on a split, ***Mark each event's tournament type***
 *   (on by default) and, under it, **every event in a table** — its name
 *   (and file, in a zip), games, players and dates, and a type select set to
 *   the type its games look like ("Not a tournament" where they do not
 *   tell), every format offered, for the reader to change any
 *   before Import. The guess
 *   reads the games' tags — read once, when first needed — so it is known
 *   before anything is indexed.
 *
 * - **The TAGS field** (CTA-234, `tagsField` — the Library's imports, never
 *   Analysis's): tag pairs, one a line, `[Name "Value"]` with the PGN's
 *   `\"` and `\\` escapes (`readTagLines`), handed to `onImport` — the
 *   host stamps them on the kept games just before the index pass, so the
 *   filters, the metadata, the split and the guess read the file as it is.
 *   A malformed line is said on the field, by its number, and Import is off
 *   until it is fixed; a name typed twice, the last one wins.
 *
 * - **Games picked by hand** (CTA-208, `choiceOnly.selectGames` — Analysis's
 *   new Project): *Select games…* opens the games picker over **the games the
 *   filters keep** (numbered across the files, a zip's too), and the games
 *   picked there are the ones kept — the count says so, *Change the
 *   selection…* reopens it, and a way back keeps every game the filters do.
 *   A pick the filters later leave out is not kept.
 *
 * Presentational: the index pass and the writes are the screen's — it hands
 * `onImport` the kept rows and the split choice, and shows its progress in a
 * `ProgressDialog` in this one's place. Its words are the Library's
 * (`library.upload.*`).
 */
function CollectionImportDialog({
  source,
  intoName,
  problem,
  choiceOnly,
  tagsField = false,
  onCancel,
  onImport,
  testId,
  dialogProps,
}: CollectionImportDialogProps) {
  const { t } = useTranslation();
  const id = (part: string) => `${testId}-${part}`;
  /** The Elo slider's thumbs; `null` until moved, i.e. the whole span. */
  const [eloRange, setEloRange] = useState<[number, number] | null>(null);
  const [dates, setDates] = useState({ from: "", to: "" });
  const [players, setPlayers] = useState<string[]>([]);
  /** *Split by event* (CTA-127): one folder per file, one collection per event. */
  const [splitByEvent, setSplitByEvent] = useState(false);
  /** The one-event mark (CTA-142): off until the reader turns it on. */
  const [mark, setMark] = useState<CollectionTournament>({ enabled: false, type: "swiss" });
  /** On a split: each event's collection marked with the type its games look like. */
  const [autoAssign, setAutoAssign] = useState(true);
  /** The types the reader picked in the event table, by event — the rest follow the guess. */
  const [eventTypes, setEventTypes] = useState<Readonly<Record<string, string>>>({});
  /** Whether the reader has touched the mark — until then its type follows the guess. */
  const [markTouched, setMarkTouched] = useState(false);
  /** The games picked by hand (CTA-208), by their number across the files — `null`: every game the filters keep. */
  const [picks, setPicks] = useState<ReadonlySet<number> | null>(null);
  const [picking, setPicking] = useState(false);
  /** The TAGS field's text (CTA-234). */
  const [tagsText, setTagsText] = useState("");
  const typedTags = useMemo(() => (tagsField ? readTagLines(tagsText) : { tags: [], problems: [] }), [tagsField, tagsText]);

  const allRows = useMemo(() => source.files.flatMap((file) => file.rows), [source]);
  const metadata = useMemo(() => collectionMetadataOf(allRows), [allRows]);
  const facets = useMemo(() => collectionFacetsOf(allRows), [allRows]);
  /** The slider's ends: the games' own Elo span — none when there is no range to pick in. */
  const eloSpan = metadata.elo !== undefined && metadata.elo.min < metadata.elo.max ? metadata.elo : undefined;
  const eloValue: [number, number] | undefined = eloSpan === undefined ? undefined : (eloRange ?? [eloSpan.min, eloSpan.max]);
  // A thumb at its end of the span is no bound: the whole span keeps the games with no Elo too.
  const minElo = eloSpan !== undefined && eloValue !== undefined && eloValue[0] > eloSpan.min ? eloValue[0] : undefined;
  const maxElo = eloSpan !== undefined && eloValue !== undefined && eloValue[1] < eloSpan.max ? eloValue[1] : undefined;

  /** The player list's names: the players of the games the Elo range leaves — worked out when the list opens. */
  const [playerOptions, setPlayerOptions] = useState<readonly string[]>(facets.players);
  const refreshPlayerOptions = () =>
    setPlayerOptions(
      minElo === undefined && maxElo === undefined
        ? facets.players
        : playersOf(filteredRows(allRows, { text: "", result: "", minElo, maxElo })),
    );

  const filter = useMemo<RowFilter>(
    () => ({ text: "", result: "", player: players, minElo, maxElo, from: dates.from, to: dates.to }),
    [players, minElo, maxElo, dates],
  );
  /** Where each file's games start in the numbering across the files — a zip's files each number theirs from 1. */
  const offsets = useMemo(() => {
    const starts: number[] = [];
    let total = 0;
    for (const file of source.files) {
      starts.push(total);
      total += file.rows.length;
    }
    return starts;
  }, [source]);
  /** Each file's rows the filters keep. */
  const filtered = useMemo(() => source.files.map((file) => filteredRows(file.rows, filter)), [source, filter]);
  /** The picker's rows: the games the filters keep, numbered across the files. */
  const pickable = useMemo(
    () => filtered.flatMap((rows, index) => rows.map((row) => ({ ...row, number: (offsets[index] ?? 0) + row.number }))),
    [filtered, offsets],
  );
  /** Each file's rows kept: the filters', narrowed to the games picked by hand when there are picks. */
  const kept = useMemo(
    () => (picks === null ? filtered : filtered.map((rows, index) => rows.filter((row) => picks.has((offsets[index] ?? 0) + row.number)))),
    [filtered, picks, offsets],
  );
  const keptCount = kept.reduce((sum, rows) => sum + rows.length, 0);
  const filtering = players.length > 0 || minElo !== undefined || maxElo !== undefined || dates.from !== "" || dates.to !== "";
  const eventsShown = metadata.events.slice(0, 3).join(", ");

  // The split follows the filters: only the kept games are grouped, so a
  // split that would make exactly one collection per file is not offered.
  const splittable = kept.some((rows) => eventGroupsOf(rows).length > 1);
  // A switch the filters turned off reads off, and imports off — until the
  // filters let it back on, where the reader left it.
  const splitting = splitByEvent && splittable && choiceOnly === undefined;
  const splitHelp = !splittable
    ? keptCount === 0
      ? t("library.upload.options.splitNothingKept")
      : kept.every((rows) => rows.every((row) => row.event === undefined))
        ? t("library.upload.options.splitNoEvents")
        : t("library.upload.options.splitOneEvent")
    : t("library.upload.options.splitHelp");

  // CTA-142: the tournament mark. A new collection only; one event across the kept games, or a split.
  const newCollection = intoName === undefined && choiceOnly === undefined;
  const oneEvent = newCollection && !splitting && keptCount > 0 && canBeTournament(kept.flat());
  const wantsGuess = oneEvent || (newCollection && splitting);
  /** Each file's games' tags — read once, and only once a guess is wanted. */
  const headers = useMemo<GameHeaders[][] | undefined>(
    () => (wantsGuess ? source.files.map((file) => file.games.map(readPgnTags)) : undefined),
    [source, wantsGuess],
  );
  const suggestion = useMemo<TournamentGuess | undefined>(
    () => (oneEvent && headers !== undefined ? guessTournamentKind(kept.flatMap((rows, index) => tagsOf(headers[index], rows))) : undefined),
    [oneEvent, headers, kept],
  );
  /** On a split: every event, in file and event order, with what its games say and the type they look like. */
  const events = useMemo((): EventRow[] => {
    if (!splitting || headers === undefined) return [];
    return kept.flatMap((rows, fileIndex) =>
      eventGroupsOf(rows).map((group): EventRow => {
        const metadata = collectionMetadataOf(group.rows);
        const guess = group.event === undefined ? undefined : guessTournamentKind(tagsOf(headers[fileIndex], group.rows));
        return {
          key: eventKeyOf(fileIndex, group.event),
          fileIndex,
          ...(group.event !== undefined && { event: group.event }),
          games: group.rows.length,
          players: metadata.players,
          ...(metadata.dates !== undefined && { dates: metadata.dates }),
          ...(guess !== undefined && { guess: formatOfKind(guess.kind) }),
        };
      }),
    );
  }, [splitting, headers, kept]);
  /** An event's type as the table shows it: the reader's pick, else the guess, else none. */
  const typeOf = (row: EventRow): string => eventTypes[row.key] ?? row.guess ?? NO_TYPE;
  // Until the reader picks a type, the mark's type is the guess's — so the switch turns it on with it.
  const shownMark: CollectionTournament =
    suggestion !== undefined && !mark.enabled && !markTouched ? { enabled: false, type: formatOfKind(suggestion.kind) } : mark;
  const choice = (): ImportTournamentChoice => ({
    ...(oneEvent && mark.enabled && { mark }),
    ...(newCollection &&
      splitting &&
      autoAssign && {
        eventType: (fileIndex: number, event: string) => {
          const row = events.find((candidate) => candidate.key === eventKeyOf(fileIndex, event));
          const type = row === undefined ? NO_TYPE : typeOf(row);
          return (TOURNAMENT_FORMATS as readonly string[]).includes(type) ? (type as TournamentFormat) : undefined;
        },
      }),
  });

  const typeOptions = [
    { value: NO_TYPE, label: t("library.upload.options.notTournament") },
    ...TOURNAMENT_FORMATS.map((format) => ({ value: format, label: t(`library.settings.formats.${format}`) })),
  ];
  const eventColumns: DataTableColumn<EventRow>[] = [
    {
      id: "event",
      header: t("library.upload.options.eventColumns.event"),
      wrap: true,
      render: (row) => (
        <>
          <bdi dir="auto">{row.event ?? t("library.upload.unknown")}</bdi>
          {source.zip && (
            <Typography variant="caption" component="div" dir="auto" sx={{ color: "text.secondary" }}>
              {source.files[row.fileIndex]?.name}
            </Typography>
          )}
        </>
      ),
    },
    { id: "games", header: t("library.upload.options.eventColumns.games"), align: "end", render: (row) => row.games },
    { id: "players", header: t("library.upload.options.eventColumns.players"), align: "end", render: (row) => row.players },
    {
      id: "dates",
      header: t("library.upload.options.eventColumns.dates"),
      dir: "ltr",
      render: (row) => (row.dates === undefined ? "—" : row.dates.first === row.dates.last ? row.dates.first : `${row.dates.first} – ${row.dates.last}`),
    },
    {
      id: "type",
      header: t("library.upload.options.eventColumns.type"),
      render: (row) => {
        const index = events.indexOf(row);
        // The games with no Event make one "Unknown" collection — never a tournament.
        if (row.event === undefined) return "—";
        return (
          <SelectField
            label={
              <>
                {t("library.upload.options.eventColumns.type")}
                <Box component="span" sx={visuallyHidden}>
                  {`: ${row.event}`}
                </Box>
              </>
            }
            value={typeOf(row)}
            onChange={(type) => setEventTypes((current) => ({ ...current, [row.key]: type }))}
            options={typeOptions}
            testId={id(`event-types-type-${index}`)}
          />
        );
      },
    },
  ];

  return (
    <BaseDialog
      open
      onClose={onCancel}
      title={
        choiceOnly !== undefined
          ? choiceOnly.title
          : intoName === undefined
            ? t("library.upload.options.title")
            : t("library.upload.options.intoTitle", { name: intoName })
      }
      width="sm"
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <>
          <Button onClick={onCancel} data-testid={id("cancel")}>
            {t("library.upload.cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={keptCount === 0 || typedTags.problems.length > 0}
            onClick={() => onImport(kept, splitting, choice(), typedTags.tags)}
            data-testid={id("confirm")}
          >
            {choiceOnly !== undefined
              ? choiceOnly.confirmLabel
              : t(intoName === undefined ? "library.upload.options.import" : "library.upload.intoSave")}
          </Button>
        </>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box>
          <Typography variant="body2" dir="auto" data-testid={id("source")} sx={{ fontWeight: 600 }}>
            {source.name ?? t("library.upload.options.pasted")}
            {" · "}
            <bdi dir="ltr">{formatBytes(source.size)}</bdi>
            {" · "}
            {t("library.upload.options.games", { count: metadata.games })}
          </Typography>
          {source.zip && (
            <Box component="ul" sx={{ m: 0, mt: 0.5, p: 0, listStyle: "none", display: "grid", gap: 0.25 }}>
              {source.files.map((file, index) => (
                <Typography
                  key={`${file.name ?? ""}-${index}`}
                  component="li"
                  variant="body2"
                  data-testid={id(`file-${index}`)}
                  sx={{ color: "text.secondary", display: "flex", gap: 1 }}
                >
                  <Box component="span" dir="auto" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                    {file.name}
                  </Box>
                  <bdi dir="ltr">{formatBytes(file.size)}</bdi>
                  <span>
                    {filtering
                      ? t("library.upload.options.fileKept", { kept: kept[index]?.length ?? 0, count: file.games.length })
                      : t("library.upload.options.games", { count: file.games.length })}
                  </span>
                </Typography>
              ))}
            </Box>
          )}
          <Box
            data-testid={id("summary")}
            sx={{ mt: 1, display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5, color: "text.secondary" }}
          >
            <Typography variant="caption" data-testid={id("summary-players")}>
              {t("library.upload.options.players", { count: metadata.players })}
            </Typography>
            {metadata.elo !== undefined && (
              <Typography variant="caption" data-testid={id("summary-elo")}>
                {t("library.upload.options.eloSpan")} <bdi dir="ltr">{`${metadata.elo.min}–${metadata.elo.max}`}</bdi>
              </Typography>
            )}
            {metadata.dates !== undefined && (
              <Typography variant="caption" data-testid={id("summary-dates")}>
                {t("library.upload.options.dateSpan")} <bdi dir="ltr">{`${metadata.dates.first} – ${metadata.dates.last}`}</bdi>
              </Typography>
            )}
            <Typography variant="caption" dir="auto" data-testid={id("summary-events")}>
              {t("library.upload.options.events", { count: metadata.events.length })}
              {metadata.events.length > 0 && `: ${eventsShown}${metadata.events.length > 3 ? ", …" : ""}`}
            </Typography>
          </Box>
        </Box>

        {(facets.players.length > 0 || eloSpan !== undefined || facets.dates !== undefined) && (
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
              {t("library.upload.options.filters")}
            </Typography>
            {eloSpan !== undefined && eloValue !== undefined && (
              // Two thumbs on one span — the design system's `SliderField` is one value; a range is this popup's alone.
              <Box>
                <Typography variant="body2" component="div">
                  {t("library.upload.options.eloSpan")}{" "}
                  <bdi dir="ltr" data-testid={id("elo-value")}>{`${eloValue[0]} – ${eloValue[1]}`}</bdi>
                </Typography>
                <Box sx={{ px: 1.5 }}>
                  <Slider
                    size="small"
                    min={eloSpan.min}
                    max={eloSpan.max}
                    step={1}
                    shiftStep={50}
                    value={eloValue}
                    onChange={(_event, value) => {
                      if (Array.isArray(value)) setEloRange([value[0] ?? eloSpan.min, value[1] ?? eloSpan.max]);
                    }}
                    disableSwap
                    valueLabelDisplay="auto"
                    marks={[
                      { value: eloSpan.min, label: String(eloSpan.min) },
                      { value: eloSpan.max, label: String(eloSpan.max) },
                    ]}
                    getAriaLabel={(index) => t(index === 0 ? "library.upload.options.minElo" : "library.upload.options.maxElo")}
                    data-testid={id("elo")}
                  />
                </Box>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  {t("library.upload.options.eloHelp")}
                </Typography>
              </Box>
            )}
            {facets.dates !== undefined && (
              <Box>
                <DateRangeFields
                  value={dates}
                  onChange={setDates}
                  fromLabel={t("library.filters.from")}
                  toLabel={t("library.filters.to")}
                  bounds={facets.dates}
                  testId={id("dates")}
                  inputTestIds={{ from: id("from"), to: id("to") }}
                />
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
                  {t("library.upload.options.dateHelp")}
                </Typography>
              </Box>
            )}
            {facets.players.length > 0 && (
              <Box>
                <ChipsAutocomplete
                  label={t("library.upload.options.playerFilter")}
                  value={players}
                  onChange={setPlayers}
                  options={playerOptions}
                  onOpen={refreshPlayerOptions}
                  testId={id("player")}
                />
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
                  {t("library.upload.options.playersHelp")}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* CTA-234: tags stamped on every imported game — the Library's imports only. */}
        {tagsField && (
          <TextInputField
            label={t("library.upload.options.tags")}
            value={tagsText}
            onChange={setTagsText}
            multiline
            dir="ltr"
            placeholder={'[Site "Warwick ENG"]\n[Annotator "Stockfish19"]'}
            error={typedTags.problems.length > 0}
            helperText={
              typedTags.problems.length === 0
                ? t("library.upload.options.tagsHelp")
                : typedTags.problems.map((problem) => (
                    <Box component="span" key={problem.line} sx={{ display: "block" }}>
                      {t(`library.upload.options.tagsProblem.${problem.reason}`, { line: problem.line })}
                    </Box>
                  ))
            }
            testId={id("tags")}
          />
        )}

        {/* Offered on every new-collection import, never on Add games — and
            off with its reason where the split would make one collection per
            file anyway (CTA-127). The reason rides the same description the
            help does, so it is read with the switch. */}
        {newCollection && (
          <SwitchField
            label={t("library.upload.options.split")}
            checked={splitting}
            onChange={setSplitByEvent}
            disabled={!splittable}
            help={splitHelp}
            testId={id("split")}
          />
        )}

        {/* CTA-142: the split's events, each marked with the type its games look like. */}
        {newCollection && splitting && (
          <Box>
            <SwitchField
              label={t("library.upload.options.autoType")}
              checked={autoAssign}
              onChange={setAutoAssign}
              help={t("library.upload.options.autoTypeHelp")}
              testId={id("auto-type")}
            />
            {autoAssign && (
              <Box sx={{ mt: 1, maxHeight: 360, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <DataTable<EventRow>
                  columns={eventColumns}
                  rows={events}
                  rowId={(row) => row.key}
                  rowTestId={(row) => id(`event-types-row-${events.indexOf(row)}`)}
                  emptyLabel={t("library.upload.options.autoTypeNone")}
                  density="dense"
                  ariaLabel={t("library.upload.options.eventTypes")}
                  testId={id("event-types")}
                />
              </Box>
            )}
          </Box>
        )}

        {/* CTA-142: one event across the kept games — mark the new collection as it comes in. */}
        {oneEvent && (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
              {t("library.settings.tournamentSection")}
            </Typography>
            <TournamentMarkFields
              value={shownMark}
              onChange={(next) => {
                setMarkTouched(true);
                setMark(next);
              }}
              canBeTournament
              suggestion={suggestion}
              testId={id("mark")}
            />
          </Box>
        )}

        {source.files.length > 1 && choiceOnly === undefined && (
          <Typography variant="caption" sx={{ color: "text.secondary" }} data-testid={id("several")}>
            {t(
              intoName === undefined
                ? splitting
                  ? "library.upload.options.severalSplit"
                  : "library.upload.options.several"
                : "library.upload.options.severalInto",
            )}
          </Typography>
        )}

        {choiceOnly?.selectGames !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" size="small" onClick={() => setPicking(true)} disabled={pickable.length === 0} data-testid={id("select")}>
              {picks === null ? choiceOnly.selectGames.select : choiceOnly.selectGames.change}
            </Button>
            {picks !== null && (
              <>
                <Typography variant="body2" data-testid={id("selected")} sx={{ color: "text.secondary" }}>
                  {choiceOnly.selectGames.selected(keptCount)}
                </Typography>
                <Button size="small" onClick={() => setPicks(null)} data-testid={id("select-clear")}>
                  {choiceOnly.selectGames.clear}
                </Button>
              </>
            )}
          </Box>
        )}

        <Typography variant="body2" role="status" sx={{ fontWeight: 600 }} data-testid={id("count")}>
          {t("library.upload.options.count", { kept: keptCount, count: metadata.games })}
        </Typography>

        {problem !== undefined && (
          <InlineAlert severity="error" testId={id("problem")}>
            {problem}
          </InlineAlert>
        )}
      </Box>
      {choiceOnly?.selectGames !== undefined && (
        <GamesPickerDialog
          open={picking}
          rows={pickable}
          mode="many"
          initialPicked={picks === null ? [] : pickable.filter((row) => picks.has(row.number)).map((row) => row.number)}
          onSubmit={(numbers) => {
            setPicks(new Set(numbers));
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
          testId={id("picker")}
          dialogProps={dialogProps}
        />
      )}
    </BaseDialog>
  );
}

export default CollectionImportDialog;
