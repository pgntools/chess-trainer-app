import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";

import type { LinkTarget } from "../../link";
import { CardShell } from "../cardShell";

export type FolderCardProps = {
  name: ReactNode;
  /** What is in it ("12 games"). */
  count?: ReactNode;
  /**
   * A third line (CTA-113), for a grid whose record cards carry one (the
   * saved analyses' opening): a blank `" "` keeps the folder as tall as they are.
   */
  detail?: ReactNode;
  onOpen?: () => void;
  link?: LinkTarget;
  /** The square's accessible name ("Open Openings"). */
  openLabel: string;
  /** The big icon in the square. Default: an outlined folder. */
  icon?: ReactNode;
  actions?: ReactNode;
  /**
   * The folder's pick (CTA-147) — `CardShell`'s: a lobby picks folders and
   * records alike, a folder's covering its whole subtree.
   */
  pick?: { checked: boolean; indeterminate?: boolean; onToggle: () => void; label: string };
  /** The card's test id; the parts are `-open`, `-pick` and `-name`. */
  testId: string;
  /** The square's own test id, for a screen whose tests named it before it moved onto this card (CTA-113). */
  openTestId?: string;
  /** The pick's and the name's own test ids (CTA-147). */
  pickTestId?: string;
  nameTestId?: string;
};

/**
 * **A folder as a card** (CTA-108): a square with a large folder icon on a
 * tinted fill, where a record card has its preview, then the same caption
 * row — so in a grid of boards a folder stands exactly as tall as its
 * neighbours.
 */
function FolderCard({ icon, count, ...props }: FolderCardProps) {
  return (
    <CardShell
      caption={count}
      square={
        <Box
          aria-hidden="true"
          sx={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            bgcolor: "action.hover",
            color: "text.secondary",
            "& svg": { fontSize: "3rem" },
          }}
        >
          {icon ?? <FolderOutlinedIcon />}
        </Box>
      }
      {...props}
    />
  );
}

export default FolderCard;
