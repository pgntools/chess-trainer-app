import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { APPLIED, HEBREW, MIXED, PENDING } from "./fixtures";
import JobOutputsList, { type JobOutputView } from "./JobOutputsList";

const demo = (outputs: readonly JobOutputView[], downloadingKey?: string) => (
  <Box sx={{ maxWidth: 520 }}>
    <JobOutputsList
      outputs={outputs}
      onDownload={() => {}}
      renderData={(output) => (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          (the kind's view of “{output.label}” — read 1,680 games, wrote 1,671, 9 duplicates)
        </Typography>
      )}
      downloadingKey={downloadingKey}
      testId="gallery-job-outputs"
    />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "JobOutputsList",
  demos: [
    { name: "Applied — an entity, a deleted one, a file and a report", render: () => demo(APPLIED) },
    { name: "Pending — one of each kind, not yet applied", render: () => demo(PENDING) },
    { name: "Some applied, the rest pending", render: () => demo(MIXED) },
    { name: "A file being read for its download", render: () => demo(APPLIED, "pgn") },
    { name: "None yet", render: () => demo([]) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW) },
  ],
};

export default gallery;
