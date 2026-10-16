import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import WorkHistoryOutlinedIcon from "@mui/icons-material/WorkHistoryOutlined";
import { useTranslation } from "react-i18next";

import { FieldLabel, SideToggle, SwitchField } from "../../../design-system/components/forms";
import { IconAction } from "../../../design-system/components/toolbars";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { EmptyState } from "../../../design-system/components/states";
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import { REPERTOIRE_GAMES, type RepertoireGameId } from "../../../lib/repertoireGames";

/** The panel's tabs, in order. */
export type RepertoireDetailsTab = "settings" | "games" | "jobs";

/** The side the reader plays. */
export type RepertoireSide = "white" | "black";

export type RepertoireDetailsProps = {
  /** The repertoire's name, as shown — the panel's heading. */
  name: string;
  /** The reader's own notes on it — one line, all of it on hover; `""` none. Shown on the repertoire's own view only. */
  description: string;
  /** Restart — back to the start position, the reader's additions kept. */
  onRestart: () => void;
  /** Download the session's tree, additions and all, as PGN. */
  onDownload: () => void;
  /** Nothing to download yet (the tree still being read). */
  downloadDisabled: boolean;

  /** The open tab — the screen's, held above the player so it outlives a change of game. */
  tab: RepertoireDetailsTab;
  onTabChange: (tab: RepertoireDetailsTab) => void;

  /** The side the reader plays; changing it is the screen's (it restarts the session). */
  side: RepertoireSide;
  onSideChange: (side: RepertoireSide | null) => void;
  /** Autoplay — `undefined` where there is none: a game's trainer always plays. */
  autoplay: boolean | undefined;
  onAutoplayChange: (on: boolean) => void;
  showArrows: boolean;
  onShowArrowsChange: (on: boolean) => void;
  /** The play-chance arrows — `undefined` where there are none: a game must not show the odds. */
  chanceArrows: boolean | undefined;
  onChanceArrowsChange: (on: boolean) => void;
  /** The eval bar beside the board while the engine is on (the board header's engine menu before). */
  showEvalBar: boolean;
  onShowEvalBarChange: (on: boolean) => void;
  /** Open the repertoire's own, permanent settings — the record's title, description, folder and board — in a popup; a gear at the head's end. */
  onOpenSettings: () => void;
  /** Whether that popup is open — the gear's `aria-expanded`. */
  settingsOpen: boolean;
  /** Back, at the head's start: to the repertoires (the repertoire's own view), to the repertoire (a game). */
  backLink: LinkTarget;

  /** Where each game is played. */
  gameLink: (game: RepertoireGameId) => LinkTarget;
  /** The game being played — marked current; absent on the repertoire's own view. */
  currentGame?: RepertoireGameId;
  /** On a game: the way back to the repertoire's own view. Absent, no such entry. */
  repertoireLink?: LinkTarget;
  /** The Jobs tab's content (CTA-221) — the repertoire's jobs and *Evaluate with engine…*, the screen's (`EntityJobs`). Absent, an empty state. */
  jobs?: ReactNode;

  /**
   * The root; its parts `-back`, `-title`, `-record-settings`, `-description`,
   * `-restart`, `-download`, `-game-title`, `-tabs` (each tab `<testId>-tab-<id>`),
   * `-settings` (`-side`, `-autoplay`, `-arrows`, `-chance-arrows`,
   * `-evalbar`), `-games`
   * (`-games-back`, each game `-games-<id>`), `-jobs` (`-jobs-empty`).
   */
  testId: string;
};

/**
 * **A repertoire's own view beside its board** (CTA-206) — the left panel of
 * the repertoire player (`/repertoires/<id>`) and its games
 * (`/repertoires/<id>/games/<game>`), Analysis's `CaseDetails` for a
 * repertoire: a head — the repertoire's name, its description (or, in a game,
 * the game's title), Back at its start and, at its end, Restart, the
 * download and the record's own settings — a gear opening the screen's
 * popup; then three tabs (the opening on screen is the board panel's):
 *
 * - **Settings** — the session's knobs: the side, Autoplay (the repertoire's
 *   own view only), the next-move arrows, the play-chance arrows (the own
 *   view only) and the eval bar.
 * - **Games** — every game (`REPERTOIRE_GAMES`), each a link with what it
 *   does, the one being played current; in a game, a way back to the
 *   repertoire's own view first.
 * - **Jobs** — the repertoire's jobs and *Evaluate with engine…* (CTA-221,
 *   the screen's `jobs`); absent, an empty state.
 *
 * Presentational: the session's state, the links and the open tab arrive from
 * the screen; its words are `repertoires.details.*`, `repertoires.play.*` and
 * `repertoires.games.*`.
 */
