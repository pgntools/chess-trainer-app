import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { SelectField, SideToggle } from "../../../design-system/components/forms";
import type { PlayedGameSideFilter } from "./sideFilter";

export type PlayedGamesFiltersProps = {
  /** The side the reader played, or either. */
  side: PlayedGameSideFilter;
  onSideChange: (side: PlayedGameSideFilter) => void;
  /** The opening chosen — `null` for all of them. A name no game reached still shows as chosen. */
  opening: string | null;
  onOpeningChange: (opening: string | null) => void;
  /** The openings on offer: those the games reached, in order. */
  openings: readonly string[];
  /** The book (~3 MB) is still loading: the opening filter is off and says so. */
  openingsLoading: boolean;
  /**
   * The prefix of its ids: the bar is `<testId>-filters`, the side
   * `<testId>-filter-color` (its buttons `-all`, `-white`, `-black`), the
   * opening `<testId>-filter-opening` (its options `-option`).
   */
  testId: string;
};

/**
 * **The Lobby's filters** (CTA-109; CTA-82's) — the side the reader played
 * (All / White / Black) and the opening each game reached (the deepest one
 * the book names along its mainline), a wrapping row above the table.
 * Presentational: the choices, the openings on offer and whether the book has
 * landed are props; the Lobby keeps both in its URL (`?color=`, `?opening=`).
 */
function PlayedGamesFilters({ side, onSideChange, opening, onOpeningChange, openings, openingsLoading, testId }: PlayedGamesFiltersProps) {
  const { t } = useTranslation();
  return (
    <Box data-testid={`${testId}-filters`} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
      <SideToggle<PlayedGameSideFilter>
        withAll
        value={side}
        onChange={onSideChange}
        labels={{ all: t("playedGames.filters.all"), white: t("playedGames.filters.white"), black: t("playedGames.filters.black") }}
        ariaLabel={t("playedGames.filters.color")}
        testId={`${testId}-filter-color`}
      />
      <Box sx={{ flex: "1 1 220px", maxWidth: 360 }}>
        <SelectField
          fullWidth
          label={t("playedGames.filters.opening")}
          value={opening ?? ""}
          onChange={(value) => onOpeningChange(value === "" ? null : value)}
          options={openings.map((name) => ({ value: name, label: name }))}
          emptyOption={t("playedGames.filters.allOpenings")}
          helperText={openingsLoading ? t("playedGames.filters.openingLoading") : undefined}
          disabled={openingsLoading}
          optionDir="auto"
          testId={`${testId}-filter-opening`}
        />
      </Box>
    </Box>
  );
}

export default PlayedGamesFilters;
