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
 * paragraph, a list, a link, code, a table (GitHub's Markdown, `remark-gfm` —
 * CTA-174) — each the design's typography rather than the browser's. The Blog's articles are rendered with the same map. A link to a path of the app (`[the Library](/library)`) is a
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

/**
 * A code block — an article showing the markup of its own example. Machine
 * words: pinned left to right (`dir`, which the RTL plugin leaves alone),
 * and wrapped rather than scrolled, so no region needs a keyboard stop.
 */
export function CodeBlock({ children }: ComponentPropsWithoutRef<"pre">) {
  return (
    <Box
      component="pre"
      dir="ltr"
      sx={{
        mt: 0,
        mb: 2,
        p: 1.5,
        borderRadius: 1,
        bgcolor: "action.hover",
        fontFamily: "monospace",
        fontSize: "0.875rem",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        "& code": { bgcolor: "transparent", p: 0 },
      }}
    >
      {children}
    </Box>
  );
}

/** Inline code — a prop's name, a value. Left to right, as a SAN cell is. */
export function InlineCode({ children }: ComponentPropsWithoutRef<"code">) {
  return (
    <Box
      component="code"
      dir="ltr"
      sx={{
        fontFamily: "monospace",
        fontSize: "0.9em",
        // The primary text colour: a paragraph's secondary grey on the code's tint falls short of 4.5:1.
        color: "text.primary",
        bgcolor: "action.hover",
        px: 0.5,
        borderRadius: 0.5,
        unicodeBidi: "isolate",
      }}
    >
      {children}
    </Box>
  );
}

export function Rule() {
  return <Divider sx={{ my: 3 }} />;
}

/**
 * A table (`remark-gfm`, CTA-174) — an article's comparison or reference. Its
 * cells **wrap** rather than the table scrolling sideways, as a code block
 * does, so no region needs a keyboard stop; borders and words from the theme.
 * A column's Markdown alignment (`| ---: |`) arrives as the cell's own `style`
 * and wins over the start alignment here.
 */
export function Table({ children }: ComponentPropsWithoutRef<"table">) {
  return (
    <Box
      component="table"
      sx={{
        width: "100%",
        borderCollapse: "collapse",
        mt: 0.5,
        mb: 2,
        typography: "body2",
        color: "text.secondary",
      }}
    >
      {children}
    </Box>
  );
}

export function TableHeaderCell({ children, style }: ComponentPropsWithoutRef<"th">) {
  return (
    <Box
      component="th"
      style={style}
      sx={{
        textAlign: "start",
        verticalAlign: "bottom",
        fontWeight: 600,
        color: "text.primary",
        borderBottom: 2,
        borderColor: "divider",
        px: 1,
        py: 0.75,
      }}
    >
      {children}
    </Box>
  );
}

export function TableCell({ children, style }: ComponentPropsWithoutRef<"td">) {
  return (
    <Box
      component="td"
      style={style}
      sx={{
        textAlign: "start",
        verticalAlign: "top",
        borderBottom: 1,
        borderColor: "divider",
        px: 1,
        py: 0.75,
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </Box>
  );
}
