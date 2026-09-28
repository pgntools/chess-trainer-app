import Button from "@mui/material/Button";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";

import type { GalleryModule } from "../../../gallery/types";
import { SearchField } from "../../forms";
import { BackButton } from "../../navigation";
import IconAction from "../IconAction/IconAction";
import ListScreenHeader from "./ListScreenHeader";

const noop = () => {};

const gallery: GalleryModule = {
  section: "toolbars",
  title: "ListScreenHeader",
  demos: [
    {
      name: "Title and count, one action",
      render: () => (
        <ListScreenHeader
          title="Library"
          count="12 collections"
          actions={
            <IconAction label="New folder" onClick={noop} testId="gallery-header-new-folder">
              <CreateNewFolderOutlinedIcon fontSize="small" />
            </IconAction>
          }
          testId="gallery-header"
        />
      ),
    },
    {
      name: "With back — a name the reader typed, cut short",
      render: () => (
        <ListScreenHeader
          back={<BackButton label="Back to the Library" onClick={noop} testId="gallery-header-back" />}
          title="Tal — every game he played in the Soviet championships, 1951 to 1978"
          titleDir="auto"
          count="3 of 2,636 games"
          actions={
            <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />}>
              Add games
            </Button>
          }
          testId="gallery-header-back-demo"
        />
      ),
    },
    {
      name: "Wrapping actions, with a second row",
      render: () => (
        <ListScreenHeader
          title="Saved analyses"
          count="48 analyses"
          wrap
          actions={
            <>
              <Button size="small" variant="contained">
                New analysis
              </Button>
              <Button size="small">New folder</Button>
            </>
          }
          testId="gallery-header-wrap"
        >
          <SearchField value="" onChange={noop} placeholder="Filter by name" clearLabel="Clear" testId="gallery-header-search" />
        </ListScreenHeader>
      ),
    },
  ],
};

export default gallery;
