import Button from "@mui/material/Button";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";

import type { GalleryModule } from "../../../gallery/types";
import { SearchField } from "../../forms";
import { BackButton, Breadcrumbs } from "../../navigation";
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
    {
      name: "A trail in the title's place, its current crumb the heading (CTA-224)",
      render: () => (
        <ListScreenHeader
          heading={
            <Breadcrumbs
              ariaLabel="Folders"
              crumbs={[
                { id: "root", label: "Projects", onClick: noop },
                { id: "openings", label: "Openings", onClick: noop },
                { id: "sicilian", label: "The Sicilian, every line a club player meets", onClick: noop },
              ]}
              current="Najdorf — the English Attack, 6. Be3 e5 7. Nb3 Be6 8. f3 and every sideline since 2020"
              currentComponent="h1"
              testId="gallery-header-trail"
            />
          }
          count="12 cases"
          wrap
          actions={
            <Button size="small" variant="contained" startIcon={<AddRoundedIcon />}>
              New case
            </Button>
          }
          testId="gallery-header-trail-demo"
        />
      ),
    },
  ],
};

export default gallery;
