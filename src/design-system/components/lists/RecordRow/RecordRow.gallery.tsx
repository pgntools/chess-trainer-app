import List from "@mui/material/List";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import { IconAction } from "../../toolbars";
import RecordRow from "./RecordRow";

const actions = (id: string) => (
  <>
    <IconAction label="Download" testId={`gallery-record-${id}-download`}>
      <DownloadRoundedIcon fontSize="small" />
    </IconAction>
    <IconAction label="Settings" testId={`gallery-record-${id}-settings`}>
      <SettingsOutlinedIcon fontSize="small" />
    </IconAction>
  </>
);

const gallery: GalleryModule = {
  section: "lists",
  title: "RecordRow",
  demos: [
    {
      name: "Full — caption, description, Open, actions and a pick",
      render: () => (
        <WithState initial={false}>
          {(picked, setPicked) => (
            <List disablePadding>
              <RecordRow
                name="Najdorf, 6.Bg5 — the Poisoned Pawn"
                caption="Sicilian, Najdorf · B97 · 24 moves · 2026-09-03"
                description="Checked every line to move 20 with the engine at depth 22."
                primaryAction={{ label: "Open", onClick: () => {} }}
                actions={actions("full")}
                pick={{ checked: picked, onToggle: () => setPicked(!picked), label: "Pick Najdorf" }}
                testId="gallery-record-full"
              />
            </List>
          )}
        </WithState>
      ),
    },
    {
      name: "Name and caption only",
      render: () => (
        <List disablePadding>
          <RecordRow name="Ruy Lopez — the Berlin" caption="C65 · 12 moves" testId="gallery-record-plain" />
        </List>
      ),
    },
    {
      name: "Open as a link, no pick",
      render: () => (
        <List disablePadding>
          <RecordRow
            name="Caro-Kann for Black"
            caption="42 lines"
            primaryAction={{ label: "Open", link: { href: "#caro-kann" } }}
            actions={actions("link")}
            testId="gallery-record-link"
          />
        </List>
      ),
    },
  ],
};

export default gallery;
