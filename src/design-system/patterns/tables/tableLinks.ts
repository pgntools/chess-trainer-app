import type { Theme } from "@mui/material/styles";

import { linkProps, type LinkTarget } from "../../components/link";

/*
  How a competition table's links are drawn (CTA-128) — the standings, the
  crosstable and the bracket alike.
*/

/** A link in a competition table: the theme's ring on focus, underlined on hover only — the cell says it is one by its colour and its pointer. */
export const linkSx = (theme: Theme) => ({ "&:focus-visible": { ...theme.mixins.focusRing, outlineOffset: 1 } });

/** A link's element and its target: react-router's `Link` and its `to`, or an anchor's `href` (`linkProps`). */
export const asLink = (link: LinkTarget) => linkProps(link) as Record<string, unknown>;
