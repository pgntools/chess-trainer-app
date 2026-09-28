import { useTheme, type Theme } from "@mui/material/styles";

import { defaultTheme } from "../themes/default";
import type { ChessTokens } from "../themes/types";
import "./augment";

/**
 * The board's colours under `theme` — its own when `buildTheme` made it, the
 * default theme's otherwise (MUI's bare theme, in a test rendered without the
 * app's provider), so a board always has every colour it draws.
 */
export const chessTokensOf = (theme: Theme): ChessTokens => theme.chess ?? defaultTheme.chess;

/** {@link chessTokensOf} for the theme in context — how a board reads its colours. */
export const useChessTokens = (): ChessTokens => chessTokensOf(useTheme());
