import type { ReactNode } from "react";
import Box from "@mui/material/Box";

import { FLAG_URLS } from "./flagUrls";

export type FlagProps = {
  /** The flag's code, as `flag-icons` names it: an ISO 3166 region (`"de"`) or a part of one (`"gb-eng"`). */
  code: string;
  /** Its name — the image's text alternative, and its title on hover ("Germany"). */
  label: string;
  /** What shows in its place for a code with no flag ("FID"). Absent, nothing. */
  fallback?: ReactNode;
  testId?: string;
};

/**
 * **A flag** (CTA-128): a country's flag, 4:3, one text line high, an inline
 * image beside words — `flag-icons`' SVG, the same on every system (an emoji
 * flag is two letters on Windows). A code with no flag shows its `fallback`.
 *
 * Accessible: an image whose text alternative is the country's name, read
 * in its place, and shown on hover; a thin ring in the theme's divider keeps a
 * white flag's edge on a white page.
 */
function Flag({ code, label, fallback, testId }: FlagProps) {
  const url = FLAG_URLS[code.toLowerCase()];
  if (url === undefined) return <>{fallback}</>;
  return (
    <Box
      component="img"
      src={url}
      alt={label}
      title={label}
      data-testid={testId}
      data-flag={code.toLowerCase()}
      sx={(theme) => ({
        display: "inline-block",
        width: "1.33em",
        height: "1em",
        verticalAlign: "-0.15em",
        borderRadius: "2px",
        boxShadow: `0 0 0 1px ${theme.palette.divider}`,
      })}
    />
  );
}

export default Flag;
