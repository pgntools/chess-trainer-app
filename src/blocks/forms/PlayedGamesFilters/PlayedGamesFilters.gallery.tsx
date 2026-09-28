import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { HEBREW_OPENINGS, LONG_OPENINGS, OPENINGS } from "./fixtures";
import PlayedGamesFilters from "./PlayedGamesFilters";
import type { PlayedGameSideFilter } from "./sideFilter";

type State = { side: PlayedGameSideFilter; opening: string | null };

const demo = (openings: readonly string[], { loading = false, initial = { side: "all", opening: null } }: { loading?: boolean; initial?: State } = {}) => (
  <WithState<State> initial={initial}>
    {(state, set) => (
      <PlayedGamesFilters
        side={state.side}
        onSideChange={(side) => set((before) => ({ ...before, side }))}
        opening={state.opening}
        onOpeningChange={(opening) => set((before) => ({ ...before, opening }))}
        openings={openings}
        openingsLoading={loading}
        testId="gallery-lobby"
      />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "PlayedGamesFilters",
  demos: [
    { name: "The book has landed — pick a side and an opening", render: () => demo(OPENINGS) },
    { name: "The book still loading — the opening off, saying why", render: () => demo([], { loading: true }) },
    { name: "A URL's opening no game reached, still shown as chosen", render: () => demo(OPENINGS, { initial: { side: "black", opening: "Dutch Defense" } }) },
    { name: "Long opening names", render: () => demo(LONG_OPENINGS, { initial: { side: "all", opening: LONG_OPENINGS[0] } }) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW_OPENINGS, { initial: { side: "white", opening: HEBREW_OPENINGS[0] } }) },
  ],
};

export default gallery;
