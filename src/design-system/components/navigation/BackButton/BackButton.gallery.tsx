import type { GalleryModule } from "../../../gallery/types";
import BackButton from "./BackButton";

const gallery: GalleryModule = {
  section: "navigation",
  title: "BackButton",
  demos: [
    {
      name: "A button — the arrow flips under RTL (switch the direction)",
      render: () => <BackButton label="Back to the Library" onClick={() => {}} testId="gallery-back" />,
    },
    {
      name: "A link",
      render: () => <BackButton label="Back to the Lobby" link={{ href: "#lobby" }} testId="gallery-back-link" />,
    },
  ],
};

export default gallery;
