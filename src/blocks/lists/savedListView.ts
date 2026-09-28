import type { CardSize } from "../../design-system/components/cards";

/**
 * **How a saved list is drawn** (CTA-113) — the list, or preview boards at
 * one of the two card sizes: what the saved analyses and the repertoires
 * both offer (`ViewToggle`), the list by default.
 */
export type SavedListView = "list" | Extract<CardSize, "compact" | "comfortable">;

export const SAVED_LIST_VIEWS: readonly SavedListView[] = ["list", "compact", "comfortable"];

export const SAVED_LIST_DEFAULT_VIEW: SavedListView = "list";
