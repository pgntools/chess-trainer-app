import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import { useTranslation } from "react-i18next";

import { BaseDialog } from "../../../design-system/components/dialogs";
import type { LinkTarget } from "../../../design-system/components/link";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { IconAction } from "../../../design-system/components/toolbars";
import type { CaseRow } from "../../../lib/analysisCaseRows";
import type { Game } from "../../../lib/gameModel";
import { GameInfo } from "../GameInfo";

/** The view's tabs, in order. */
export type CaseDetailsTab = "info" | "settings" | "graph" | "display" | "jobs";

export type CaseDetailsProps = {
  /** The Case on the board. */
  row: CaseRow;
  /** Its game, for the Info tab's PGN tags — none for a Case that carries no tags. */
  game: Game | undefined;
  /** The Settings tab's content (CTA-199; alone since CTA-211) — the board's settings, the screen's (`CaseSettingsTab`). Absent, empty. */
  settings?: ReactNode;
  /**
   * The Graph tab's content — the eval graph and report of the tree on the
   * board. Absent while the tree carries no `[%eval]`: the tab is disabled.
   */
  graph?: ReactNode;
  /** The Display tab's content — how the board draws, the screen's. Absent, no such tab. */
  display?: ReactNode;
  /**
   * The Case's links and Link a case (CTA-188; `CaseLinks`, the screen's) —
   * since CTA-211 a dialog opened by the Info tab's "Linked cases (n)".
   * Absent, no such button.
   */
  links?: ReactNode;
  /** How many links the Case has, both ways — the button's count. */
  linkCount?: number;
  /** The Jobs tab's content (CTA-188) — the Case's jobs and New job, the screen's (`EntityJobs`, CTA-221). Absent, no such tab. */
  jobs?: ReactNode;
  /** The open tab — the screen's (which opens every Case on Info, CTA-211). A tab not given (Graph disabled) reads as Info. */
  tab: CaseDetailsTab;
  onTabChange: (tab: CaseDetailsTab) => void;
  /** Where Back goes — the Project's Cases, the list beside the board. */
  backLink: LinkTarget;
  /** The previous / next Case in the list's order — `undefined` at an end. */
  previous: LinkTarget | undefined;
  next: LinkTarget | undefined;
  /**
   * The root; its parts `-back`, `-title`, `-tabs` (each tab `-tab-<id>`),
   * `-info` (the tags, each `-info-<Tag>`, none `-info-empty`; the button
   * `-links-open`, its dialog `-links-dialog`, the links in it `-links`),
   * `-settings`, `-graph`, `-display`, `-jobs`, `-siblings`, `-previous`, `-next`.
   */
  testId: string;
};

/**
 * **A Case's own view beside its board** (CTA-186) — the second screen of
 * the Case board's left panel, opened from a row of the Project's Cases
 * (`CaseSiblings`): Back to that list at the head's start — where the list
 * has Close — the Case's name and type, its details in tabs — **Info**
 * (CTA-211, first: the PGN tags — `GameInfo`, the Library game board's Info
 * tab — then a **Linked cases (n)** button opening its links and Link a case
 * in a dialog, the screen's, CTA-188), **Settings** (the board's settings,
 * the screen's, CTA-199), **Graph**, the
 * board's eval graph and report (the screen's, disabled while the tree has no
 * evaluations, as the Analysis Board's Evaluations tab), **Display**, how
 * the board draws (the screen's), **Jobs**, the Case's jobs (CTA-188; the Jobs module's since CTA-221, the
 * screen's) — and previous / next at its foot, sticky as the list's.
 * Presentational: the game, the graph, the display, the open tab and the links arrive from
 * the screen; its words are `analysisV2.caseDetails.*`.
 */
