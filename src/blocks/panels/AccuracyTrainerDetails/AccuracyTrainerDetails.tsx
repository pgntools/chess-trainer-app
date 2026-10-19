import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { IconAction } from "../../../design-system/components/toolbars";

/** The panel's tabs. */
export type AccuracyTrainerDetailsTab = "moves" | "settings";

/** The reader's moves at the position on screen, in their order, and what may be done with them. */
export type AccuracyTrainerMoves = {
  /** In SAN, their best first. */
  list: readonly string[];
  /** One moved a place up or down their order. */
  onMove: (index: number, move: "up" | "down") => void;
  /** One deleted — its whole line. */
  onRemove: (index: number) => void;
  /** The position is checked: its moves are its answer, fixed. */
  locked: boolean;
};

export type AccuracyTrainerDetailsProps = {
  /** The panel's heading: the game loaded, else the exercise's name. */
  title: string;
  /** The open tab — the screen's. */
  tab: AccuracyTrainerDetailsTab;
  onTabChange: (tab: AccuracyTrainerDetailsTab) => void;
  /** The next-move arrows over the reader's own analysis. */
  showArrows: boolean;
  onShowArrowsChange: (on: boolean) => void;
  /** How many best moves to find at each position, in order — and how many lines the engine is asked for. */
  movesToFind: number;
  onMovesToFindChange: (count: number) => void;
  /** A session runs: its moves to find are fixed — the slider off, saying so. */
  movesLocked?: boolean;
  /**
   * The engine (CTA-238): on, a position with fewer of its top lines than
   * the moves to find is searched — an Evaluate Position job — once the
   * reader starts on it.
   */
  engine: boolean;
  onEngineChange: (on: boolean) => void;
  /** The session's Case in Analysis — absent before a session starts. */
  caseLink?: LinkTarget;
  /** The reader's moves at the position on screen — absent before a session starts. */
  moves?: AccuracyTrainerMoves;
  /**
   * The root; its parts `-title`, `-case` (the Case's link), `-tabs` (each tab
   * `<testId>-tab-<id>`), `-moves-tab` (a move `-move-<index>`, its actions
   * `-move-<index>-up`, `-down`, `-remove`; none `-moves-empty`), `-settings`
   * (`-moves`, `-arrows`, `-engine`).
   */
  testId: string;
};

/** How many best moves may be asked for — the Engine menu's own range of lines. */
const MOVES_BOUNDS = { min: 1, max: 10 } as const;

/**
 * **An Accuracy Trainer exercise's own panel** (CTA-238) — beside its board,
 * in the main menu's place, as a Case's or a Library game's (`BoardLeftPanel`,
 * `keepShell`): the game loaded as its heading — and, once a session runs,
 * a link to its Case — then tabs — **Moves**: the reader's moves at the
 * position on screen, in their order, each moved up or down or deleted (their
 * line with it; read only once the position is checked) — and **Settings**:
 * *Moves to find* (how many
 * best moves, in order, at each position), *Show next-move arrows* (the
 * reader's analysis's continuations, on by default) and *Use the engine*
 * (CTA-238's Evaluate Position). A tab more is a field of
 * {@link AccuracyTrainerDetailsTab} and its content here.
 *
 * Presentational: the settings and the tab are props; the screen holds them
 * for the session. Its words are `accuracyTrainer.details.*`.
 */
function AccuracyTrainerDetails({
  title,
  tab,
  onTabChange,
  showArrows,
  onShowArrowsChange,
  movesToFind,
  onMovesToFindChange,
  movesLocked = false,
  engine,
  onEngineChange,
  caseLink,
  moves,
  testId,
}: AccuracyTrainerDetailsProps) {
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
          tabs={[
            { id: "moves", label: t("accuracyTrainer.details.tabs.moves") },
            { id: "settings", label: t("accuracyTrainer.details.tabs.settings") },
          ]}
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
        {tab === "moves" && (
          <Box {...tabPanelProps(testId, "moves")} data-testid={`${testId}-moves-tab`} sx={{ display: "grid", gap: 1, p: 1 }}>
            {moves === undefined || moves.list.length === 0 ? (
              <Typography variant="body2" data-testid={`${testId}-moves-empty`} sx={{ color: "text.secondary" }}>
                {t(moves === undefined ? "accuracyTrainer.details.movesNoSession" : "accuracyTrainer.details.movesNone")}
              </Typography>
            ) : (
              <>
                <Box component="ol" aria-label={t("accuracyTrainer.details.movesList")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.5 }}>
                  {moves.list.map((san, index) => (
                    <Box
                      component="li"
                      key={`${index}-${san}`}
                      data-testid={`${testId}-move-${index}`}
                      sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 32, borderBottom: 1, borderColor: "divider" }}
                    >
                      <Typography component="span" variant="body2" sx={{ color: "text.secondary", minWidth: "2ch", textAlign: "end" }}>
                        {index + 1}.
                      </Typography>
                      <Typography component="span" variant="body2" dir="ltr" sx={{ fontWeight: 600, flexGrow: 1 }}>
                        {san}
                      </Typography>
                      {!moves.locked && (
                        <>
                          <IconAction
                            label={t("accuracyTrainer.details.moveUp", { san })}
                            onClick={() => moves.onMove(index, "up")}
                            disabled={index === 0}
                            testId={`${testId}-move-${index}-up`}
                          >
                            <ArrowUpwardRoundedIcon fontSize="small" />
                          </IconAction>
                          <IconAction
                            label={t("accuracyTrainer.details.moveDown", { san })}
                            onClick={() => moves.onMove(index, "down")}
                            disabled={index === moves.list.length - 1}
                            testId={`${testId}-move-${index}-down`}
                          >
                            <ArrowDownwardRoundedIcon fontSize="small" />
                          </IconAction>
                          <IconAction
                            label={t("accuracyTrainer.details.moveRemove", { san })}
                            onClick={() => moves.onRemove(index)}
                            color="error"
                            testId={`${testId}-move-${index}-remove`}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconAction>
                        </>
                      )}
                    </Box>
                  ))}
                </Box>
                <Typography variant="caption" component="p" sx={{ color: "text.secondary", m: 0 }}>
                  {t(moves.locked ? "accuracyTrainer.details.movesLockedHint" : "accuracyTrainer.details.movesHint")}
                </Typography>
              </>
            )}
          </Box>
        )}
        {tab === "settings" && (
          <Box
            {...tabPanelProps(testId, "settings")}
            data-testid={`${testId}-settings`}
            sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1 }}
          >
            <SliderField
              label={t("accuracyTrainer.details.moves")}
              value={movesToFind}
              onChange={onMovesToFindChange}
              min={MOVES_BOUNDS.min}
              max={MOVES_BOUNDS.max}
              help={t("accuracyTrainer.details.movesHelp")}
              disabled={movesLocked}
              {...(movesLocked ? { notice: t("accuracyTrainer.details.movesLocked") } : {})}
              testId={`${testId}-moves`}
            />
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
              checked={engine}
              onChange={onEngineChange}
              label={t("accuracyTrainer.details.engine")}
              help={t("accuracyTrainer.details.engineHelp")}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default AccuracyTrainerDetails;
