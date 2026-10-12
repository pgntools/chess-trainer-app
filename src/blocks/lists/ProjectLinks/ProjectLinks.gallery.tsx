import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { LINKED_FROM, LINKS_TO } from "./fixtures";
import ProjectLinks from "./ProjectLinks";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "ProjectLinks",
  demos: [
    {
      name: "Links to two, linked from one",
      render: () => <ProjectLinks linksTo={LINKS_TO} linkedFrom={LINKED_FROM} onUnlink={() => {}} testId="gallery-project-links" />,
    },
    {
      name: "Linked from one only",
      render: () => <ProjectLinks linksTo={[]} linkedFrom={LINKED_FROM} onUnlink={() => {}} testId="gallery-project-links-from" />,
    },
  ],
};

export default gallery;
