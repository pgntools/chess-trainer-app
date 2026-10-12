import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { HEBREW_ROWS, treeRows } from "./fixtures";
import ProjectsTable from "./ProjectsTable";

const live = (initialOpen: readonly string[], text = "") => (
  <WithState<readonly string[]> initial={initialOpen}>
    {(open, setOpen) => (
      <ProjectsTable
        rows={treeRows(open, text)}
        sort={{ column: "name", direction: "asc" }}
        onSort={() => {}}
        onToggle={(id) => setOpen(open.includes(id) ? open.filter((other) => other !== id) : [...open, id])}
        folderLink={(folder) => ({ href: `#folder-${folder.id}` })}
        projectLink={(row) => ({ href: `#project-${row.id}` })}
        onFolderAction={() => {}}
        onProjectAction={() => {}}
        filtered={text !== ""}
        testId="gallery-projects-table"
      />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "ProjectsTable",
  demos: [
    { name: "Folders closed — open one by its chevron or its row", render: () => live([]) },
    { name: "Openings and Sicilian open", render: () => live(["fopen", "fsic"]) },
    { name: "The words “najdorf” — the folders above it opened", render: () => live([], "najdorf") },
    { name: "Nothing matches", render: () => live([], "zzz") },
    {
      name: "A Hebrew folder and Project (switch to RTL)",
      render: () => (
        <ProjectsTable
          rows={HEBREW_ROWS}
          sort={{ column: "name", direction: "asc" }}
          onSort={() => {}}
          onToggle={() => {}}
          folderLink={(folder) => ({ href: `#folder-${folder.id}` })}
          projectLink={(row) => ({ href: `#project-${row.id}` })}
          onFolderAction={() => {}}
          onProjectAction={() => {}}
          testId="gallery-projects-table-he"
        />
      ),
    },
  ],
};

export default gallery;
