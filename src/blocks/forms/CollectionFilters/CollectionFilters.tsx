import type { ReactNode } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { ChipsAutocomplete, SelectAutocomplete } from "../../../design-system/components/autocompletes";
import { DateRangeFields, SelectField, SideToggle } from "../../../design-system/components/forms";
import {
  COLLECTION_FILTER_PARAMS,
  type CollectionFacets,
  type CollectionFilterValues,
} from "../../../lib/libraryCollections";

export type CollectionFiltersProps = {
  /** What the collection's games hold — a filter shows only where they hold its field. */
  facets: CollectionFacets;
  /** The filters as they are — the table's URL state. */
  values: CollectionFilterValues;
  onChange: (patch: Partial<CollectionFilterValues>) => void;
  /** Take every filter off. */
  onClear: () => void;
  /** Between the players and the rest: the opening-moves board (the screen's — it is a board). Absent, nothing. */
  openingBoard?: ReactNode;
  /**
   * The fields' prefix: `library-filter-player`, `-color` (its
   * buttons `-color-all`, `-white`, `-black`), `-opening`, `-event`,
   * `-from`, `-to`, `-clear`, and the result's `library-table-result` — the
   * ids the Library's tests have always used.
   */
  testId: string;
  /** The root's own id (the Library's `library-filters`). Absent, `testId`. */
  rootTestId?: string;
};

/**
 * **A collection's filters** (CTA-113; the panel of CTA-75) — the
 * right-hand panel of `/library/<collection>`: players (several names at
 * once, CTA-95, a `ChipsAutocomplete`) and the side any of them had (a
 * `SideToggle` with "any"), then the screen's opening-moves board, then the
 * opening (free text or an ECO code's start), the event (a
 * `SelectAutocomplete`), a date range inside the collection's first and last
 * game (`DateRangeFields`) and the result (a `SelectField`).
 *
 * **A filter is shown only where the collection has its field**
 * (`collectionFacetsOf`): an upload with no dates gets no date range, one
 * event gets no event picker. A PGN date is often partial — `1848`,
 * `1858.10` — so a game counts as in range when any day it could have been
 * played is (`dateBounds`).
 *
 * Presentational: the values and every change are props; its words are the
 * Library's catalog keys (`library.filters.*`).
 */
function CollectionFilters({ facets, values, onChange, onClear, openingBoard, testId, rootTestId = testId }: CollectionFiltersProps) {
  const { t } = useTranslation();
  // Any filter on: the player filter holds its names as an array, the rest are strings.
  const active = COLLECTION_FILTER_PARAMS.some((key) => {
    const value = values[key];
    return typeof value === "string" ? value !== "" : value.length > 0;
  });
  const id = (part: string) => `${testId}-${part}`;

  return (
    <Box data-testid={rootTestId} sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle2" component="h2" sx={{ flexGrow: 1, fontWeight: 700 }}>
          {t("library.filters.title")}
        </Typography>
        <Button size="small" disabled={!active} onClick={onClear} data-testid={id("clear")}>
          {t("library.filters.clear")}
        </Button>
      </Box>

      {facets.players.length > 0 && (
        <Box sx={{ display: "grid", gap: 1 }}>
          <ChipsAutocomplete
            label={t("library.filters.player")}
            value={values.player}
            onChange={(player) => onChange({ player })}
            options={facets.players}
            limitTags={1}
            testId={id("player")}
          />
          <SideToggle<"all" | "white" | "black">
            withAll
            fullWidth
            value={values.color === "" ? "all" : values.color}
            onChange={(side) => onChange({ color: side === "all" ? "" : side })}
            labels={{ all: t("library.filters.anyColor"), white: t("library.filters.asWhite"), black: t("library.filters.asBlack") }}
            disabled={values.player.length === 0}
            ariaLabel={t("library.filters.color")}
            testId={id("color")}
          />
        </Box>
      )}

      {openingBoard}

      {facets.openings.length > 0 && (
        // Free text or a suggestion — an ECO code's start narrows to its family.
        <Autocomplete
          freeSolo
          size="small"
          options={facets.openings}
          value={values.opening}
          inputValue={values.opening}
          onChange={(_event, value) => onChange({ opening: value ?? "" })}
          onInputChange={(_event, value, reason) => {
            if (reason === "input" || reason === "clear") onChange({ opening: value });
          }}
          data-testid={id("opening")}
          renderInput={(params) => (
            <TextField {...params} label={t("library.filters.opening")} helperText={t("library.filters.openingHelp")} />
          )}
        />
      )}

      {facets.events.length > 1 && (
        <SelectAutocomplete
          label={t("library.filters.event")}
          value={values.event === "" ? null : values.event}
          onChange={(event) => onChange({ event: event ?? "" })}
          options={facets.events.map((event) => ({ value: event, label: event }))}
          testId={id("event")}
        />
      )}

      {facets.dates !== undefined && (
        <DateRangeFields
          value={{ from: values.from, to: values.to }}
          onChange={({ from, to }) => onChange({ from, to })}
          fromLabel={t("library.filters.from")}
          toLabel={t("library.filters.to")}
          bounds={facets.dates}
          testId={id("dates")}
          inputTestIds={{ from: id("from"), to: id("to") }}
        />
      )}

      {facets.results.length > 1 && (
        <SelectField
          label={t("library.table.result")}
          value={values.result}
          onChange={(result) => onChange({ result })}
          emptyOption={t("library.table.anyResult")}
          options={facets.results.map((result) => ({ value: result, label: result }))}
          optionDir="ltr"
          testId="library-table-result"
        />
      )}
    </Box>
  );
}

export default CollectionFilters;
