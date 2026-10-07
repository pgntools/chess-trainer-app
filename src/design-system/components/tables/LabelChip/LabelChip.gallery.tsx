import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import LabelChip, { type LabelChipTone } from "./LabelChip";

const TONES: [LabelChipTone, string, string][] = [
  ["warning", "GM", "Grandmaster"],
  ["info", "IM", "International Master"],
  ["success", "FM", "FIDE Master"],
  ["secondary", "CM", "Candidate Master"],
  ["primary", "NM", "National Master"],
  ["error", "X", "Withdrawn"],
];

const gallery: GalleryModule = {
  section: "tables",
  title: "LabelChip",
  demos: [
    {
      name: "The six tones, beside names — each read by what its letters stand for",
      render: () => (
        <Box sx={{ display: "grid", gap: 1 }}>
          {TONES.map(([tone, label, name]) => (
            <Box key={tone}>
              <LabelChip tone={tone} label={label} name={name} /> Ada Lovelace
            </Box>
          ))}
        </Box>
      ),
    },
    {
      name: "No name — the letters themselves are read",
      render: () => (
        <Box>
          <LabelChip tone="info" label="New" /> Alan Turing
        </Box>
      ),
    },
    {
      name: "Hebrew names (switch the direction to RTL)",
      render: () => (
        <Box>
          <LabelChip tone="warning" label="GM" name="רב-אמן" /> עדה לאבלייס
        </Box>
      ),
    },
  ],
};

export default gallery;
