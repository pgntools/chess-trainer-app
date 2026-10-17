import Box from "@mui/material/Box";

import { SettingsFrame } from "../../../design-system/components/forms";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { CollectionSettingsForm, type CollectionSettingsDraft } from "../../forms";
import CollectionDetails, { type CollectionDetailsGeneral, type CollectionDetailsTab } from "./CollectionDetails";
import { CLOSE_LINK, EMPTY, HEBREW_NAME, LONG_NAME, NAME, ONE_EVENT, SHIPPED, SOURCED, SOURCED_TOURNAMENT, TOURNAMENT, UPLOADED } from "./fixtures";

type Demo = { name?: string; general?: CollectionDetailsGeneral; tab?: CollectionDetailsTab; readOnly?: boolean };

const demo = ({ name = NAME, general = UPLOADED, tab = "general", readOnly = false }: Demo) => (
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
    { name: "An upload naming its source — the Source card", render: () => demo({ general: SOURCED }) },
    { name: "A tournament from two sources", render: () => demo({ name: "FIDE Candidates 2026", general: SOURCED_TOURNAMENT }) },
    { name: "Options: the settings", render: () => demo({ tab: "options" }) },
    { name: "Options of a shipped file: read-only", render: () => demo({ name: "Tal", general: SHIPPED, tab: "options", readOnly: true }) },
    { name: "A long name, wrapping in the head", render: () => demo({ name: LONG_NAME }) },
    { name: "A Hebrew name (switch to RTL)", render: () => demo({ name: HEBREW_NAME }) },
  ],
};

export default gallery;
