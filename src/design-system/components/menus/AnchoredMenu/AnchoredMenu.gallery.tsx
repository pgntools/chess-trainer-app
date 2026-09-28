import Button from "@mui/material/Button";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import AnchoredMenu, { type AnchoredMenuEntry } from "./AnchoredMenu";

const menu = (label: string, entries: AnchoredMenuEntry[]) => (
  <WithState initial={null as HTMLElement | null}>
    {(anchorEl, setAnchorEl) => (
      <>
        <Button
          size="small"
          variant="outlined"
          endIcon={<ExpandMoreRoundedIcon />}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ justifySelf: "start" }}
        >
          {label}
        </Button>
        <AnchoredMenu anchorEl={anchorEl} onClose={() => setAnchorEl(null)} entries={entries} testId="gallery-anchored-menu" />
      </>
    )}
  </WithState>
);

const gallery: GalleryModule = {
  section: "menus",
  title: "AnchoredMenu",
  demos: [
    {
      name: "Link entries, the current one marked (click the button)",
      render: () =>
        menu("Games", [
          { id: "player", label: "Player", link: { href: "#player" }, selected: true },
          { id: "backtracking", label: "Backtracking", link: { href: "#backtracking" } },
          { id: "drill", label: "Drill", link: { href: "#drill" } },
        ]),
    },
    {
      name: "Action entries with icons",
      render: () =>
        menu("Start", [
          { id: "white", label: "Play as White", icon: <SportsEsportsOutlinedIcon fontSize="small" />, onClick: () => {} },
          { id: "black", label: "Play as Black", icon: <SportsEsportsOutlinedIcon fontSize="small" />, onClick: () => {}, disabled: true },
        ]),
    },
  ],
};

export default gallery;
