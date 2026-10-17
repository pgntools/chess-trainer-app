import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";

import { SwitchField } from "../../../design-system/components/forms";
import type { LinkTarget } from "../../../design-system/components/link";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { IconAction } from "../../../design-system/components/toolbars";

/** The panel's tabs, in order. */
export type CollectionDetailsTab = "general" | "options";

export type CollectionDetailsProps = {
  /** The collection's name, as the screen shows it. */
  name: string;
  /** Where Close goes — the Library's list, `/library` (the page's one way back). */
  closeLink: LinkTarget;
  /** The open tab — the screen's. */
  tab: CollectionDetailsTab;
  onTabChange: (tab: CollectionDetailsTab) => void;
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
 * **A Library collection's own panel beside its games** (CTA-229) — the
 * collection page's left panel, in the main menu's place, on both its views
 * (the games table and a tournament's Info / Participants / Games), as
 * `ProjectDetails` is beside a Project's Cases: a Close back to the Library
 * and the collection's name at its head (the page's one way back — no
 * header Back), then tabs. **A frame for now**: its content is a later
 * issue, so **General** holds a placeholder line and **Options** an example
 * switch.
 *
 * Presentational: the open tab and the switch's state arrive from the
 * screen; its words are `library.collectionDetails.*`.
 */
function CollectionDetails({ name, closeLink, tab, onTabChange, exampleOption, onExampleOptionChange, testId }: CollectionDetailsProps) {
  const { t } = useTranslation();

  return (
    <Box
      component="section"
      aria-label={t("library.collectionDetails.label", { name })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 1 }}>
        <IconAction label={t("library.collectionDetails.close", { name })} link={closeLink} testId={`${testId}-close`}>
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
            { id: "general", label: t("library.collectionDetails.tabs.general") },
            { id: "options", label: t("library.collectionDetails.tabs.options") },
          ]}
          value={tab}
          onChange={(id) => onTabChange(id as CollectionDetailsTab)}
          ariaLabel={t("library.collectionDetails.tabs.label")}
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
              {t("library.collectionDetails.placeholder")}
            </Typography>
          </Box>
        )}
        {tab === "options" && (
          <Box {...tabPanelProps(testId, "options")} data-testid={`${testId}-options`} sx={{ px: 1, py: 1 }}>
            <SwitchField
              size="small"
              label={t("library.collectionDetails.exampleOption")}
              help={t("library.collectionDetails.exampleOptionHelp")}
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

export default CollectionDetails;