function RepertoireDetails({
  name,
  description,
  onRestart,
  onDownload,
  downloadDisabled,
  tab,
  onTabChange,
  side,
  onSideChange,
  autoplay,
  onAutoplayChange,
  showArrows,
  onShowArrowsChange,
  chanceArrows,
  onChanceArrowsChange,
  showEvalBar,
  onShowEvalBarChange,
  onOpenSettings,
  settingsOpen,
  backLink,
  gameLink,
  currentGame,
  repertoireLink,
  jobs,
  testId,
}: RepertoireDetailsProps) {
  const { t } = useTranslation();
  // The way back points along the reading direction, which runs right to left under RTL.
  const Back = useTheme().direction === "rtl" ? ArrowForwardRoundedIcon : ArrowBackRoundedIcon;

  return (
    <Box
      component="section"
      aria-label={t("repertoires.details.label", { name })}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 0.5 }}>
        <IconAction
          label={t(currentGame === undefined ? "repertoires.details.back" : "repertoires.details.games.back")}
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
          {name}
        </Typography>
        <IconAction label={t("repertoires.play.restart")} onClick={onRestart} testId={`${testId}-restart`}>
          <RestartAltRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction label={t("repertoires.play.download")} onClick={onDownload} disabled={downloadDisabled} testId={`${testId}-download`}>
          <DownloadRoundedIcon fontSize="small" />
        </IconAction>
        <IconAction
          label={t("repertoires.details.recordSettings")}
          onClick={onOpenSettings}
          popupOpen={settingsOpen}
          popupKind="dialog"
          testId={`${testId}-record-settings`}
        >
          <SettingsRoundedIcon fontSize="small" />
        </IconAction>
      </Box>
      <Box sx={{ flexShrink: 0, pb: 1, minWidth: 0 }}>
        {currentGame !== undefined ? (
          <Typography
            variant="caption"
            data-testid={`${testId}-game-title`}
            sx={{ color: "text.secondary", display: "block" }}
            noWrap
          >
            {t(`repertoires.games.${currentGame}.title`)}
          </Typography>
        ) : (
          description !== "" && (
            // The reader's own notes on it: one line here, all of it on hover.
            <Typography
              variant="caption"
              data-testid={`${testId}-description`}
              dir="auto"
              title={description}
              sx={{ color: "text.secondary", display: "block" }}
              noWrap
            >
              {description}
            </Typography>
          )
        )}
      </Box>
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <PanelTabs
          tabs={[
            { id: "settings", label: t("repertoires.details.tabs.settings") },
            { id: "games", label: t("repertoires.details.tabs.games") },
            { id: "jobs", label: t("repertoires.details.tabs.jobs") },
          ]}
          value={tab}
          onChange={(id) => onTabChange(id as RepertoireDetailsTab)}
          ariaLabel={t("repertoires.details.tabs.label")}
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
            <Box>
              <FieldLabel component="span" id={`${testId}-side-label`}>
                {t("repertoires.play.side")}
              </FieldLabel>
              <SideToggle
                value={side}
                onChange={onSideChange}
                labels={{ white: t("repertoires.play.white"), black: t("repertoires.play.black") }}
                ariaLabel={t("repertoires.play.side")}
                testId={`${testId}-side`}
              />
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
                {t("repertoires.play.sideHelp")}
              </Typography>
            </Box>
            {autoplay !== undefined && (
              <SwitchField
                size="small"
                testIdOn="control"
                testId={`${testId}-autoplay`}
                checked={autoplay}
                onChange={onAutoplayChange}
                label={t("repertoires.play.autoplay")}
                help={t("repertoires.play.autoplayHelp")}
              />
            )}
            <SwitchField
              size="small"
              testIdOn="control"
              testId={`${testId}-arrows`}
              checked={showArrows}
              onChange={onShowArrowsChange}
              label={t("repertoires.play.arrows")}
              help={t("repertoires.play.arrowsHelp")}
            />
            {chanceArrows !== undefined && (
              <SwitchField
                size="small"
                testIdOn="control"
                testId={`${testId}-chance-arrows`}
                checked={chanceArrows}
                onChange={onChanceArrowsChange}
                label={t("repertoires.play.chanceArrows")}
                help={t("repertoires.play.chanceArrowsHelp")}
              />
            )}
            <SwitchField
              size="small"
              testIdOn="control"
              testId={`${testId}-evalbar`}
              checked={showEvalBar}
              onChange={onShowEvalBarChange}
              label={t("analysis.settings.evalBar")}
              help={t("repertoires.details.evalBarHelp")}
            />
          </Box>
        )}
        {tab === "games" && (
          <Box {...tabPanelProps(testId, "games")} data-testid={`${testId}-games`}>
            <List dense aria-label={t("repertoires.details.games.label", { name })} disablePadding>
              {repertoireLink !== undefined && (
                <li>
                  <ListItemButton {...linkProps(repertoireLink)} data-testid={`${testId}-games-back`}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Back fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={t("repertoires.details.games.back")} secondary={t("repertoires.details.games.backHelp")} />
                  </ListItemButton>
                </li>
              )}
              {REPERTOIRE_GAMES.map((game) => {
                const current = game === currentGame;
                return (
                  <li key={game}>
                    <ListItemButton
                      {...linkProps(gameLink(game))}
                      selected={current}
                      aria-current={current ? "page" : undefined}
                      data-testid={`${testId}-games-${game}`}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <SportsEsportsOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t(`repertoires.games.${game}.title`)}
                        secondary={t(`repertoires.games.${game}.description`)}
                      />
                    </ListItemButton>
                  </li>
                );
              })}
            </List>
          </Box>
        )}
        {tab === "jobs" && (
          <Box {...tabPanelProps(testId, "jobs")} data-testid={`${testId}-jobs`}>
            {jobs ?? (
              <EmptyState icon={<WorkHistoryOutlinedIcon />} testId={`${testId}-jobs-empty`}>
                {t("repertoires.details.jobs.empty")}
              </EmptyState>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default RepertoireDetails;
