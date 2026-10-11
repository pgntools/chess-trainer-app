import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { useTranslation } from "react-i18next";

import { SwitchField } from "../../../design-system/components/forms";
import { IconAction } from "../../../design-system/components/toolbars";

export type BoardEngineControlsProps = {
  /** The engine's switch — what the play / pause button shows and toggles. */
  engineOn: boolean;
  onEngineOnChange: (next: boolean) => void;
  /** The eval bar beside the board — every board's, in the menu. */
  showEvalBar: boolean;
  onShowEvalBarChange: (next: boolean) => void;
  /**
   * **Write evaluations into the game** (CTA-167) — the Analysis Board's
   * switch, in the same menu. Absent: no such switch.
   */
  writeEvals?: { checked: boolean; onChange: (next: boolean) => void };
  /**
   * The prefix of its ids, the board's: the play / pause button is
   * `<testId>-setting-engine` (the engine switch's id before it, CTA-181),
   * the menu's button `<testId>-engine-menu`, the menu `<testId>-engine-menu-popup`,
   * its switches `<testId>-setting-evalbar` and `<testId>-setting-write-evals`.
   */
  testId: string;
};

/**
 * **A board's engine controls** (CTA-181) — in the board's header, every
 * board's: the engine's on / off as a **play / pause button** (`aria-pressed`,
 * one name whatever its state, the theme's primary while on) — where a switch
 * was — and beside it a small menu of the board's own engine choices: the
 * eval bar, and on the Analysis Board *Write evaluations into the game*. The
 * search settings themselves (lines, depth, move time, Threads, Hash) are the
 * top bar's Engine menu, one set for every board.
 *
 * Presentational: the state arrives, a change leaves as a callback. Its words
 * are `boardEngine.*` and the eval bar's and evaluations' `analysis.settings.*`.
 */
function BoardEngineControls({ engineOn, onEngineOnChange, showEvalBar, onShowEvalBarChange, writeEvals, testId }: BoardEngineControlsProps) {
  const { t } = useTranslation();
  const { direction } = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const titleId = useId();
  // The popover places by the page's sides, so its inline end is picked here.
  const end = direction === "rtl" ? "left" : "right";
  return (
    <>
      <IconAction
        label={t("boardEngine.toggle")}
        onClick={() => onEngineOnChange(!engineOn)}
        pressed={engineOn}
        testId={`${testId}-setting-engine`}
      >
        {engineOn ? <PauseCircleOutlineRoundedIcon fontSize="small" /> : <PlayCircleOutlineRoundedIcon fontSize="small" />}
      </IconAction>
      <IconAction
        label={t("boardEngine.menu")}
        onClick={(event) => setAnchor(event.currentTarget)}
        popupOpen={anchor !== null}
        popupKind="dialog"
        testId={`${testId}-engine-menu`}
      >
        <TuneRoundedIcon fontSize="small" />
      </IconAction>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: end }}
        transformOrigin={{ vertical: "top", horizontal: end }}
        dir={direction}
        slotProps={{ paper: { role: "dialog", "aria-labelledby": titleId, "data-testid": `${testId}-engine-menu-popup` } as object }}
      >
        <Box sx={{ display: "grid", gap: 1.5, p: 2, maxWidth: 320 }}>
          <Typography id={titleId} variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
            {t("boardEngine.menu")}
          </Typography>
          <SwitchField
            size="small"
            label={t("analysis.settings.evalBar")}
            checked={showEvalBar}
            onChange={onShowEvalBarChange}
            // The boards' tests reach the input inside the switch.
            testIdOn="control"
            testId={`${testId}-setting-evalbar`}
          />
          {writeEvals !== undefined && (
            <SwitchField
              size="small"
              label={t("analysis.settings.writeEvals")}
              help={t("analysis.settings.writeEvalsHelp")}
              checked={writeEvals.checked}
              onChange={writeEvals.onChange}
              testId={`${testId}-setting-write-evals`}
            />
          )}
        </Box>
      </Popover>
    </>
  );
}

export default BoardEngineControls;
