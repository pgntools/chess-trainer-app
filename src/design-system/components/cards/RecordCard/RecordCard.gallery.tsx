import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import { demoPreview } from "../../../gallery/demoPreview";
import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import { IconAction } from "../../toolbars";
import RecordCard from "./RecordCard";

const narrow = (card: ReactNode) => <Box sx={{ width: 220 }}>{card}</Box>;

const gallery: GalleryModule = {
  section: "cards",
  title: "RecordCard",
  demos: [
    {
      name: "Preview, name, caption, an action and a pick",
      render: () =>
        narrow(
          <WithState initial={false}>
            {(picked, setPicked) => (
              <RecordCard
                preview={demoPreview}
                name="Najdorf, 6.Bg5 — the Poisoned Pawn"
                caption="B97 · 24 moves"
                onOpen={() => {}}
                openLabel="Open Najdorf"
                actions={
                  <IconAction label="Download" testId="gallery-record-card-download">
                    <DownloadRoundedIcon fontSize="small" />
                  </IconAction>
                }
                pick={{ checked: picked, onToggle: () => setPicked(!picked), label: "Pick Najdorf" }}
                testId="gallery-record-card"
              />
            )}
          </WithState>,
        ),
    },
    {
      name: "Name only, opened by a link",
      render: () => narrow(<RecordCard preview={demoPreview} name="ספרדית" link={{ href: "#card" }} openLabel="Open" testId="gallery-record-card-link" />),
    },
  ],
};

export default gallery;
