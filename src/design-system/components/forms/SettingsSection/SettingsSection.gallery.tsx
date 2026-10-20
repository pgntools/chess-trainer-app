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
    {
      name: "Folded, its summary beside the title",
      render: () => (
        <SettingsSection
          title="Engine"
          description="The preset sets the depth and the time per move."
          fold={{ summary: "Stockfish 19 Lite · Default · depth 20 · 5 s a move" }}
          testId="gallery-settings-section-fold"
        >
          <TextField size="small" label="Depth" defaultValue="20" fullWidth />
        </SettingsSection>
      ),
    },
    {
      name: "Folding, open at first",
      render: () => (
        <SettingsSection title="Engine" fold={{ summary: "Stockfish 19 Lite · depth 20", defaultExpanded: true }} testId="gallery-settings-section-open">
          <TextField size="small" label="Depth" defaultValue="20" fullWidth />
        </SettingsSection>
      ),
    },
  ],
};

export default gallery;
