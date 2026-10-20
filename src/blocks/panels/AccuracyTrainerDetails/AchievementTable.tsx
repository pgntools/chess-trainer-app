import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { defaultPieces } from "react-chessboard";

import { visuallyHidden } from "../../../design-system/components/a11y";
import type { AchievementPieces } from "../../../lib/achievements/material";
import { PIECES, type Piece } from "../../../lib/achievements/pieces";
import { achievementNameOf } from "./achievementWords";

const LETTERS: Readonly<Record<Piece, string>> = { pawn: "P", knight: "N", bishop: "B", rook: "R", queen: "Q" };

/** A piece cell's side — the icon, and room around it. */
const CELL_PX = 32;

/**
 * **A piece, drawn** (CTA-249) — the board's own piece set (`defaultPieces`,
 * as the captured-pieces strip draws it), White's, at `size` pixels. Hidden
 * from a screen reader: whatever shows it names it in words.
 */
export function PieceIcon({ piece, size = 24 }: { piece: Piece; size?: number }) {
  const render = defaultPieces[`w${LETTERS[piece]}`];
  return (
    <Box component="span" aria-hidden sx={{ display: "inline-block", width: size, height: size, lineHeight: 0, flexShrink: 0 }}>
      {render?.({ svgStyle: { width: "100%", height: "100%" } }) ?? LETTERS[piece]}
    </Box>
  );
}

/**
 * **A position's achievements, as a table** (CTA-249): a row per category,
 * its name then the five pieces, Pawn to Queen — the one won drawn in full
 * on a highlighted cell, the others dimmed as disabled. Read by a screen
 * reader as a table: each row header says the category and its piece
 * ("Place in order: Queen"), each cell its piece (the column) and whether
 * it was won. Its root `testId`; a row `-<category>` (its `data-piece` the
 * piece won, `none` without), a cell `-<category>-<piece>` (`data-won`).
 */
export function AchievementTable({ pieces, testId }: { pieces: AchievementPieces; testId: string }) {
  const { t } = useTranslation();
  return (
    <Box
      component="table"
      aria-label={t("accuracyTrainer.achievements.title")}
      data-testid={testId}
      sx={{ borderCollapse: "separate", borderSpacing: "2px 4px", width: "100%" }}
    >
      {/* The columns are named for a screen reader; seen, the pieces name themselves. */}
      <Box component="thead" sx={visuallyHidden}>
        <tr>
          <th scope="col">{t("accuracyTrainer.achievements.category")}</th>
          {PIECES.map((piece) => (
            <th key={piece} scope="col">
              {t(`accuracyTrainer.achievements.pieces.${piece}`)}
            </th>
          ))}
        </tr>
      </Box>
      <tbody>
        {pieces.map(({ category, piece: won }) => (
          <Box component="tr" key={category} data-testid={`${testId}-${category}`} data-piece={won ?? "none"}>
            <Box
              component="th"
              scope="row"
              sx={{ textAlign: "start", fontWeight: 400, typography: "body2", paddingInlineEnd: 1, whiteSpace: "nowrap", color: won === null ? "text.secondary" : "text.primary" }}
            >
              <Box component="span" aria-hidden>
                {t(`accuracyTrainer.achievements.categories.${category}`)}:
              </Box>
              <Box component="span" sx={visuallyHidden}>
                {achievementNameOf(t, category, won)}
              </Box>
            </Box>
            {PIECES.map((piece) => {
              const got = piece === won;
              return (
                <Box
                  component="td"
                  key={piece}
                  data-testid={`${testId}-${category}-${piece}`}
                  data-won={got}
                  sx={{
                    width: CELL_PX,
                    height: CELL_PX,
                    p: 0,
                    textAlign: "center",
                    verticalAlign: "middle",
                    borderRadius: 1,
                    border: 1,
                    borderColor: got ? "primary.main" : "transparent",
                    bgcolor: got ? "action.selected" : "transparent",
                  }}
                >
                  <Box component="span" sx={{ display: "inline-flex", opacity: got ? 1 : 0.25, filter: got ? "none" : "grayscale(1)" }}>
                    <PieceIcon piece={piece} size={26} />
                  </Box>
                  <Box component="span" sx={visuallyHidden}>
                    {t(got ? "accuracyTrainer.achievements.cellWon" : "accuracyTrainer.achievements.cellNotWon")}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
      </tbody>
    </Box>
  );
}
