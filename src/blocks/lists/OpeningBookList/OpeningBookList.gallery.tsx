import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { KnownMoveOpening } from "../../../lib/openings";
import type { BlockFamilyId } from "../../families";
import { LONG_NAME, START_MOVES } from "./fixtures";
import OpeningBookList from "./OpeningBookList";

type DemoState = { played: string | null; hovered: string | null };

/** The list, what it last played and the row it is over — the arrow the screen would recolour. */
const demo = (moves: readonly KnownMoveOpening[]) => (
  <WithState<DemoState> initial={{ played: null, hovered: null }}>
    {(state, set) => (
      <Box sx={{ maxWidth: 320, display: "grid", gap: 1 }}>
        <OpeningBookList
          moves={moves}
          onPlay={(played) => set((before) => ({ ...before, played }))}
          onHover={(move) => set((before) => ({ ...before, hovered: move?.san ?? null }))}
          testId="gallery-book"
        />
        <Typography variant="caption" color="text.secondary">
          Played: {state.played ?? "—"} · over: {state.hovered ?? "—"}
        </Typography>
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "OpeningBookList",
  demos: [
    { name: "From the start — click, or tab and Enter, to play; hover or focus to pick the arrow", render: () => demo(START_MOVES) },
    { name: "A long opening name (wraps)", render: () => demo(LONG_NAME) },
    { name: "Out of the book", render: () => demo([]) },
  ],
};

export default gallery;
