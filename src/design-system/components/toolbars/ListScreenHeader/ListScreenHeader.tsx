import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type ListScreenHeaderProps = {
  title: ReactNode;
  /** The caption under the title — "12 games", "3 of 12". */
  count?: ReactNode;
  /** A back button, first in the row (a `BackButton`). */
  back?: ReactNode;
  /** The screen's actions, at the row's end. */
  actions?: ReactNode;
  /** Let the actions wrap under the title on a narrow square (the saved lists). */
  wrap?: boolean;
  /** A second row under the first — filters, a search box. */
  children?: ReactNode;
  /** The title's direction: `auto` for a name the reader typed. */
  titleDir?: "auto" | "ltr" | "rtl";
  /** The root's test id; the parts are `-title`, `-count` and `-actions`. */
  testId: string;
};

/**
 * **A list screen's top bar** (CTA-108): back, the title over its count,
 * the actions — over a bottom divider, fixed above the one region that
 * scrolls. Five screens wrote it with three spacings; this is the one
 * (`pb: 1.5`, `mb: 0.5`, `gap: 1`). The title is the screen's heading (`h1`).
 */
function ListScreenHeader({ title, count, back, actions, wrap = false, children, titleDir, testId }: ListScreenHeaderProps) {
  return (
    <Box
      data-testid={testId}
      sx={{ flexShrink: 0, pb: 1.5, mb: 0.5, borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: wrap ? "wrap" : "nowrap" }}>
        {back}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            component="h1"
            dir={titleDir}
            noWrap={!wrap}
            data-testid={`${testId}-title`}
            sx={{ fontWeight: 700, lineHeight: 1.3 }}
          >
            {title}
          </Typography>
          {count !== undefined && (
            <Typography
              variant="caption"
              data-testid={`${testId}-count`}
              sx={{ display: "block", color: "text.secondary" }}
            >
              {count}
            </Typography>
          )}
        </Box>
        {actions !== undefined && (
          <Box
            data-testid={`${testId}-actions`}
            sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, flexWrap: wrap ? "wrap" : "nowrap" }}
          >
            {actions}
          </Box>
        )}
      </Box>
      {children !== undefined && <Box sx={{ mt: 1.25 }}>{children}</Box>}
    </Box>
  );
}

export default ListScreenHeader;
