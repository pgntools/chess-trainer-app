import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";

import type { LinkTarget } from "../../link";
import { CardShell } from "../cardShell";

export type FolderCardProps = {
  name: ReactNode;
  /** What is in it ("12 games"). */
  count?: ReactNode;
  onOpen?: () => void;
  link?: LinkTarget;
  /** The square's accessible name ("Open Openings"). */
  openLabel: string;
  /** The big icon in the square. Default: an outlined folder. */
  icon?: ReactNode;
  actions?: ReactNode;
  /** The card's test id; the parts are `-open` and `-name`. */
  testId: string;
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
