import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';

/**
 * **The shell's one breakpoint** (CTA-118, WCAG 1.4.10 Reflow). Below it the
 * window has no room for a 280px rail beside a board beside a 320px panel —
 * at 320 CSS px, which is a 1280px window at 400% zoom, it had none for any
 * of them and `main` came out 0px wide. Under it the rail becomes a drawer
 * off the header and the panel stacks under the square; above it the shell is
 * exactly what it was.
 *
 * One breakpoint rather than two: the rail and the panel are the same 280 +
 * 320 px of fixed chrome, so they stop fitting together.
 */
const SHELL_COMPACT_BREAKPOINT = 'md';

/**
 * Whether the window is under the shell's breakpoint — what the shell asks,
 * and what a screen asks that has a part of its own to fold into a drawer
 * there (the Analysis Board's sibling panel, CTA-145).
 */
export const useShellCompact = (): boolean =>
    useMediaQuery((theme: Theme) => theme.breakpoints.down(SHELL_COMPACT_BREAKPOINT));
