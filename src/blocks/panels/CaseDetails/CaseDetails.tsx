import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { EmptyState } from "../../../design-system/components/states";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { IconAction } from "../../../design-system/components/toolbars";
import type { CaseRow } from "../../../lib/analysisCaseRows";
import type { Game } from "../../../lib/gameModel";
import { GameInfo } from "../GameInfo";

/** The view's tabs, in order. */
type DetailsTab = "info" | "tbd";

export type CaseDetailsProps = {
  /** The Case on the board. */
  row: CaseRow;
  /** Its game, for the Info tab's PGN tags — none for a Case that carries no tags. */
  game: Game | undefined;
  /** Where Back goes — the Project's Cases, the list beside the board. */
  backLink: LinkTarget;
  /** The previous / next Case in the list's order — `undefined` at an end. */
  previous: LinkTarget | undefined;
  next: LinkTarget | undefined;
  /**
   * The root; its parts `-back`, `-title`, `-tabs` (each tab `-tab-<id>`),
   * `-info` (the tags, each `-info-<Tag>`, none `-info-empty`), `-tbd`,
   * `-siblings`, `-previous`, `-next`.
   */
  testId: string;
};

/**
 * **A Case's own view beside its board** (CTA-186) — the second screen of
 * the Case board's left panel, opened from a row of the Project's Cases
 * (`CaseSiblings`): Back to that list at the head's start — where the list
 * has Close — the Case's name and type, its details in tabs — **Info**, its
 * PGN tags (`GameInfo`, the Library game board's Info tab), and a second
 * still to come — and previous / next at its foot, sticky as the list's.
 * Presentational: the game and the links arrive from the screen, the open tab
 * is its own; its words are `analysisV2.caseDetails.*`.
 */
function CaseDetails({ row, game, backLink, previous, next, testId }: CaseDetailsProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DetailsTab>("info");
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
            { id: "tbd", label: t("analysisV2.caseDetails.tabs.tbd") },
          ]}
          value={tab}
          onChange={(id) => setTab(id as DetailsTab)}
          ariaLabel={t("analysisV2.caseDetails.tabs.label")}
          idPrefix={testId}
          testId={`${testId}-tabs`}
        />
      </Box>
      {/* The open tab's content scrolls; the head, the tabs and the foot stay. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {tab === "info" && (
          <Box {...tabPanelProps(testId, "info")} sx={{ px: 1 }}>
            <GameInfo game={game} testId={`${testId}-info`} />
          </Box>
        )}
        {tab === "tbd" && (
          <Box {...tabPanelProps(testId, "tbd")}>
            <EmptyState testId={`${testId}-tbd`}>{t("analysisV2.caseDetails.tbdSoon")}</EmptyState>
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
    </Box>
  );
}

export default CaseDetails;
