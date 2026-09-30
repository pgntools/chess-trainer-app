import CircularProgress from "@mui/material/CircularProgress";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTranslation } from "react-i18next";

import { IconAction } from "../../../design-system/components/toolbars";

export type PlayToggleButtonProps = {
  /** The button; the ring round it is `<testId>-spinner`. */
  testId: string;
  engineOn: boolean;
  playing: boolean;
  thinking: boolean;
  onToggle: () => void;
  /** Off for a reason of the screen's own (a resigned game), beyond the engine being off. */
  disabled?: boolean;
};

/**
 * **The header's Play / Pause** (CTA-73; a block since CTA-113) — the toggle
 * over `usePlayToggle`: the engine plays the other side's best move each
 * turn, until paused or a step back. An `IconAction`: off while the engine
 * is (its tooltip says why), pressed and primary while on, and a ring round
 * it while the engine thinks — a progress bar **named** "Engine is thinking"
 * (CTA-113: it was nameless, axe's `aria-progressbar-name`). The Analysis
 * Board, the Library's game, the Openings explorer and Play with Engine each
 * render it under their own test ids. Its words are Play's (`analysis.play.*`).
 */
function PlayToggleButton({ testId, engineOn, playing, thinking, onToggle, disabled = false }: PlayToggleButtonProps) {
  const { t } = useTranslation();
  const label = t(!engineOn ? "analysis.play.engineOff" : playing ? "analysis.play.pause" : "analysis.play.start");
  return (
    <IconAction label={label} onClick={onToggle} pressed={playing} disabled={!engineOn || disabled} testId={testId}>
      {thinking && (
        <CircularProgress
          size={30}
          thickness={3}
          aria-label={t("analysis.play.thinking")}
          data-testid={`${testId}-spinner`}
          sx={{ position: "absolute", pointerEvents: "none" }}
        />
      )}
      {playing ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
    </IconAction>
  );
}

export default PlayToggleButton;
