import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";

import { SwitchField } from "../../../design-system/components/forms";
import type { LinkTarget } from "../../../design-system/components/link";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { IconAction } from "../../../design-system/components/toolbars";

/** The panel's tabs, in order. */
export type ProjectDetailsTab = "general" | "options";

export type ProjectDetailsProps = {
  /** The Project's name, as the screen shows it (its untitled name for one with none). */
  name: string;
  /** Where Close goes — the Projects list, at the folder holding the Project (CTA-224). */
  closeLink: LinkTarget;
  /** The open tab — the screen's. */
  tab: ProjectDetailsTab;
  onTabChange: (tab: ProjectDetailsTab) => void;
  /** The Options tab's example switch — the screen's state; nothing reads it yet. */
  exampleOption: boolean;
  onExampleOptionChange: (on: boolean) => void;
  /**
   * The root; its parts `-close`, `-title`, `-tabs` (each tab `-tab-<id>`), `-general`,
   * `-options` and the switch's input `-example-option`.
   */
  testId: string;
};

/**
 * **A Project's own panel beside its Cases** (CTA-213) — the Project view's
 * left panel, in the main menu's place, as `CaseDetails` is beside a Case's
 * board: a Close back to the Projects list and the Project's name at its
 * head (CTA-224 — `CaseSiblings`' Close, the Project view's one way back),
 * then tabs. **A frame for now**: its
 * content is a later issue, so **General** holds a placeholder line and
 * **Options** an example switch.
 *
 * Presentational: the open tab and the switch's state arrive from the
 * screen; its words are `analysisV2.projectDetails.*`.
 */
function ProjectDetails({ name, closeLink, tab, onTabChange, exampleOption, onExampleOptionChange, testId }: ProjectDetailsProps) {
  const { t } = useTranslation();

  return (
    <Box
      component="section"
      aria-label={t("analysisV2.projectDetails.label", { name })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 1 }}>
        <IconAction label={t("analysisV2.projectDetails.close", { name })} link={closeLink} testId={`${testId}-close`}>
          <CloseRoundedIcon fontSize="small" />
        </IconAction>
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
