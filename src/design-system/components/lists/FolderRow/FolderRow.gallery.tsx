import List from "@mui/material/List";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";

import type { GalleryModule } from "../../../gallery/types";
import { IconAction } from "../../toolbars";
import FolderRow from "./FolderRow";

const gallery: GalleryModule = {
  section: "lists",
  title: "FolderRow",
  demos: [
    {
      name: "With four actions",
      render: () => (
        <List disablePadding>
          <FolderRow
            name="Openings"
            count="12 games"
            onOpen={() => {}}
            actions={
              <>
                <IconAction label="Download" testId="gallery-folder-row-download">
                  <DownloadRoundedIcon fontSize="small" />
                </IconAction>
                <IconAction label="Rename" testId="gallery-folder-row-rename">
                  <EditOutlinedIcon fontSize="small" />
                </IconAction>
                <IconAction label="Move to…" testId="gallery-folder-row-move">
                  <DriveFileMoveOutlinedIcon fontSize="small" />
                </IconAction>
                <IconAction label="Delete" testId="gallery-folder-row-delete">
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconAction>
              </>
            }
            testId="gallery-folder-row"
          />
        </List>
      ),
    },
    {
      name: "A link, its own icon, no actions",
      render: () => (
        <List disablePadding>
          <FolderRow name="Openings for Black" count="3 repertoires" link={{ href: "#folder" }} icon={<FolderSpecialOutlinedIcon />} testId="gallery-folder-row-link" />
        </List>
      ),
    },
  ],
};

export default gallery;
