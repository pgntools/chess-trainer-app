import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { GAMES, LABELS, PASTED } from "./fixtures";
import PgnInput from "./PgnInput";

type State = { pasted: string; selected: number };

const demo = ({ games = false, busy, problem, initial = "" }: { games?: boolean; busy?: string; problem?: { message: string; detail?: string }; initial?: string } = {}) => (
  <WithState<State> initial={{ pasted: initial, selected: 0 }}>
    {(state, set) => (
      <Box sx={{ width: 360 }}>
        <PgnInput
          labels={LABELS}
          onFiles={() => {}}
          pasted={state.pasted}
          onPastedChange={(pasted) => set((before) => ({ ...before, pasted }))}
          onSubmit={() => {}}
          busy={busy}
          disabled={busy !== undefined}
          problem={problem}
          games={games ? GAMES : undefined}
          selectedGame={state.selected}
          onSelectGame={(selected) => set((before) => ({ ...before, selected }))}
          testId="gallery-pgn-input"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "PgnInput",
  demos: [
    { name: "Empty — a file, or a paste", render: () => demo() },
    { name: "A game pasted", render: () => demo({ initial: PASTED }) },
    { name: "A file of three games — pick one (the position editor)", render: () => demo({ games: true }) },
    { name: "Reading", render: () => demo({ busy: "Reading…", initial: PASTED }) },
    { name: "A problem", render: () => demo({ problem: { message: "No line in it could be read.", detail: "Game 1: invalid move Zz9" } }) },
  ],
};

export default gallery;
