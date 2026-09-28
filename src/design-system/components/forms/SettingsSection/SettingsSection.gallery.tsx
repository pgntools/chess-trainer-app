import TextField from "@mui/material/TextField";

import type { GalleryModule } from "../../../gallery/types";
import SwitchField from "../SwitchField/SwitchField";
import SettingsSection from "./SettingsSection";

const gallery: GalleryModule = {
  section: "forms",
  title: "SettingsSection",
  demos: [
    {
      name: "A heading over its fields",
      render: () => (
        <SettingsSection title="Name" testId="gallery-settings-section">
          <TextField size="small" label="Name" defaultValue="Sicilian for Black" fullWidth />
        </SettingsSection>
      ),
    },
    {
      name: "With a description",
      render: () => (
        <SettingsSection title="Trainer" description="How the trainer answers you when it plays this repertoire." testId="gallery-settings-section-desc">
          <SwitchField label="Play chances" checked onChange={() => {}} testId="gallery-settings-chances" />
        </SettingsSection>
      ),
    },
  ],
};

export default gallery;
