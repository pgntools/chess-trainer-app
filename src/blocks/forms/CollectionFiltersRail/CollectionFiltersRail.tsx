import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import { useTranslation } from "react-i18next";

import { IconAction } from "../../../design-system/components/toolbars";
import { activeFilterCount, type CollectionFilterValues } from "../../../lib/libraryCollections";

export type CollectionFiltersRailProps = {
  /** The filters as they are — the table's URL state; the badge counts the ones on. */
  values: CollectionFilterValues;
  /** Open the panel again. */
  onExpand: () => void;
  /** The rail's root; its button is `<testId>-expand`. */
  testId: string;
};

/**
 * **A collection's filters, folded** (CTA-230) — what the right-hand rail of
 * `/library/<collection>` holds while the reader has folded the
 * `CollectionFilters` panel away for the table's sake: one button that opens
 * it again (`aria-expanded` false), a badge on its icon counting the filters
 * still on (`activeFilterCount` — the players, the side, the opening, the
 * event, the date range, the result and the opening line; none, no badge), so
 * a filtered table says so while folded. The count is in the button's name
 * too ("Show filters — 2 filters on"), which a screen reader reads in the
 * badge's place.
 *
 * Presentational: the values and the expand are props; its words are the
 * Library's catalog keys (`library.filters.*`).
 */
function CollectionFiltersRail({ values, onExpand, testId }: CollectionFiltersRailProps) {
  const { t } = useTranslation();
  const count = activeFilterCount(values);
  const icon = <FilterListRoundedIcon fontSize="small" />;
  return (
    // Room above the button for the badge, which stands out of its corner.
    <Box data-testid={testId} sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 1 }}>
      <IconAction
        label={count === 0 ? t("library.filters.expand") : t("library.filters.expandActive", { count })}
        onClick={onExpand}
        expanded={false}
        testId={`${testId}-expand`}
      >
        {count === 0 ? (
          icon
        ) : (
          <Badge badgeContent={count} color="primary" max={9}>
            {icon}
          </Badge>
        )}
      </IconAction>
    </Box>
  );
}

export default CollectionFiltersRail;
