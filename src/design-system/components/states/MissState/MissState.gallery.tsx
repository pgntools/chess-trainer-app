import type { GalleryModule } from "../../../gallery/types";
import MissState from "./MissState";

const gallery: GalleryModule = {
  section: "states",
  title: "MissState",
  demos: [
    {
      name: "A title, the words and the way back",
      render: () => (
        <MissState title="No such collection" backLabel="Back to the Library" onBack={() => {}} testId="gallery-miss">
          It may have been deleted, or the link is old.
        </MissState>
      ),
    },
    {
      name: "Words only, the way back a link",
      render: () => (
        <MissState backLabel="Back to Repertoires" backLink={{ href: "#repertoires" }} testId="gallery-miss-link">
          This repertoire is not here any more.
        </MissState>
      ),
    },
  ],
};

export default gallery;
