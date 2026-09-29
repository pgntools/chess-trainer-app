import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import PostAddRoundedIcon from "@mui/icons-material/PostAddRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";

import type { GalleryModule } from "../../../gallery/types";
import HintButton from "./HintButton";

const row = (children: ReactNode) => <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>{children}</Box>;

const gallery: GalleryModule = {
  section: "toolbars",
  title: "HintButton",
  demos: [
    {
      name: "Outlined and contained, each with its hint",
      render: () =>
        row(
          <>
            <HintButton hint="Add games to this collection from a PGN file or pasted text" variant="outlined" startIcon={<PostAddRoundedIcon fontSize="small" />} testId="gallery-hint-add">
              Add games
            </HintButton>
            <HintButton hint="Make them part of the record" variant="contained" color="success" testId="gallery-hint-update">
              Update
            </HintButton>
            <HintButton hint="Keep the record and save a copy with them" variant="outlined" testId="gallery-hint-copy">
              Save as copy
            </HintButton>
          </>,
        ),
    },
    {
      name: "Disabled — its hint still opens",
      render: () =>
        row(
          <HintButton hint="Pick some games first" variant="outlined" disabled startIcon={<ShareRoundedIcon fontSize="small" />} testId="gallery-hint-disabled">
            Analyse
          </HintButton>,
        ),
    },
    {
      name: "Busy — aria-busy and a spinner in the icon's place",
      render: () =>
        row(
          <HintButton hint="Analysing the picked games…" variant="outlined" busy disabled startIcon={<ShareRoundedIcon fontSize="small" />} testId="gallery-hint-busy">
            Analyse
          </HintButton>,
        ),
    },
    {
      name: "A link (href)",
      render: () =>
        row(
          <HintButton hint="Opens the docs" link={{ href: "#hint-button" }} variant="outlined" testId="gallery-hint-link">
            Read more
          </HintButton>,
        ),
    },
  ],
};

export default gallery;
