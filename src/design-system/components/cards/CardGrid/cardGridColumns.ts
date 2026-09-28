/** A card's least width: `compact` 160 px, `medium` 220 px (Home), `comfortable` 260 px. */
export type CardSize = "compact" | "medium" | "comfortable";

const MIN_WIDTH: Record<CardSize, number> = { compact: 160, medium: 220, comfortable: 260 };

/**
 * A card grid's `grid-template-columns` at a size (CTA-113, the saved lists'
 * `cardSizeTrack`): as many columns as fit, none narrower than the size's
 * least width — or than the grid itself, so a card never overflows a square
 * narrower than one card.
 */
export const cardGridColumns = (size: CardSize): string => `repeat(auto-fill, minmax(min(${MIN_WIDTH[size]}px, 100%), 1fr))`;
