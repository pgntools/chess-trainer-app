import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";

import { AnchoredMenu } from "../../../design-system/components/menus";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import { contrastSummary, formatRatio, type ContrastCheck } from "../../../design-system/themes";
import { SECTIONS, sectionOfToken } from "./sections";

const sectionTitleOf = (token: string) => SECTIONS.find((section) => section.id === sectionOfToken(token))?.title ?? "Theme";

/** A check in words: where it is, what was measured, and how it came out. */
const checkWords = (check: ContrastCheck) => `${sectionTitleOf(check.token)} — ${check.label}: ${formatRatio(check.ratio)}, needs ${check.minimum}:1`;

type ContrastSummaryProps = {
  checks: readonly ContrastCheck[];
  /** Go to the field of the token a check measures. */
  onJump: (check: ContrastCheck) => void;
};

/**
 * **The contrast summary** — always in view: how many checks pass and fail,
 * as a live `status`; with a failure, a button whose menu lists every
 * failing check and goes to its token.
 */
export function ContrastSummary({ checks, onJump }: ContrastSummaryProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const summary = contrastSummary(checks);
  const failed = checks.filter((check) => !check.pass);
  const tone = summary.requiredFail > 0 ? "error" : summary.fail > 0 ? "warning" : "success";
  const Icon = tone === "error" ? ErrorRoundedIcon : tone === "warning" ? WarningRoundedIcon : CheckCircleRoundedIcon;
  const words = `Contrast: ${summary.pass} pass, ${summary.fail} fail${summary.fail > 0 ? ` (${summary.requiredFail} required)` : ""}`;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box role="status" data-testid="theme-editor-contrast-summary" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: `${tone}.main` }}>
        <Icon fontSize="small" aria-hidden="true" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {words}
        </Typography>
      </Box>
      {failed.length > 0 && (
        <>
          <Button
            size="small"
            variant="outlined"
            color={tone === "error" ? "error" : "warning"}
            aria-haspopup="menu"
            aria-expanded={anchor !== null}
            onClick={(event) => setAnchor(event.currentTarget)}
            data-testid="theme-editor-contrast-failures"
          >
            Go to a failure
          </Button>
          <AnchoredMenu
            anchorEl={anchor}
            onClose={() => setAnchor(null)}
            entries={failed.map((check) => ({
              id: check.id,
              label: checkWords(check),
              onClick: () => {
                setAnchor(null);
                onJump(check);
              },
            }))}
            testId="theme-editor-contrast-menu"
          />
        </>
      )}
    </Box>
  );
}

type Column = "outcome" | "check" | "scheme" | "ratio" | "minimum" | "level";

const COLUMNS: readonly DataTableColumn<ContrastCheck, Column>[] = [
  { id: "outcome", header: "Outcome", render: (check) => (check.pass ? "Passes" : "Fails") },
  { id: "check", header: "Check", wrap: true, render: (check) => `${sectionTitleOf(check.token)} — ${check.label}` },
  { id: "scheme", header: "Scheme", render: (check) => check.scheme ?? "both" },
  { id: "ratio", header: "Ratio", align: "end", dir: "ltr", render: (check) => formatRatio(check.ratio) },
  { id: "minimum", header: "Needs", align: "end", dir: "ltr", render: (check) => `${check.minimum}:1` },
  { id: "level", header: "Level", render: (check) => (check.level === "required" ? "Required" : "Advisory") },
];

/**
 * **The contrast report in full** — every check, the failures first; a row
 * (a click, or Enter on it) goes to its token's field. The required checks
 * are what `contrast.test.ts` holds a registered theme to; the advisory ones
 * are the board's.
 */
export function ContrastTable({ checks, onJump }: ContrastSummaryProps) {
  const rows = [...checks].sort((a, b) => Number(a.pass) - Number(b.pass));
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      rowId={(check) => check.id}
      ariaLabel="The contrast checks"
      onRowClick={onJump}
      emptyLabel="No checks."
      density="dense"
      stickyHeader={false}
      testId="theme-editor-contrast-table"
    />
  );
}

