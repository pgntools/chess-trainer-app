import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { defaultPieces } from "react-chessboard";

import { visuallyHidden } from "../../../design-system/components/a11y";
import type { AchievementPieces } from "../../../lib/achievements/material";
import type { Piece } from "../../../lib/achievements/pieces";
import { achievementNameOf } from "./achievementWords";

const LETTERS: Readonly<Record<Piece, string>> = { pawn: "P", knight: "N", bishop: "B", rook: "R", queen: "Q" };

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
 * **A position's achievements** (CTA-249): one cell per category, its piece
 * (or a dash) over the category's name — each item named whole for a screen
 * reader ("Place in order: Queen"). Its root `testId`, each item
 * `-<category>` (its `data-piece` the piece, `none` without).
 */
export function AchievementRow({ pieces, testId }: { pieces: AchievementPieces; testId: string }) {
  const { t } = useTranslation();
  const nameOf = (category: string, piece: Piece | null) => achievementNameOf(t, category, piece);
  return (
    <Box
      component="ul"
      aria-label={t("accuracyTrainer.achievements.title")}
      data-testid={testId}
      sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 1 }}
    >
      {pieces.map(({ category, piece }) => (
        <Box
          component="li"
          key={category}
          data-testid={`${testId}-${category}`}
          data-piece={piece ?? "none"}
          title={nameOf(category, piece)}
          sx={{ display: "grid", justifyItems: "center", gap: 0.25, textAlign: "center", opacity: piece === null ? 0.6 : 1 }}
        >
          <Box aria-hidden sx={{ display: "grid", justifyItems: "center", gap: 0.25 }}>
            {piece === null ? (
              <Box component="span" sx={{ width: 28, height: 28, display: "grid", placeItems: "center", color: "text.secondary" }}>
                –
              </Box>
            ) : (
              <PieceIcon piece={piece} size={28} />
            )}
            <Typography component="span" variant="caption" sx={{ color: "text.secondary", lineHeight: 1.2 }}>
              {t(`accuracyTrainer.achievements.categories.${category}`)}
            </Typography>
          </Box>
          <Box component="span" sx={visuallyHidden}>
            {nameOf(category, piece)}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
