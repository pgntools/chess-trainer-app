import { useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import type { LinkTarget } from "../../link";
import IconAction from "../../toolbars/IconAction/IconAction";

export type BackButtonProps = {
  /** Where it goes, in words — "Back to the Library" — the tooltip and the name. */
  label: string;
  onClick?: () => void;
  /** Go back by a link instead (a real `href`, so a middle click opens a tab). */
  link?: LinkTarget;
  /** Pull it into the row's leading padding (the default), as MUI's `edge="start"`. */
  edge?: "start" | false;
  testId: string;
};

/**
 * **The back arrow** (CTA-108) that starts a screen's header — an
 * `IconAction` with the arrow **pointing the way back**: left in a
 * left-to-right language, right under RTL (the glyph is mirrored with an
 * inline `transform`, which the RTL stylis plugin leaves alone).
 */
function BackButton({ label, onClick, link, edge = "start", testId }: BackButtonProps) {
  const { direction } = useTheme();
  return (
    <IconAction label={label} onClick={onClick} link={link} edge={edge} testId={testId}>
      <ArrowBackRoundedIcon
        fontSize="small"
        data-testid={`${testId}-icon`}
        style={direction === "rtl" ? { transform: "scaleX(-1)" } : undefined}
      />
    </IconAction>
  );
}

export default BackButton;
