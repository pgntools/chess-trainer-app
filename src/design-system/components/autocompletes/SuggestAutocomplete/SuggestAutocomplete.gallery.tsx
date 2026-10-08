import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import type { AutocompleteOption } from "../SelectAutocomplete";
import SuggestAutocomplete from "./SuggestAutocomplete";

const RECORDS: AutocompleteOption[] = [
  { value: "/library/candidates2026", label: "Candidates 2026", group: "Library" },
  { value: "/library/tal", label: "Mikhail Tal — the games", group: "Library" },
  { value: "/repertoires/caro", label: "Caro-Kann, Advance", group: "Repertoires" },
  { value: "/repertoires/ruy", label: "ספרד — ברלין", group: "Repertoires" },
];

/** What a screen does with the text: offer the records whose name holds it. */
const narrowed = (text: string) => (text.trim() === "" ? RECORDS : RECORDS.filter((option) => option.label.toLowerCase().includes(text.trim().toLowerCase())));

const gallery: GalleryModule = {
  section: "autocompletes",
  title: "SuggestAutocomplete",
  demos: [
    {
      name: "Grouped suggestions, a path in the field",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <WithState initial="">
            {(value, setValue) => (
              <SuggestAutocomplete
                label="The address"
                value={value}
                onChange={setValue}
                options={narrowed(value)}
                dir="ltr"
                placeholder="Type a name, or paste an address"
                helperText="Copy it from the address bar, or find the record by its name."
                testId="gallery-suggest-auto"
              />
            )}
          </WithState>
        </Box>
      ),
    },
    {
      name: "Flat, no suggestions, invalid",
      render: () => (
        <Box sx={{ maxWidth: 420 }}>
          <WithState initial="/nowhere">
            {(value, setValue) => <SuggestAutocomplete label="The address" value={value} onChange={setValue} options={[]} error helperText="There is no such screen." testId="gallery-suggest-auto-flat" />}
          </WithState>
        </Box>
      ),
    },
  ],
};

export default gallery;
