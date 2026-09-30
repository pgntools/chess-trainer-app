import Box from "@mui/material/Box";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LastPageRoundedIcon from "@mui/icons-material/LastPageRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import { useTranslation } from "react-i18next";

import { ActionBar, IconAction } from "../../design-system/components/toolbars";

/**
 * The board's control strip: jump to start, step back, step forward, jump to
 * the end, and flip the board.
 *
 * Since CTA-113 an `ActionBar` (a named `toolbar`, the rule above it) of
 * `IconAction`s, whose span keeps a disabled step's tooltip.
 *
 * Presentational — every button is a call back out, so the ply state stays in
 * the board core (`useTreeNavigation`) and this renders against a fixture in tests. It sits at
 * the foot of the panel rather than under the board so that nothing but the
 * board itself competes for the square (see `Layout.tsx`).
 *
 * The row mirrors under Hebrew like the rest of the panel, which is what puts
 * "start" on the reader's leading edge in both directions. The chevrons keep
 * their glyphs: they point along the move list, and the list is what they move
 * through.
 */

type BoardControlsProps = {
  /** The selected half-move; 0 is the starting position. */
  ply: number;
  /** The position after the final move. */
  lastPly: number;
  onSelectPly: (ply: number) => void;
  onFlip: () => void;
};

function BoardControls({
  ply,
  lastPly,
  onSelectPly,
  onFlip,
}: BoardControlsProps) {
  const { t } = useTranslation();

  const atStart = ply <= 0;
  const atEnd = ply >= lastPly;

  const steps = [
    {
      key: "first",
      label: t("gamePanel.controls.first"),
      icon: <FirstPageRoundedIcon fontSize="small" />,
      disabled: atStart,
      onClick: () => onSelectPly(0),
    },
    {
      key: "previous",
      label: t("gamePanel.controls.previous"),
      icon: <ChevronLeftRoundedIcon fontSize="small" />,
      disabled: atStart,
      onClick: () => onSelectPly(ply - 1),
    },
    {
      key: "next",
      label: t("gamePanel.controls.next"),
      icon: <ChevronRightRoundedIcon fontSize="small" />,
      disabled: atEnd,
      onClick: () => onSelectPly(ply + 1),
    },
    {
      key: "last",
      label: t("gamePanel.controls.last"),
      icon: <LastPageRoundedIcon fontSize="small" />,
      disabled: atEnd,
      onClick: () => onSelectPly(lastPly),
    },
  ];

  return (
    <ActionBar divider="top" dense ariaLabel={t("gamePanel.controls.label")} testId="board-controls">
      {steps.map((step) => (
        <IconAction
          key={step.key}
          label={step.label}
          disabled={step.disabled}
          onClick={step.onClick}
          testId={`board-control-${step.key}`}
        >
          {step.icon}
        </IconAction>
      ))}
      {/* Pushed to the trailing edge — it acts on the board, not on the game. */}
      <Box sx={{ marginInlineStart: "auto", display: "flex" }}>
        <IconAction label={t("gamePanel.controls.flip")} onClick={onFlip} testId="board-control-flip">
          <SwapVertRoundedIcon fontSize="small" />
        </IconAction>
      </Box>
    </ActionBar>
  );
}

export default BoardControls;
