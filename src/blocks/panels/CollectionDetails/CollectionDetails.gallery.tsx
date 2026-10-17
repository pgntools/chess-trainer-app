import Box from "@mui/material/Box";

import { SettingsFrame } from "../../../design-system/components/forms";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { CollectionSettingsForm, type CollectionSettingsDraft } from "../../forms";
import { EntityJobs } from "../../lists";
import type { JobRowView } from "../../tables";
import CollectionDetails, { type CollectionDetailsGeneral, type CollectionDetailsTab } from "./CollectionDetails";
import { CLOSE_LINK, EMPTY, HEBREW_NAME, JOBS, LONG_NAME, NAME, ONE_EVENT, SHIPPED, TOURNAMENT, UPLOADED } from "./fixtures";

type Demo = { name?: string; general?: CollectionDetailsGeneral; tab?: CollectionDetailsTab; readOnly?: boolean; jobs?: readonly JobRowView[] | undefined };

const demo = ({ name = NAME, general = UPLOADED, tab = "general", readOnly = false, jobs = JOBS }: Demo) => (
  <WithState<{ tab: CollectionDetailsTab; draft: CollectionSettingsDraft }> initial={{ tab, draft: { name, description: "", tournament: { enabled: false, type: "swiss" } } }}>
    {(state, setState) => (
      <Box sx={{ width: 400, height: 520, display: "flex", flexDirection: "column" }}>
        <CollectionDetails
          name={name}
          closeLink={CLOSE_LINK}
          tab={state.tab}
          onTabChange={(next) => setState({ ...state, tab: next })}
          general={general}
          options={
            readOnly ? undefined : (
              <SettingsFrame onSave={() => {}} onCancel={() => {}} saveLabel="Save" cancelLabel="Cancel" testId="gallery-collection-details-settings">
                <CollectionSettingsForm
                  value={state.draft}
                  onChange={(patch) => setState({ ...state, draft: { ...state.draft, ...patch } })}
                  canBeTournament
                  testId="gallery-collection-details-settings-form"
                />
              </SettingsFrame>
            )
          }
          jobs={
            <EntityJobs
              jobs={jobs}
              jobLink={(job) => ({ href: `#job-${job.id}` })}
              onNewJob={() => {}}
              label="This collection's jobs"
              emptyText="No jobs for this collection yet."
              testId="gallery-collection-details-jobs-list"
            />
          }
          testId="gallery-collection-details"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "CollectionDetails",
  demos: [
    { name: "An upload — General: its description and facts", render: () => demo({}) },
    { name: "A shipped file — no description, no date added", render: () => demo({ name: "Tal", general: SHIPPED }) },
    { name: "One event, never described", render: () => demo({ general: ONE_EVENT }) },
    { name: "An empty collection", render: () => demo({ general: EMPTY }) },
    { name: "A tournament — General: the event's card", render: () => demo({ name: "FIDE Candidates 2026", general: TOURNAMENT }) },
    { name: "Options: the settings", render: () => demo({ tab: "options" }) },
    { name: "Options of a shipped file: read-only", render: () => demo({ name: "Tal", general: SHIPPED, tab: "options", readOnly: true }) },
    { name: "Jobs: a merge running, one done", render: () => demo({ tab: "jobs" }) },
    { name: "Jobs: none yet", render: () => demo({ tab: "jobs", jobs: [] }) },
    { name: "A long name, wrapping in the head", render: () => demo({ name: LONG_NAME }) },
    { name: "A Hebrew name (switch to RTL)", render: () => demo({ name: HEBREW_NAME }) },
  ],
};

export default gallery;