function CaseDetails({ row, game, settings, graph, display, links, linkCount, jobs, tab: asked, onTabChange, backLink, previous, next, testId }: CaseDetailsProps) {
  const { t } = useTranslation();
  const tab: CaseDetailsTab =
    (asked === "graph" && graph === undefined) || (asked === "display" && display === undefined) || (asked === "jobs" && jobs === undefined)
      ? "info"
      : asked;
  // The Linked cases dialog — the view's own; a step to another Case mounts a new view, closed.
  const [linksOpen, setLinksOpen] = useState(false);
  // The arrows point along the reading direction, which runs right to left under RTL.
  const rtl = useTheme().direction === "rtl";
  const Back = rtl ? ArrowForwardRoundedIcon : ArrowBackRoundedIcon;
  const Previous = rtl ? NavigateNextRoundedIcon : NavigateBeforeRoundedIcon;
  const Next = rtl ? NavigateBeforeRoundedIcon : NavigateNextRoundedIcon;
  const TypeIcon = row.type === "game" ? SportsEsportsOutlinedIcon : ExtensionOutlinedIcon;

  return (
    <Box
      component="nav"
      aria-label={t("analysisV2.caseDetails.label", { name: row.name })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 1 }}>
        <IconAction label={t("analysisV2.caseDetails.back")} link={backLink} testId={`${testId}-back`}>
          <Back fontSize="small" />
        </IconAction>
        <TypeIcon fontSize="small" color="action" aria-hidden />
        <Typography component="h2" variant="subtitle2" dir="auto" data-testid={`${testId}-title`} sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700, overflowWrap: "anywhere" }}>
          {row.name}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <PanelTabs
          tabs={[
            { id: "info", label: t("analysisV2.caseDetails.tabs.info") },
            { id: "settings", label: t("analysisV2.caseDetails.tabs.settings") },
            { id: "graph", label: t("analysisV2.caseDetails.tabs.graph"), disabled: graph === undefined },
            ...(display === undefined ? [] : [{ id: "display", label: t("analysisV2.caseDetails.tabs.display") }]),
            ...(jobs === undefined ? [] : [{ id: "jobs", label: t("analysisV2.caseDetails.tabs.jobs") }]),
          ]}
          value={tab}
          onChange={(id) => onTabChange(id as CaseDetailsTab)}
          ariaLabel={t("analysisV2.caseDetails.tabs.label")}
          idPrefix={testId}
          testId={`${testId}-tabs`}
        />
      </Box>
      {/* The open tab's content scrolls; the head, the tabs and the foot stay. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {tab === "info" && (
          <Box {...tabPanelProps(testId, "info")} sx={{ display: "grid", gap: 1.5, justifyItems: "start", px: 1, py: 1 }}>
            <Box sx={{ justifySelf: "stretch" }}>
              <GameInfo game={game} testId={`${testId}-info`} />
            </Box>
            {links !== undefined && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<LinkRoundedIcon />}
                onClick={() => setLinksOpen(true)}
                aria-haspopup="dialog"
                data-testid={`${testId}-links-open`}
              >
                {t("analysisV2.caseDetails.links", { count: linkCount ?? 0 })}
              </Button>
            )}
          </Box>
        )}
        {tab === "settings" && (
          <Box {...tabPanelProps(testId, "settings")} data-testid={`${testId}-settings`}>
            {settings}
          </Box>
        )}
        {tab === "graph" && (
          <Box {...tabPanelProps(testId, "graph")} data-testid={`${testId}-graph`}>
            {graph}
          </Box>
        )}
        {tab === "display" && (
          <Box {...tabPanelProps(testId, "display")} data-testid={`${testId}-display`}>
            {display}
          </Box>
        )}
        {tab === "jobs" && (
          <Box {...tabPanelProps(testId, "jobs")} data-testid={`${testId}-jobs`}>
            {jobs}
          </Box>
        )}
      </Box>
      {/* Sticky at the foot, as the list's: the details scroll above it. */}
      <Box
        data-testid={`${testId}-siblings`}
        sx={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 1, pt: 1, mt: 1, borderTop: "1px solid", borderColor: "divider" }}
      >
        <IconAction label={t("analysisV2.siblings.previous")} link={previous} disabled={previous === undefined} testId={`${testId}-previous`}>
          <Previous fontSize="small" />
        </IconAction>
        <IconAction label={t("analysisV2.siblings.next")} link={next} disabled={next === undefined} testId={`${testId}-next`}>
          <Next fontSize="small" />
        </IconAction>
      </Box>
      {links !== undefined && (
        <BaseDialog
          open={linksOpen}
          onClose={() => setLinksOpen(false)}
          title={t("analysisV2.caseDetails.linksTitle")}
          width="sm"
          actions={<Button onClick={() => setLinksOpen(false)}>{t("analysisV2.caseDetails.linksClose")}</Button>}
          testId={`${testId}-links-dialog`}
        >
          <Box data-testid={`${testId}-links`}>{links}</Box>
        </BaseDialog>
      )}
    </Box>
  );
}

export default CaseDetails;
