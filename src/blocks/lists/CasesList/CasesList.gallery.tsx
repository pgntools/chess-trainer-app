import type { GalleryModule } from "../../../design-system/gallery/types";
import type { AnalysisCase } from "../../../lib/analysisProjects";
import type { BlockFamilyId } from "../../families";
import CasesList from "./CasesList";
import { CASES, HEBREW_CASES, manyCases } from "./fixtures";

const demo = (cases: readonly AnalysisCase[], canMove = true) => (
  <CasesList
    cases={cases}
    caseLink={(id) => ({ href: `#case-${id}` })}
    onCaseAction={() => {}}
    canMove={canMove}
    testId="gallery-cases-list"
  />
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "CasesList",
  demos: [
    { name: "A Game named by its tags, a Position by its side to move, one named by the reader", render: () => demo(CASES) },
    { name: "The only Project — Move is off", render: () => demo(CASES, false) },
    { name: "Empty", render: () => demo([]) },
    { name: "Thirty Cases", render: () => demo(manyCases(30)) },
    { name: "A Hebrew name (switch to RTL)", render: () => demo(HEBREW_CASES) },
  ],
};

export default gallery;
