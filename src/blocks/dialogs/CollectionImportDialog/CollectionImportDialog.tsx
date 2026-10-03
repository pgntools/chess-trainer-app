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
import { DateRangeFields, SwitchField } from "../../../design-system/components/forms";
import { formatBytes } from "../../../lib/formatBytes";
import {
  collectionFacetsOf,
  collectionMetadataOf,
  eventGroupsOf,
  filteredRows,
  playersOf,
  type CollectionImportSource,
  type CollectionRow,
  type RowFilter,
} from "../../../lib/libraryCollections";

export type CollectionImportDialogProps = {
  /** What was read — the file (or the paste) and the texts in it. */
  source: CollectionImportSource;
  /** Add games to this collection (`?into=`), by name — the title and the button say so. Absent, a new one. */
  intoName?: string;
  /** What went wrong the last time Import was pressed — in the reader's words. */
  problem?: ReactNode;
  /** Cancel, Escape or the backdrop. */
  onCancel: () => void;
  /**
   * Import: each file's rows the filters keep, in file order (a file may keep
   * none), and whether *Split by event* is on — a new-collection import's
   * choice; `false` where the switch is not offered (*Add games*).
   */
  onImport: (kept: CollectionRow[][], splitByEvent: boolean) => void;
  /**
   * The root, and its parts: `-source`, `-file-<n>`, `-summary` (`-players`,
   * `-elo`, `-dates`, `-events`), `-elo` (`-elo-value`), `-from`, `-to`,
   * `-player`, `-several`, `-split` (`-split-help`), `-count`, `-problem`,
   * `-cancel`, `-confirm`.
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
 *
 * Presentational: the index pass and the writes are the screen's — it hands
 * `onImport` the kept rows and the split choice, and shows its progress in a
 * `ProgressDialog` in this one's place. Its words are the Library's
 * (`library.upload.*`).
 */
function CollectionImportDialog({ source, intoName, problem, onCancel, onImport, testId, dialogProps }: CollectionImportDialogProps) {
  const { t } = useTranslation();
  const id = (part: string) => `${testId}-${part}`;
  /** The Elo slider's thumbs; `null` until moved, i.e. the whole span. */
  const [eloRange, setEloRange] = useState<[number, number] | null>(null);
  const [dates, setDates] = useState({ from: "", to: "" });
  const [players, setPlayers] = useState<string[]>([]);
  /** *Split by event* (CTA-127): one folder per file, one collection per event. */
  const [splitByEvent, setSplitByEvent] = useState(false);

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
  /** Each file's rows the filters keep. */
  const kept = useMemo(() => source.files.map((file) => filteredRows(file.rows, filter)), [source, filter]);
  const keptCount = kept.reduce((sum, rows) => sum + rows.length, 0);
  const filtering = players.length > 0 || minElo !== undefined || maxElo !== undefined || dates.from !== "" || dates.to !== "";
  const eventsShown = metadata.events.slice(0, 3).join(", ");

  // The split follows the filters: only the kept games are grouped, so a
  // split that would make exactly one collection per file is not offered.
  const splittable = kept.some((rows) => eventGroupsOf(rows).length > 1);
  // A switch the filters turned off reads off, and imports off — until the
  // filters let it back on, where the reader left it.
  const splitting = splitByEvent && splittable;
  const splitHelp = !splittable
    ? keptCount === 0
      ? t("library.upload.options.splitNothingKept")
      : kept.every((rows) => rows.every((row) => row.event === undefined))
        ? t("library.upload.options.splitNoEvents")
        : t("library.upload.options.splitOneEvent")
    : t("library.upload.options.splitHelp");

  return (
    <BaseDialog
      open
      onClose={onCancel}
      title={intoName === undefined ? t("library.upload.options.title") : t("library.upload.options.intoTitle", { name: intoName })}
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
            disabled={keptCount === 0}
            onClick={() => onImport(kept, splitting)}
            data-testid={id("confirm")}
          >
            {t(intoName === undefined ? "library.upload.options.import" : "library.upload.intoSave")}
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

        {/* Offered on every new-collection import, never on Add games — and
            off with its reason where the split would make one collection per
            file anyway (CTA-127). The reason rides the same description the
            help does, so it is read with the switch. */}
        {intoName === undefined && (
          <SwitchField
            label={t("library.upload.options.split")}
            checked={splitting}
            onChange={setSplitByEvent}
            disabled={!splittable}
            help={splitHelp}
            testId={id("split")}
          />
        )}

        {source.files.length > 1 && (
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

        <Typography variant="body2" role="status" sx={{ fontWeight: 600 }} data-testid={id("count")}>
          {t("library.upload.options.count", { kept: keptCount, count: metadata.games })}
        </Typography>

        {problem !== undefined && (
          <InlineAlert severity="error" testId={id("problem")}>
            {problem}
          </InlineAlert>
        )}
      </Box>
    </BaseDialog>
  );
}

export default CollectionImportDialog;
