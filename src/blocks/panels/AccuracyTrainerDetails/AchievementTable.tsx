import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { defaultPieces } from "react-chessboard";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { useChessTokens } from "../../../design-system/theme";
import type { AchievementCategoryId } from "../../../lib/achievements/categories";
import type { AchievementPieces } from "../../../lib/achievements/material";
import { PIECES, type Piece } from "../../../lib/achievements/pieces";
import { achievementNameOf } from "./achievementWords";

const LETTERS: Readonly<Record<Piece, string>> = { pawn: "P", knight: "N", bishop: "B", rook: "R", queen: "Q" };

/** A piece cell's side — the icon, and room around it. */
const CELL_PX = 32;

/** A colour per colour scheme — a `chess.achievements` token. */
type Tint = { light: string; dark: string };

/**
 * **A piece, drawn** (CTA-249) — the board's own piece set (`defaultPieces`,
 * as the captured-pieces strip draws it), White's, at `size` pixels; with a
 * `tint`, filled with it — each scheme's shade (an SVG fill takes no CSS
 * variable, so one drawing per scheme, the other hidden). Hidden from a
 * screen reader: whatever shows it names it in words.
 */
export function PieceIcon({ piece, size = 24, tint }: { piece: Piece; size?: number; tint?: Tint }) {
  const render = defaultPieces[`w${LETTERS[piece]}`];
  const drawn = (fill?: string) => render?.({ svgStyle: { width: "100%", height: "100%" }, ...(fill === undefined ? {} : { fill }) }) ?? LETTERS[piece];
  const box = { display: "inline-block", width: size, height: size, lineHeight: 0, flexShrink: 0 } as const;
  if (tint === undefined) {
    return (
      <Box component="span" aria-hidden sx={box}>
        {drawn()}
      </Box>
    );
  }
  return (
    <Box component="span" aria-hidden sx={{ ...box, position: "relative" }}>
      <Box component="span" sx={(theme) => ({ ...box, ...theme.applyStyles("dark", { display: "none" }) })}>
        {drawn(tint.light)}
      </Box>
      <Box component="span" sx={(theme) => ({ ...box, display: "none", ...theme.applyStyles("dark", { display: "inline-block" }) })}>
        {drawn(tint.dark)}
      </Box>
    </Box>
  );
}

/** **A category's colour, as a swatch** (CTA-249) — the key to its pieces' fill. Hidden from a screen reader. */
export function CategorySwatch({ category }: { category: AchievementCategoryId }) {
  const tint = useChessTokens().achievements[category];
  return (
    <Box
      component="span"
      aria-hidden
      sx={(theme) => ({
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "2px",
        flexShrink: 0,
        bgcolor: tint.light,
        ...theme.applyStyles("dark", { bgcolor: tint.dark }),
      })}
    />
  );
}

/**
 * **A position's achievements, as a table** (CTA-249): a row per category,
 * its colour's swatch and name, then the five pieces, Pawn to Queen — the
 * one won filled with its category's colour (`chess.achievements`) on a
 * highlighted cell, the others dimmed, grey, as disabled. Read by a screen
 * reader as a table: each row header says the category and its piece
 * ("Place in order: Queen"), each cell its piece (the column) and whether
 * it was won. Its root `testId`; a row `-<category>` (its `data-piece` the
 * piece won, `none` without), a cell `-<category>-<piece>` (`data-won`).
 */
export function AchievementTable({ pieces, testId }: { pieces: AchievementPieces; testId: string }) {
  const { t } = useTranslation();
  const tints = useChessTokens().achievements;
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
              <Box component="span" aria-hidden sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <CategorySwatch category={category} />
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
                    borderColor: got ? "divider" : "transparent",
                    bgcolor: got ? "action.selected" : "transparent",
                  }}
                >
                  <Box component="span" sx={{ display: "inline-flex", opacity: got ? 1 : 0.25, filter: got ? "none" : "grayscale(1)" }}>
                    <PieceIcon piece={piece} size={26} {...(got ? { tint: tints[category] } : {})} />
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

/**
 * **What each piece won means** (CTA-249) — under the table, a line per
 * category that won one, in the registry's order: its piece in its colour,
 * the category and the piece, then what the answer did to earn it
 * (`accuracyTrainer.achievements.explain.<category>.<piece>`, X the
 * session's *Moves to find*). None won, a line saying so. Its root `testId`,
 * each line `-<category>`, none `-none`.
 */
export function AchievementNotes({ pieces, wanted, testId }: { pieces: AchievementPieces; wanted: number; testId: string }) {
  const { t } = useTranslation();
  const tints = useChessTokens().achievements;
  const won = pieces.flatMap(({ category, piece }) => (piece === null ? [] : [{ category, piece }]));
  if (won.length === 0) {
    return (
      <Box component="p" data-testid={`${testId}-none`} sx={{ m: 0, typography: "body2", color: "text.secondary" }}>
        {t("accuracyTrainer.achievements.explainNone")}
      </Box>
    );
  }
  return (
    <Box component="ul" aria-label={t("accuracyTrainer.achievements.explainTitle")} data-testid={testId} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1 }}>
      {won.map(({ category, piece }) => (
        <Box component="li" key={category} data-testid={`${testId}-${category}`} sx={{ display: "grid", gridTemplateColumns: "20px 1fr", columnGap: 1, alignItems: "start" }}>
          <Box component="span" sx={{ pt: "1px" }}>
            <PieceIcon piece={piece} size={20} tint={tints[category]} />
          </Box>
          <Box component="span" sx={{ typography: "body2" }}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              {achievementNameOf(t, category, piece)}
            </Box>
            {" — "}
            {t(`accuracyTrainer.achievements.explain.${category}.${piece}`, { count: wanted })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
