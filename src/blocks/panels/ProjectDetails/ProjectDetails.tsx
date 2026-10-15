import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import { useTranslation } from "react-i18next";

import { SwitchField } from "../../../design-system/components/forms";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";

/** The panel's tabs, in order. */
export type ProjectDetailsTab = "general" | "gamesTree" | "options";

export type ProjectDetailsProps = {
  /** The Project's name, as the screen shows it (its untitled name for one with none). */
  name: string;
  /** The open tab — the screen's. */
  tab: ProjectDetailsTab;
  onTabChange: (tab: ProjectDetailsTab) => void;
  /** The Options tab's example switch — the screen's state; nothing reads it yet. */
  exampleOption: boolean;
  onExampleOptionChange: (on: boolean) => void;
  /**
   * The Games tree tab's board (CTA-214) — the screen's, over the Project's
   * Game Cases. Absent while no Game Case has a line: the tab says there are
   * no games to show.
   */
  gamesTree?: ReactNode;
  /**
   * The root; its parts `-title`, `-tabs` (each tab `-tab-<id>`), `-general`,
   * `-games-tree` (its empty line `-games-tree-empty`), `-options` and the
   * switch's input `-example-option`.
   */
  testId: string;
};

/**
 * **A Project's own panel beside its Cases** (CTA-213) — the Project view's
 * left panel, in the main menu's place, as `CaseDetails` is beside a Case's
 * board: the Project's name at its head, then tabs. **General** holds a
 * placeholder line and **Options** an example switch, their content a later
 * issue; **Games tree** (CTA-214) the opening-moves board over the Project's
 * Game Cases, which filters its Cases table — a slot the screen fills.
 *
 * Presentational: the open tab, the switch's state and the board arrive from
 * the screen; its words are `analysisV2.projectDetails.*`.
 */
function ProjectDetails({
  name,
  tab,
  onTabChange,
  exampleOption,
  onExampleOptionChange,
  gamesTree,
  testId,
}: ProjectDetailsProps) {
  const { t } = useTranslation();

  return (
    <Box
      component="section"
      aria-label={t("analysisV2.projectDetails.label", { name })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 1 }}>
        <FolderOpenOutlinedIcon fontSize="small" color="action" aria-hidden />
        <Typography
          component="h2"
          variant="subtitle2"
          dir="auto"
          data-testid={`${testId}-title`}
          sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700, overflowWrap: "anywhere" }}
        >
          {name}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <PanelTabs
          tabs={[
            { id: "general", label: t("analysisV2.projectDetails.tabs.general") },
            { id: "gamesTree", label: t("analysisV2.projectDetails.tabs.gamesTree") },
            { id: "options", label: t("analysisV2.projectDetails.tabs.options") },
          ]}
          value={tab}
          onChange={(id) => onTabChange(id as ProjectDetailsTab)}
          ariaLabel={t("analysisV2.projectDetails.tabs.label")}
          idPrefix={testId}
          testId={`${testId}-tabs`}
          tabTestIdPrefix={testId}
        />
      </Box>
      {/* The open tab's content scrolls; the head and the tabs stay. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {tab === "general" && (
          <Box {...tabPanelProps(testId, "general")} data-testid={`${testId}-general`} sx={{ px: 1, py: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("analysisV2.projectDetails.placeholder")}
            </Typography>
          </Box>
        )}
        {tab === "gamesTree" && (
          <Box {...tabPanelProps(testId, "gamesTree")} data-testid={`${testId}-games-tree`} sx={{ px: 1, py: 1 }}>
            {gamesTree ?? (
              <Typography variant="body2" sx={{ color: "text.secondary" }} data-testid={`${testId}-games-tree-empty`}>
                {t("analysisV2.projectDetails.noGames")}
              </Typography>
            )}
          </Box>
        )}
        {tab === "options" && (
          <Box {...tabPanelProps(testId, "options")} data-testid={`${testId}-options`} sx={{ px: 1, py: 1 }}>
            <SwitchField
              size="small"
              label={t("analysisV2.projectDetails.exampleOption")}
              help={t("analysisV2.projectDetails.exampleOptionHelp")}
              checked={exampleOption}
              onChange={onExampleOptionChange}
              testId={`${testId}-example-option`}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default ProjectDetails;
