import type { ElementType } from "react";

/**
 * **Where a clickable part goes, when it goes somewhere** (CTA-108). The
 * design system knows no route, so a component that can be a link takes one
 * of these instead of importing a router: a screen passes react-router's
 * `Link` as `component` with its `to` (and `state`), or a plain `href`.
 *
 * ```tsx
 * <IconAction link={{ component: RouterLink, to: "/engine/games" }} … />
 * ```
 */
export type LinkTarget =
  | { component: ElementType; to: string; state?: unknown; replace?: boolean }
  | { href: string; target?: string; rel?: string };

/**
 * The props a `ButtonBase`-derived MUI component (a `Button`, an
 * `IconButton`, a `ListItemButton`, a `CardActionArea`, a `Tab`, a
 * `MenuItem`) takes to render as `link` — `component` and its `to`, or an
 * anchor's `href`. `undefined` gives nothing, so the part stays a button.
 */
export const linkProps = (link: LinkTarget | undefined): Record<string, unknown> => {
  if (link === undefined) return {};
  if ("href" in link) return { href: link.href, target: link.target, rel: link.rel };
  return { component: link.component, to: link.to, state: link.state, replace: link.replace };
};
