import Box from "@mui/material/Box";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";

import type { GalleryModule } from "../../../gallery/types";
import { IconAction } from "../../toolbars";
import FolderCard from "./FolderCard";

const gallery: GalleryModule = {
  section: "cards",
  title: "FolderCard",
  demos: [
    {
      name: "With a count and an action",
      render: () => (
        <Box sx={{ width: 220 }}>
          <FolderCard
            name="Openings"
            count="12 analyses"
            onOpen={() => {}}
            openLabel="Open Openings"
            actions={
              <IconAction label="Delete" testId="gallery-folder-card-delete">
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconAction>
            }
            testId="gallery-folder-card"
          />
        </Box>
      ),
    },
    {
      name: "Picked and partly picked (CTA-147) — a lobby's folders are picked like their records",
      render: () => (
        <Box sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ width: 220 }}>
            <FolderCard
              name="Openings"
              count="12 analyses"
              onOpen={() => {}}
              openLabel="Open Openings"
              pick={{ checked: true, onToggle: () => {}, label: "Select Openings" }}
              testId="gallery-folder-card-picked"
            />
          </Box>
          <Box sx={{ width: 220 }}>
            <FolderCard
              name="Endgames"
              count="8 analyses"
              onOpen={() => {}}
              openLabel="Open Endgames"
              pick={{ checked: false, indeterminate: true, onToggle: () => {}, label: "Select Endgames" }}
              testId="gallery-folder-card-partly"
            />
          </Box>
        </Box>
      ),
    },
    {
      name: "Its own icon, no count — still two caption lines",
      render: () => (
        <Box sx={{ width: 220 }}>
          <FolderCard name="Built-in" icon={<FolderSpecialOutlinedIcon />} link={{ href: "#builtin" }} openLabel="Open Built-in" testId="gallery-folder-card-plain" />
        </Box>
      ),
    },
  ],
};

export default gallery;
