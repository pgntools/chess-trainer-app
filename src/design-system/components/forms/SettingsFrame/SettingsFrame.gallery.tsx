import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../gallery/types";
import WithHook from "../../../gallery/WithHook";
import SettingsSection from "../SettingsSection/SettingsSection";
import SwitchField from "../SwitchField/SwitchField";
import SettingsFrame from "./SettingsFrame";
import { useDraft } from "./useDraft";

const INITIAL = { name: "Sicilian for Black", description: "", chances: true };

const gallery: GalleryModule = {
  section: "forms",
  title: "SettingsFrame",
  demos: [
    {
      name: "A draft: Save lights up once it changes, Cancel puts it back",
      render: () => (
        <Box sx={{ height: 360 }}>
          <WithHook hook={useDraft<typeof INITIAL>} args={[INITIAL]}>
            {({ draft, update, dirty, reset, commit }) => (
              <SettingsFrame
                onSave={commit}
                onCancel={reset}
                saveLabel="Save"
                cancelLabel="Cancel"
                saveDisabled={!dirty || draft.name.trim() === ""}
                footer={
                  dirty && (
                    <Typography variant="caption" color="text.secondary">
                      Unsaved changes
                    </Typography>
                  )
                }
                testId="gallery-settings-frame"
              >
                <SettingsSection title="Name" testId="gallery-settings-frame-name">
                  <TextField size="small" label="Name" value={draft.name} onChange={(event) => update({ name: event.target.value })} fullWidth />
                  <TextField
                    size="small"
                    label="Description"
                    value={draft.description}
                    onChange={(event) => update({ description: event.target.value })}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </SettingsSection>
                <SettingsSection title="Trainer" testId="gallery-settings-frame-trainer">
                  <SwitchField label="Play chances" checked={draft.chances} onChange={(chances) => update({ chances })} testId="gallery-settings-frame-chances" />
                </SettingsSection>
              </SettingsFrame>
            )}
          </WithHook>
        </Box>
      ),
    },
    {
      name: "Busy saving",
      render: () => (
        <Box sx={{ height: 160 }}>
          <SettingsFrame onSave={() => {}} onCancel={() => {}} saveLabel="Save" cancelLabel="Cancel" busy testId="gallery-settings-frame-busy">
            <SettingsSection title="Name" testId="gallery-settings-frame-busy-name">
              <TextField size="small" label="Name" defaultValue="Openings" fullWidth />
            </SettingsSection>
          </SettingsFrame>
        </Box>
      ),
    },
  ],
};

export default gallery;
