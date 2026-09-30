import type { MouseEvent, ReactNode } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import { linkProps, type LinkTarget } from "../../link";

export type IconActionProps = {
  /** The tooltip, and the button's accessible name. */
  label: string;
  /** The icon, `fontSize="small"`. */
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Go somewhere instead: a router link or an `href`. */
  link?: LinkTarget;
  disabled?: boolean;
  /**
   * A toggle: `true` / `false` sets `aria-pressed` and paints it primary
   * while pressed. Absent, it is a plain action.
   */
  pressed?: boolean;
  /** A colour of its own, for an action that is not a toggle ("error" for a delete). */
  color?: "default" | "primary" | "error";
  /** `start` / `end` pulls it into the row's padding, as MUI's `edge`. */
  edge?: "start" | "end" | false;
  /**
   * It opens a menu (CTA-113): `aria-haspopup="menu"`, and `aria-expanded`
   * saying whether that menu is open now. Absent, it opens nothing.
   */
  popupOpen?: boolean;
  testId: string;
};

/**
 * **An icon-only action** (CTA-108): a small `IconButton` under its tooltip,
 * named by the tooltip's words. It always sits in an inline-flex `span`, so a
 * **disabled** action still shows its tooltip — the three span styles the
 * app's 52 icon buttons used, made one. `pressed` makes it a toggle (the map's
 * "show moves"); `link` makes it a link (the Lobby's Analysis and Continue).
 */
function IconAction({
  label,
  children,
  onClick,
  link,
  disabled = false,
  pressed,
  color,
  edge = false,
  popupOpen,
  testId,
}: IconActionProps) {
  return (
    <Tooltip title={label}>
      <Box component="span" sx={{ display: "inline-flex", flexShrink: 0 }}>
        <IconButton
          size="small"
          edge={edge}
          aria-label={label}
          aria-pressed={pressed}
          aria-haspopup={popupOpen === undefined ? undefined : "menu"}
          aria-expanded={popupOpen}
          color={pressed === true ? "primary" : (color ?? "default")}
          disabled={disabled}
          onClick={onClick}
          data-testid={testId}
          {...linkProps(link)}
        >
          {children}
        </IconButton>
      </Box>
    </Tooltip>
  );
}

export default IconAction;
