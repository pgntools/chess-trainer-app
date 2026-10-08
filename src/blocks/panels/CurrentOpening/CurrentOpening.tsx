import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import type { OpeningEntry } from "../../../lib/openings";

export type CurrentOpeningProps = {
  /** The opening at the position on screen; `undefined` while unknown or loading. */
  opening: OpeningEntry | undefined;
  /** The book is still loading — "loading", not "unknown". */
  loading: boolean;
  /** Where the ECO chip goes — the Openings explorer at this position. */
  ecoLink: LinkTarget;
  /**
   * One line of text (CTA-148 — the Analysis Board's header): the opening's
   * name, cut with an ellipsis where the row runs out, the full name and its
   * ECO code on hover, a click opening the Openings explorer in a new tab —
   * and **nothing at all** while the opening is unknown or loading. Absent,
   * the name beside the ECO chip and the unknown / loading words, as every
   * other board shows it. The link is `<testId>-eco`.
   */
  oneLine?: boolean;
  /** The root — per board (`analysis-current-opening`, `openings-current`, …); the chip is `<testId>-eco`. */
  testId: string;
};

/**
 * **The opening on screen** (CTA-113; `views/shared/CurrentOpening.tsx`
 * since the board panels had a header) — the one-line name every board
 * carries at the top of its panel, and its ECO code as a chip that is the
 * link into the Openings explorer. Loading and unknown read differently: an
 * unrecognised position is a fact about chess, not an error. The name and
 * the code are pinned left to right.
 *
 * `oneLine` (the Analysis Board's) makes it a single line of link text that
 * gives way with an ellipsis, and nothing when there is no opening to name.
 *
 * Presentational: which opening, and the link, are the screen's
 * (`useCurrentOpening`). Its words are the Openings explorer's
 * (`openings.current.*`).
 */
function CurrentOpening({ opening, loading, ecoLink, oneLine = false, testId }: CurrentOpeningProps) {
  const { t } = useTranslation();
  if (oneLine) {
    if (opening === undefined) return null;
    return (
      <Box data-testid={testId} sx={{ display: "flex", minWidth: 0 }}>
        <Link
          variant="caption"
          dir="ltr"
          noWrap
          underline="hover"
          title={`${opening.eco} · ${opening.name}`}
          aria-label={t("openings.current.openInTab", { name: opening.name, eco: opening.eco })}
          data-testid={`${testId}-eco`}
          sx={{ minWidth: 0, display: "block", textAlign: "start" }}
          {...linkProps(ecoLink)}
          // The explorer opens beside the board, which keeps its place.
          target="_blank"
          rel="noopener noreferrer"
        >
          {opening.name}
        </Link>
      </Box>
    );
  }
  return (
    <Box data-testid={testId} sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      {opening === undefined ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t(loading ? "openings.current.loading" : "openings.current.unknown")}
        </Typography>
      ) : (
        <>
          <Typography variant="subtitle2" dir="ltr" noWrap sx={{ fontWeight: 700 }}>
            {opening.name}
          </Typography>
          <Chip
            size="small"
            dir="ltr"
            label={opening.eco}
            clickable
            aria-label={t("openings.current.open", { eco: opening.eco })}
            data-testid={`${testId}-eco`}
            sx={{ flexShrink: 0 }}
            // A chip is a `div` unless told otherwise: an `href` wants an anchor.
            {...("href" in ecoLink ? { component: "a" } : {})}
            {...linkProps(ecoLink)}
          />
        </>
      )}
    </Box>
  );
}

export default CurrentOpening;
