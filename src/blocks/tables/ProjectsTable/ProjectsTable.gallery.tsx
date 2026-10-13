import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import {
  projectPickStateOf,
  projectPicksOf,
  setProjectPicks,
  toggleProjectPick,
  type ProjectPickTarget,
} from "../../../lib/analysisProjectPicks";
import type { BlockFamilyId } from "../../families";
import { HEBREW_ROWS, MODEL, treeRows } from "./fixtures";
import ProjectsTable from "./ProjectsTable";

type DemoState = { open: readonly string[]; openProjects: readonly string[]; picked: ReadonlySet<string> };

const flip = (list: readonly string[], id: string) => (list.includes(id) ? list.filter((other) => other !== id) : [...list, id]);

/** Every leaf of the whole tree — what select-all covers with no words. */
const EVERY: readonly ProjectPickTarget[] = [
  ...MODEL.cases.map((row) => ({ kind: "case" as const, id: row.id })),
  ...MODEL.projects.filter((item) => !MODEL.cases.some((row) => row.projectId === item.id)).map((item) => ({ kind: "project" as const, id: item.id })),
];

const live = (initial: Partial<DemoState>, text = "") => (
  <WithState<DemoState> initial={{ open: [], openProjects: [], picked: new Set(), ...initial }}>
    {(state, setState) => {
      const picks = projectPicksOf(MODEL, state.picked);
      const all = EVERY.every((target) => projectPickStateOf(picks, target).checked);
      const some = EVERY.some((target) => projectPickStateOf(picks, target).checked);
      return (
        <ProjectsTable
          rows={treeRows(state.open, text, state.openProjects)}
          sort={{ column: "name", direction: "asc" }}
          onSort={() => {}}
          onToggle={(id) => setState({ ...state, open: flip(state.open, id) })}
          onToggleProject={(id) => setState({ ...state, openProjects: flip(state.openProjects, id) })}
          folderLink={(folder) => ({ href: `#folder-${folder.id}` })}
          projectLink={(row) => ({ href: `#project-${row.id}` })}
          caseLink={(row) => ({ href: `#case-${row.id}` })}
          onOpenCase={() => {}}
          onFolderAction={() => {}}
          onProjectAction={() => {}}
          picks={{
            pickOf: (target) => ({
              ...projectPickStateOf(picks, target),
              onToggle: () => setState({ ...state, picked: toggleProjectPick(state.picked, MODEL, target) }),
            }),
            selectAll: {
              checked: all,
              indeterminate: some && !all,
              onToggleAll: () => setState({ ...state, picked: setProjectPicks(state.picked, MODEL, EVERY, !all) }),
            },
          }}
          filtered={text !== ""}
          testId="gallery-projects-table"
        />
      );
    }}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "ProjectsTable",
  demos: [
    { name: "Folders closed — open one by its chevron or its row", render: () => live({}) },
    { name: "Openings, Sicilian and their Projects open — the Cases under them", render: () => live({ open: ["fopen", "fsic"], openProjects: ["pnaj", "pcaro"] }) },
    {
      name: "Picks — Sicilian ticked whole, one Caro-Kann case: Openings partly ticked",
      render: () =>
        live({
          open: ["fopen", "fsic"],
          openProjects: ["pnaj", "pcaro"],
          picked: setProjectPicks(new Set(), MODEL, [{ kind: "folder", id: "fsic" }, { kind: "case", id: "ccaro1" }], true),
        }),
    },
    { name: "The words “najdorf” — the folders above it opened", render: () => live({}, "najdorf") },
    { name: "The words “lucena” — a Case found, its Project and folder opened", render: () => live({}, "lucena") },
    { name: "Nothing matches", render: () => live({}, "zzz") },
    {
      name: "A Hebrew folder, Project and Cases (switch to RTL)",
      render: () => (
        <ProjectsTable
          rows={HEBREW_ROWS}
          sort={{ column: "name", direction: "asc" }}
          onSort={() => {}}
          onToggle={() => {}}
          onToggleProject={() => {}}
          folderLink={(folder) => ({ href: `#folder-${folder.id}` })}
          projectLink={(row) => ({ href: `#project-${row.id}` })}
          caseLink={(row) => ({ href: `#case-${row.id}` })}
          onOpenCase={() => {}}
          onFolderAction={() => {}}
          onProjectAction={() => {}}
          picks={{
            pickOf: (target) => ({ checked: target.id === "cheb1", indeterminate: target.kind !== "case", onToggle: () => {} }),
            selectAll: { checked: false, indeterminate: true, onToggleAll: () => {} },
          }}
          testId="gallery-projects-table-he"
        />
      ),
    },
  ],
};

export default gallery;
