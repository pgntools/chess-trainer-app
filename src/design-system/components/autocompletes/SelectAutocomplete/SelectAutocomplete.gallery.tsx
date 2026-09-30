import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import SelectAutocomplete, { type AutocompleteOption } from "./SelectAutocomplete";

const OPENINGS: AutocompleteOption[] = [
  { value: "B90", label: "B90 Sicilian, Najdorf", group: "B — Semi-open" },
  { value: "B12", label: "B12 Caro-Kann, Advance", group: "B — Semi-open" },
  { value: "C42", label: "C42 Petrov's Defence", group: "C — Open" },
  { value: "C65", label: "C65 Ruy Lopez, Berlin", group: "C — Open" },
  { value: "D35", label: "D35 QGD, Exchange", group: "D — Closed" },
];

const EVENTS: AutocompleteOption[] = [
  { value: "curacao-1962", label: "Candidates, Curaçao 1962" },
  { value: "ussr-1957", label: "USSR Championship 1957" },
  { value: "bled-1961", label: "Bled 1961" },
];

const gallery: GalleryModule = {
  section: "autocompletes",
  title: "SelectAutocomplete",
  demos: [
    {
      name: "Grouped, LTR options (ECO codes)",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={null as string | null}>
            {(value, setValue) => (
              <SelectAutocomplete label="Opening" value={value} onChange={setValue} options={OPENINGS} optionDir="ltr" placeholder="Type B9 or najdorf" testId="gallery-select-auto" />
            )}
          </WithState>
        </Box>
      ),
    },
    {
      name: "Flat, a value chosen",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={"bled-1961" as string | null}>
            {(value, setValue) => <SelectAutocomplete label="Event" value={value} onChange={setValue} options={EVENTS} testId="gallery-select-auto-flat" />}
          </WithState>
        </Box>
      ),
    },
    {
      name: "Not clearable",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={"ussr-1957" as string | null}>
            {(value, setValue) => (
              <SelectAutocomplete label="Event" value={value} onChange={setValue} options={EVENTS} clearable={false} testId="gallery-select-auto-required" />
            )}
          </WithState>
        </Box>
      ),
    },
  ],
};

export default gallery;
