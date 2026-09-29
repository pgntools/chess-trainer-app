import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import SelectField from "./SelectField";

const OPENINGS = [
  { value: "B90", label: "B90 Sicilian, Najdorf" },
  { value: "C42", label: "C42 Petrov's Defence" },
  { value: "D35", label: "D35 Queen's Gambit Declined, Exchange" },
];

const gallery: GalleryModule = {
  section: "forms",
  title: "SelectField",
  demos: [
    {
      name: "With an “any” first choice (a filter)",
      render: () => (
        <WithState initial="">
          {(value, setValue) => (
            <SelectField label="Opening" value={value} onChange={setValue} options={OPENINGS} emptyOption="All openings" optionDir="ltr" testId="gallery-select" />
          )}
        </WithState>
      ),
    },
    {
      name: "A required choice, full width",
      render: () => (
        <WithState initial="1-0">
          {(value, setValue) => (
            <SelectField
              label="Result"
              value={value}
              onChange={setValue}
              options={[
                { value: "1-0", label: "White won" },
                { value: "0-1", label: "Black won" },
                { value: "1/2-1/2", label: "Draw" },
              ]}
              fullWidth
              testId="gallery-select-result"
            />
          )}
        </WithState>
      ),
    },
    {
      name: "In a column narrower than its floor — it fits, it does not overflow",
      render: () => (
        <WithState initial="1-0">
          {(value, setValue) => (
            <Box sx={{ width: 120, outline: "1px dashed", outlineColor: "divider" }}>
              <SelectField
                label="Result"
                value={value}
                onChange={setValue}
                options={[
                  { value: "1-0", label: "White won" },
                  { value: "0-1", label: "Black won" },
                ]}
                testId="gallery-select-narrow"
              />
            </Box>
          )}
        </WithState>
      ),
    },
    {
      name: "Waiting for its choices — disabled, with a helper",
      render: () => (
        <SelectField label="Opening" value="" onChange={() => {}} options={[]} emptyOption="All openings" disabled helperText="The opening book is loading…" testId="gallery-select-off" />
      ),
    },
  ],
};

export default gallery;
