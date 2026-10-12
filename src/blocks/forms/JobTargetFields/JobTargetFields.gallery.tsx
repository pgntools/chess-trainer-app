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
    { name: "New Cases in this Project (the first choice)", render: () => demo(initialJobTarget("Carlsen – Caruana — analysis")) },
    { name: "Another project, a new one named after the Case", render: () => demo({ ...initialJobTarget("Carlsen – Caruana — analysis"), kind: "other" }) },
    { name: "Another project, an existing one", render: () => demo({ kind: "other", otherMode: "existing", newName: "", projectId: "p-lines" }) },
    { name: "No other project: Existing disabled, the name left empty", render: () => demo({ ...initialJobTarget(""), kind: "other" }, []) },
    { name: "Into this Case — one variant", render: () => demo({ ...initialJobTarget(""), kind: "case" }) },
  ],
};

export default gallery;
