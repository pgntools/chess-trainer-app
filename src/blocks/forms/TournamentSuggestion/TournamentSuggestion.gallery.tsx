import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import TournamentSuggestion from "./TournamentSuggestion";
import { KNOCKOUT_GUESS, ROUND_ROBIN_GUESS, TEAM_SWISS_GUESS } from "./fixtures";
import type { TournamentGuess } from "../../../lib/tournamentKind";

const live = (guess: TournamentGuess, testId: string, disabled = false) => (
  <WithState<boolean> initial={false}>
    {(selected, set) => (
      <TournamentSuggestion guess={guess} selected={selected} onApply={() => set(true)} disabled={disabled} testId={testId} />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "TournamentSuggestion",
  demos: [
    { name: "A round robin — Apply puts it in the draft", render: () => live(ROUND_ROBIN_GUESS, "gallery-suggestion-rr") },
    { name: "A knockout, its field round by round", render: () => live(KNOCKOUT_GUESS, "gallery-suggestion-ko") },
    { name: "A team event", render: () => live(TEAM_SWISS_GUESS, "gallery-suggestion-team") },
    {
      name: "Already selected — Apply off, Save keeps it",
      render: () => <TournamentSuggestion guess={ROUND_ROBIN_GUESS} selected onApply={() => {}} testId="gallery-suggestion-selected" />,
    },
    { name: "A save under way", render: () => live(ROUND_ROBIN_GUESS, "gallery-suggestion-busy", true) },
  ],
};

export default gallery;
