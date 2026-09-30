import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import BiotechOutlinedIcon from "@mui/icons-material/BiotechOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";

import type { GalleryModule } from "../../../gallery/types";
import CardGrid from "../CardGrid/CardGrid";
import IconCard from "./IconCard";

const gallery: GalleryModule = {
  section: "cards",
  title: "IconCard",
  demos: [
    {
      name: "Home's cards, in a medium grid",
      render: () => (
        <CardGrid size="medium" testId="gallery-icon-cards">
          <IconCard icon={<SmartToyOutlinedIcon />} label="Lobby" link={{ href: "#lobby" }} testId="gallery-icon-card-lobby" />
          <IconCard icon={<BiotechOutlinedIcon />} label="Analysis Board" link={{ href: "#analysis" }} testId="gallery-icon-card-analysis" />
          <IconCard icon={<AutoStoriesOutlinedIcon />} label="Library" link={{ href: "#library" }} testId="gallery-icon-card-library" />
        </CardGrid>
      ),
    },
    {
      name: "With a description, as a button",
      render: () => (
        <IconCard
          icon={<AutoStoriesOutlinedIcon />}
          label="Library"
          description="Game collections, with a table and a board for each game."
          onClick={() => {}}
          testId="gallery-icon-card-desc"
        />
      ),
    },
  ],
};

export default gallery;
