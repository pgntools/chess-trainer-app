import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";

/** The panel's tabs — Settings alone today. */
export type AccuracyTrainerDetailsTab = "settings";

export type AccuracyTrainerDetailsProps = {
  /** The panel's heading: the game loaded, else the exercise's name. */
  title: string;
  /** The open tab — the screen's. */
  tab: AccuracyTrainerDetailsTab;
  onTabChange: (tab: AccuracyTrainerDetailsTab) => void;
  /** The next-move arrows over the reader's own analysis. */
  showArrows: boolean;
  onShowArrowsChange: (on: boolean) => void;
  /**
   * The engine (CTA-238): on, a position with fewer of its top lines than
   * `lines` is searched — an Evaluate Position job — once the reader starts
   * on it.
   */
  engine: { on: boolean; onChange: (on: boolean) => void; lines: number; onLinesChange: (lines: number) => void };
  /** The session's Case in Analysis — absent before a session starts. */
  caseLink?: LinkTarget;
  /**
   * The root; its parts `-title`, `-case` (the Case's link), `-tabs` (each tab
   * `<testId>-tab-<id>`), `-settings` (`-arrows`, `-engine`, `-lines`).
   */
  testId: string;
};

/** How many lines the engine may be asked for — the Engine menu's own range. */
const LINES_BOUNDS = { min: 1, max: 10 } as const;

/**
 * **An Accuracy Trainer exercise's own panel** (CTA-238) — beside its board,
 * in the main menu's place, as a Case's or a Library game's (`BoardLeftPanel`,
 * `keepShell`): the game loaded as its heading — and, once a session runs,
 * a link to its Case — then tabs — **Settings**: *Show next-move arrows*
 * (the reader's analysis's continuations, on by default), *Use the engine*
 * and *Lines needed* (CTA-238's Evaluate Position). A tab more is a field of
 * {@link AccuracyTrainerDetailsTab} and its content here.
 *
 * Presentational: the settings and the tab are props; the screen holds them
 * for the session. Its words are `accuracyTrainer.details.*`.
 */
function AccuracyTrainerDetails({ title, tab, onTabChange, showArrows, onShowArrowsChange, engine, caseLink, testId }: AccuracyTrainerDetailsProps) {
  const { t } = useTranslation();
  return (
    <Box
      component="section"
      aria-label={t("accuracyTrainer.details.label", { name: title })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Typography
        component="h2"
        variant="subtitle2"
        dir="auto"
        data-testid={`${testId}-title`}
        sx={{ flexShrink: 0, fontWeight: 700, lineHeight: 1.3, overflowWrap: "anywhere", pb: 1 }}
      >
        {title}
      </Typography>
      {caseLink !== undefined && (
        <Box sx={{ flexShrink: 0, pb: 1 }}>
          <Link {...(linkProps(caseLink) as Record<string, unknown>)} variant="body2" underline="hover" data-testid={`${testId}-case`}>
            {t("accuracyTrainer.details.openCase")}
          </Link>
        </Box>
      )}
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <PanelTabs
          tabs={[{ id: "settings", label: t("accuracyTrainer.details.tabs.settings") }]}
          value={tab}
          onChange={(id) => onTabChange(id as AccuracyTrainerDetailsTab)}
          ariaLabel={t("accuracyTrainer.details.tabs.label")}
          idPrefix={testId}
          testId={`${testId}-tabs`}
          tabTestIdPrefix={testId}
        />
      </Box>
      {/* The open tab's content scrolls; the head and the tabs stay. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {tab === "settings" && (
          <Box
            {...tabPanelProps(testId, "settings")}
            data-testid={`${testId}-settings`}
            sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1 }}
          >
            <SwitchField
              size="small"
              testIdOn="control"
              testId={`${testId}-arrows`}
              checked={showArrows}
              onChange={onShowArrowsChange}
              label={t("accuracyTrainer.details.arrows")}
              help={t("accuracyTrainer.details.arrowsHelp")}
            />
            <SwitchField
              size="small"
              testIdOn="control"
              testId={`${testId}-engine`}
              checked={engine.on}
              onChange={engine.onChange}
              label={t("accuracyTrainer.details.engine")}
              help={t("accuracyTrainer.details.engineHelp")}
            />
            <SliderField
              label={t("accuracyTrainer.details.lines")}
              value={engine.lines}
              onChange={engine.onLinesChange}
              min={LINES_BOUNDS.min}
              max={LINES_BOUNDS.max}
              help={t("accuracyTrainer.details.linesHelp")}
              disabled={!engine.on}
              testId={`${testId}-lines`}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default AccuracyTrainerDetails;
