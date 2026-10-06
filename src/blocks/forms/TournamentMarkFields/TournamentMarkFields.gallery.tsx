import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { CollectionTournament } from "../../../lib/libraryCollections";
import type { TournamentGuess } from "../../../lib/tournamentKind";
import type { BlockFamilyId } from "../../families";
import TournamentMarkFields from "./TournamentMarkFields";
import { KNOCKOUT, OFF, TEAM_GUESS } from "./fixtures";

const live = (initial: CollectionTournament, canBeTournament: boolean, testId: string, suggestion?: TournamentGuess) => (
  <WithState<CollectionTournament> initial={initial}>
    {(mark, set) => (
      <TournamentMarkFields value={mark} onChange={set} canBeTournament={canBeTournament} suggestion={suggestion} testId={testId} />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "TournamentMarkFields",
  demos: [
    { name: "Off, the games' suggested type over it — Apply turns it on", render: () => live(OFF, true, "gallery-mark", TEAM_GUESS) },
    { name: "Marked as a knockout — every format with a table", render: () => live(KNOCKOUT, true, "gallery-mark-ko") },
    { name: "Games of several events — off, with its reason", render: () => live(KNOCKOUT, false, "gallery-mark-blocked") },
  ],
};

export default gallery;
