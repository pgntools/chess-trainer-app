import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import { useTranslation } from "react-i18next";

import { SwitchField } from "../../../design-system/components/forms";
import type { LinkTarget } from "../../../design-system/components/link";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { IconAction } from "../../../design-system/components/toolbars";
import type { Game } from "../../../lib/gameModel";
import { GameInfo } from "../GameInfo";

/** The panel's tabs, in order. */
export type LibraryGameDetailsTab = "info" | "settings";

export type LibraryGameDetailsProps = {
  /** The game's title, as shown — the panel's heading (the players, `gameTitleOf`). */
  title: string;
  /** The collection's name — Back's label. */
  collectionName: string;
  /** The game's 1-based place in the collection. */
  number: number;
  /** How many games the collection holds. */
  count: number;
  /** Its event, round, date and result, joined — `""` none; after "Game n of m" on one line, all of it on hover. */
  caption: string;
  /** Back, at the head's start: to the collection's table, as the reader left it. */
  backLink: LinkTarget;
  /** The previous game, at the foot — `undefined` on the first. */
  previousLink: LinkTarget | undefined;
  /** The next game, at the foot — `undefined` on the last. */
  nextLink: LinkTarget | undefined;

  /** The open tab — the screen's, held above the board so it outlives a step to another game. */
  tab: LibraryGameDetailsTab;
  onTabChange: (tab: LibraryGameDetailsTab) => void;

  showArrows: boolean;
  onShowArrowsChange: (on: boolean) => void;
  /** The move on screen's mark on the board (CTA-168). */
  showMoveMarks: boolean;
  onShowMoveMarksChange: (on: boolean) => void;
  /** The eval bar beside the board while the engine is on (the board header's engine menu before). */
  showEvalBar: boolean;
  onShowEvalBarChange: (on: boolean) => void;

  /** The game on the board — its PGN tags, on Info. */
  game: Game;

  /**
   * The root; its parts `-back`, `-title`, `-caption`, `-tabs` (each tab
   * `<testId>-tab-<id>`), `-info` (the tags, `GameInfo`'s `<testId>-info-…`),
   * `-settings` (`-arrows`, `-move-marks`, `-evalbar`), `-siblings` (the
   * foot: `-previous`, `-next`).
   */
  testId: string;
};

/**
 * **A Library game's own view beside its board** (CTA-209) — the left panel
 * of the Library's game board (`/library/<collection>/<n>`), what
 * `RepertoireDetails` is to the repertoire player: a head — Back to the
 * collection at its start and the game's title, and "Game n of m · event ·
 * round · date · result" on one line under them; then two tabs (the opening
 * on screen is the board panel's):
 *
 * - **Info** — the game's PGN tags (`GameInfo`); first, where a game opens
 *   (CTA-212).
 * - **Settings** — the session's knobs: the next-move arrows, the move marks
 *   and the eval bar.
 *
 * and at its foot, sticky under the scrolling tab, the previous and the next
 * game (CTA-212 — the head's end before), as the Case view's (`CaseDetails`).
 *
 * Presentational: the session's state, the links and the open tab arrive from
 * the screen; its words are `library.game.*`.
 */
function LibraryGameDetails({
  title,
  collectionName,
  number,
  count,
  caption,
  backLink,
  previousLink,
  nextLink,
  tab,
  onTabChange,
  showArrows,
  onShowArrowsChange,
  showMoveMarks,
  onShowMoveMarksChange,
  showEvalBar,
  onShowEvalBarChange,
  game,
  testId,
}: LibraryGameDetailsProps) {
  const { t } = useTranslation();
  // The way back, previous and next point along the reading direction, which runs right to left under RTL.
  const rtl = useTheme().direction === "rtl";
  const Back = rtl ? ArrowForwardRoundedIcon : ArrowBackRoundedIcon;
  const Previous = rtl ? NavigateNextRoundedIcon : NavigateBeforeRoundedIcon;
  const Next = rtl ? NavigateBeforeRoundedIcon : NavigateNextRoundedIcon;
  const place = t("library.game.of", { number, count });
  const line = caption === "" ? place : `${place} · ${caption}`;

  return (
    <Box
      component="section"
      aria-label={t("library.game.details.label", { name: title })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 0.5 }}>
        <IconAction
          label={t("library.game.back", { name: collectionName })}
          link={backLink}
          testId={`${testId}-back`}
        >
          <Back fontSize="small" />
        </IconAction>
        <Typography
          component="h2"
          variant="subtitle2"
          dir="auto"
          data-testid={`${testId}-title`}
          sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700, lineHeight: 1.3, overflowWrap: "anywhere" }}
        >
          {title}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0, pb: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          data-testid={`${testId}-caption`}
          dir="auto"
          title={line}
          sx={{ color: "text.secondary", display: "block" }}
          noWrap
        >
          {line}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <PanelTabs
          tabs={[
            { id: "info", label: t("library.game.details.tabs.info") },
            { id: "settings", label: t("library.game.details.tabs.settings") },
          ]}
          value={tab}
          onChange={(id) => onTabChange(id as LibraryGameDetailsTab)}
          ariaLabel={t("library.game.details.tabs.label")}
          idPrefix={testId}
          testId={`${testId}-tabs`}
          tabTestIdPrefix={testId}
        />
      </Box>
      {/* The open tab's content scrolls; the head, the tabs and the foot stay. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {tab === "info" && (
          <Box {...tabPanelProps(testId, "info")} data-testid={`${testId}-info-tab`}>
            <GameInfo game={game} testId={`${testId}-info`} />
          </Box>
        )}
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
              label={t("library.game.arrows")}
              help={t("library.game.details.arrowsHelp")}
            />
            <SwitchField
              size="small"
              testIdOn="control"
              testId={`${testId}-move-marks`}
              checked={showMoveMarks}
              onChange={onShowMoveMarksChange}
              label={t("library.game.moveMarks")}
              help={t("library.game.details.moveMarksHelp")}
            />
            <SwitchField
              size="small"
              testIdOn="control"
              testId={`${testId}-evalbar`}
              checked={showEvalBar}
              onChange={onShowEvalBarChange}
              label={t("analysis.settings.evalBar")}
              help={t("library.game.details.evalBarHelp")}
            />
          </Box>
        )}
      </Box>
      {/* Sticky at the foot, as the Case view's; on the first and the last game each keeps its place, disabled. */}
      <Box
        data-testid={`${testId}-siblings`}
        sx={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 1, pt: 1, mt: 1, borderTop: "1px solid", borderColor: "divider" }}
      >
        <IconAction
          label={t("library.game.previous")}
          link={previousLink}
          disabled={previousLink === undefined}
          testId={`${testId}-previous`}
        >
          <Previous fontSize="small" />
        </IconAction>
        <IconAction
          label={t("library.game.next")}
          link={nextLink}
          disabled={nextLink === undefined}
          testId={`${testId}-next`}
        >
          <Next fontSize="small" />
        </IconAction>
      </Box>
    </Box>
  );
}

export default LibraryGameDetails;
