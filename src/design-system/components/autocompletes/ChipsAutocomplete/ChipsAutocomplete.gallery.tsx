import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import ChipsAutocomplete, { type ChipsAutocompleteProps } from "./ChipsAutocomplete";

const PLAYERS = ["Tal, Mikhail", "Fischer, Robert James", "Petrosian, Tigran", "Spassky, Boris", "Smyslov, Vasily", "Botvinnik, Mikhail"];

const live = (props: Partial<ChipsAutocompleteProps>, initial: string[]) => (
  <Box sx={{ maxWidth: 360 }}>
    <WithState initial={initial}>
      {(value, setValue) => (
        <ChipsAutocomplete label="Players" value={value} onChange={setValue} options={PLAYERS} testId="gallery-chips" {...props} />
      )}
    </WithState>
  </Box>
);

const gallery: GalleryModule = {
  section: "autocompletes",
  title: "ChipsAutocomplete",
  demos: [
    { name: "Several names, typed free (Enter makes a chip)", render: () => live({ placeholder: "Part of a name" }, []) },
    { name: "limitTags 1 — the rest read +N while not focused", render: () => live({ limitTags: 1 }, ["Tal, Mikhail", "Petrosian, Tigran", "Smyslov, Vasily"]) },
    {
      name: "Suggestions only, refreshed on open",
      render: () => (
        <Box sx={{ maxWidth: 360 }}>
          <WithState initial={{ value: [] as string[], opened: 0 }}>
            {(state, set) => (
              <ChipsAutocomplete
                label={`Players (list opened ${state.opened} times)`}
                value={state.value}
                onChange={(value) => set((before) => ({ ...before, value }))}
                onOpen={() => set((before) => ({ ...before, opened: before.opened + 1 }))}
                options={PLAYERS.slice(0, 2 + (state.opened % 4))}
                freeSolo={false}
                testId="gallery-chips-refresh"
              />
            )}
          </WithState>
        </Box>
      ),
    },
    { name: "Disabled", render: () => live({ disabled: true }, ["Fischer, Robert James"]) },
  ],
};

export default gallery;
