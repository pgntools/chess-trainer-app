import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { HEBREW_RUNNING, HELD_EMPTY, HELD_QUEUED, LIVE_WORDS, RUNNING } from "./fixtures";
import JobsIndicatorView, { type JobsIndicatorViewProps } from "./JobsIndicatorView";

const demo = (props: Partial<JobsIndicatorViewProps>) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <JobsIndicatorView queuedCount={0} link={{ href: "#jobs" }} compact={false} announcement="" testId="gallery-jobs-indicator" {...props} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "JobsIndicatorView",
  demos: [
    { name: "A job running — its progress, its title out of sight", render: () => demo({ running: RUNNING, queuedCount: 2 }) },
    { name: "Compact — an icon alone, named in full", render: () => demo({ running: RUNNING, compact: true, liveWords: LIVE_WORDS }) },
    { name: "The queue alone", render: () => demo({ queuedCount: 3 }) },
    {
      name: "The engine heard — the spinner beats once per word (Hear the engine)",
      render: () => (
        <WithState<number> initial={0}>
          {(heardAt, setHeardAt) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {demo({ running: RUNNING, heardAt, liveWords: LIVE_WORDS })}
              <Button size="small" variant="outlined" onClick={() => setHeardAt(Date.now())}>
                Hear the engine
              </Button>
            </Box>
          )}
        </WithState>
      ),
    },
    {
      name: "Nothing runs or waits — no link, its status region kept",
      render: () => (
        <Box>
          {demo({})}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            (nothing shown)
          </Typography>
        </Box>
      ),
    },
    { name: "The queue paused (CTA-258) — jobs waiting, a pause icon for the spinner", render: () => demo(HELD_QUEUED) },
    { name: "The queue paused, nothing waiting — still shown", render: () => demo(HELD_EMPTY) },
    { name: "The queue paused, compact — named in full", render: () => demo({ ...HELD_QUEUED, compact: true }) },
    { name: "A Hebrew title (switch the direction to RTL)", render: () => demo({ running: HEBREW_RUNNING }) },
  ],
};

export default gallery;
