import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export type LoadingLineProps = {
  /** "Reading your games…". */
  children: ReactNode;
  testId: string;
};

/**
 * **The "reading…" line** (CTA-108) a screen shows while its store's first
 * read has not landed — muted, padded, announced as a `status`. Written out
 * nine times before; this is the one.
 */
function LoadingLine({ children, testId }: LoadingLineProps) {
  return (
    <Typography role="status" data-testid={testId} sx={{ color: "text.secondary", p: 2 }}>
      {children}
    </Typography>
  );
}

export default LoadingLine;
