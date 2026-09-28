import type { ReactNode } from "react";
import MuiBreadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

import type { VisibleLabel } from "../../a11y";
import { linkProps, type LinkTarget } from "../../link";

/** One step of the chain: a place above the current one. */
export type Crumb = {
  /** Stable, for its test id (`<testId>-<id>`) — a folder's id, `root`. */
  id: string;
  label: VisibleLabel;
  /** Open it — or give a `link`. */
  onClick?: () => void;
  link?: LinkTarget;
};

export type BreadcrumbsProps = {
  /** The places above the current one, the top first. */
  crumbs: readonly Crumb[];
  /** Where the reader is — text, not a link, marked `aria-current="page"`. */
  current: ReactNode;
  /** The trail's accessible name ("Folders"). */
  ariaLabel: string;
  /** Between the steps. Default: MUI's `/`, which reads the same in every language. */
  separator?: ReactNode;
  /** The trail's test id; each crumb is `<testId>-<id>`, the current one `<testId>-current`. */
  testId: string;
};

/**
 * **Where the reader is in a nested tree** (CTA-108) — MUI's `Breadcrumbs`,
 * which the hand-built folder trail re-created (and got the last separator
 * wrong). Every step above is a link-styled button (or a real link); the
 * current place is text. Names take `dir="auto"`, and the trail runs the
 * reading direction's way.
 */
function Breadcrumbs({ crumbs, current, ariaLabel, separator, testId }: BreadcrumbsProps) {
  return (
    <MuiBreadcrumbs aria-label={ariaLabel} separator={separator} data-testid={testId} sx={{ typography: "body2" }}>
      {crumbs.map((crumb) => (
        <Link
          key={crumb.id}
          onClick={crumb.onClick}
          underline="hover"
          color="inherit"
          dir="auto"
          data-testid={`${testId}-${crumb.id}`}
          sx={{ typography: "body2", verticalAlign: "baseline" }}
          {...(crumb.link === undefined ? { component: "button", type: "button" } : linkProps(crumb.link))}
        >
          {crumb.label}
        </Link>
      ))}
      <Typography
        variant="body2"
        aria-current="page"
        dir="auto"
        data-testid={`${testId}-current`}
        sx={{ color: "text.primary", fontWeight: 600 }}
      >
        {current}
      </Typography>
    </MuiBreadcrumbs>
  );
}

export default Breadcrumbs;
