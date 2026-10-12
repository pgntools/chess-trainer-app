import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { FOLDERS, HEBREW, manyProjects, PROJECTS } from "./fixtures";
import ProjectsList, { type ProjectsListProps } from "./ProjectsList";

const link = (to: string) => ({ href: `#${to}` });

const demo = (folders: ProjectsListProps["folders"], projects: ProjectsListProps["projects"]) => (
  <ProjectsList
    folders={folders}
    projects={projects}
    folderLink={(id) => link(`folder-${id}`)}
    projectLink={(id) => link(`project-${id}`)}
    onFolderAction={() => {}}
    onProjectAction={() => {}}
    testId="gallery-projects-list"
  />
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "ProjectsList",
  demos: [
    { name: "A folder: its sub-folders, then its Projects", render: () => demo(FOLDERS, PROJECTS) },
    { name: "Projects only", render: () => demo([], PROJECTS) },
    { name: "Empty", render: () => demo([], []) },
    { name: "Forty Projects", render: () => demo([], manyProjects(40)) },
    { name: "Hebrew names (switch to RTL)", render: () => demo(HEBREW.folders, HEBREW.projects) },
  ],
};

export default gallery;
