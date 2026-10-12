import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { PROJECTS, SOURCE_PROJECT } from "./fixtures";
import JobTargetFields from "./JobTargetFields";
import { initialJobTarget, type JobTargetChoice } from "./jobTarget";

const demo = (initial: JobTargetChoice, projects = PROJECTS) => (
  <WithState<JobTargetChoice> initial={initial}>
    {(value, setValue) => (
      <Box sx={{ maxWidth: 520 }}>
        <JobTargetFields
          value={value}
          onChange={(patch) => setValue({ ...value, ...patch })}
          projectName={SOURCE_PROJECT}
          projects={projects}
          testId="gallery-job-target"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "JobTargetFields",
  demos: [
    { name: "New Cases in this Project (the first choice)", render: () => demo(initialJobTarget("Najdorf studies — analysis")) },
    { name: "A new linked project, its name asked", render: () => demo({ ...initialJobTarget("Najdorf studies — analysis"), kind: "linked" }) },
    { name: "An existing project — the linked one listed first", render: () => demo({ kind: "linked", linkedMode: "existing", newName: "", projectId: "p-linked" }) },
    { name: "No other project: Existing disabled, the name left empty", render: () => demo({ ...initialJobTarget(""), kind: "linked" }, []) },
    { name: "Into this Case — one variant", render: () => demo({ ...initialJobTarget(""), kind: "case" }) },
  ],
};

export default gallery;
