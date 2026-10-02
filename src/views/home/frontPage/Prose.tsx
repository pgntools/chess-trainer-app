import type { ComponentPropsWithoutRef } from "react";
import { Link as RouterLink } from "react-router";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

/**
 * **The front page's prose, in the theme** (CTA-126) — what the MDX
 * document's Markdown becomes: `#` the page's one `h1` (the screen declares it
 * its own heading, `useOwnPageHeading`), `##` and `###` its sections, a
 * paragraph, a list, a link — each the design's typography rather than the
 * browser's. A link to a path of the app (`[the Library](/library)`) is a
 * router link, so it carries the app's base path; any other is a plain one.
 *
 * Mirroring needs nothing here: every spacing is logical (`paddingInlineStart`),
 * so under Hebrew the page reads right to left like the rest of the app.
 */

export function H1({ children }: ComponentPropsWithoutRef<"h1">) {
  return (
    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
      {children}
    </Typography>
  );
}

export function H2({ children }: ComponentPropsWithoutRef<"h2">) {
  return (
    <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
      {children}
    </Typography>
  );
}

export function H3({ children }: ComponentPropsWithoutRef<"h3">) {
  return (
    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mt: 1.5, mb: 0.5 }}>
      {children}
    </Typography>
  );
}

export function Paragraph({ children }: ComponentPropsWithoutRef<"p">) {
  return (
    <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
      {children}
    </Typography>
  );
}

export function List({ children }: ComponentPropsWithoutRef<"ul">) {
  return (
    <Box component="ul" sx={{ mt: 0, mb: 2, paddingInlineStart: 3, color: "text.secondary" }}>
      {children}
    </Box>
  );
}

export function OrderedList({ children }: ComponentPropsWithoutRef<"ol">) {
  return (
    <Box component="ol" sx={{ mt: 0, mb: 2, paddingInlineStart: 3, color: "text.secondary" }}>
      {children}
    </Box>
  );
}

export function ListItem({ children }: ComponentPropsWithoutRef<"li">) {
  return (
    <Typography component="li" variant="body1">
      {children}
    </Typography>
  );
}

export function Anchor({ href = "", children }: ComponentPropsWithoutRef<"a">) {
  return href.startsWith("/") ? (
    <Link component={RouterLink} to={href}>
      {children}
    </Link>
  ) : (
    <Link href={href}>{children}</Link>
  );
}

export function Rule() {
  return <Divider sx={{ my: 3 }} />;
}
