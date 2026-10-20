import type { TFunction } from "i18next";

import type { Piece } from "../../../lib/achievements/pieces";

/** A category's piece in words — "Place in order: Queen", or "Place in order: no piece" (CTA-249). */
export const achievementNameOf = (t: TFunction, category: string, piece: Piece | null): string => {
  const name = t(`accuracyTrainer.achievements.categories.${category}`);
  return piece === null
    ? t("accuracyTrainer.achievements.none", { category: name })
    : t("accuracyTrainer.achievements.won", { category: name, piece: t(`accuracyTrainer.achievements.pieces.${piece}`) });
};
