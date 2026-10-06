import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import CollectionSettingsForm, { type CollectionSettingsDraft } from "./CollectionSettingsForm";
import type { TournamentGuess } from "../../../lib/tournamentKind";
import { PLAIN, ROUND_ROBIN, ROUND_ROBIN_GUESS, SWISS, TEAM_KNOCKOUT } from "./fixtures";

const live = (initial: CollectionSettingsDraft, canBeTournament: boolean, disabled = false, suggestion?: TournamentGuess) => (
  <WithState<CollectionSettingsDraft> initial={initial}>
    {(draft, set) => (
      <CollectionSettingsForm
        value={draft}
        onChange={(patch) => set((before) => ({ ...before, ...patch }))}
        canBeTournament={canBeTournament}
        suggestion={suggestion}
        disabled={disabled}
        testId="gallery-collection-settings"
      />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "CollectionSettingsForm",
  demos: [
    { name: "A collection never marked — the tournament switch off", render: () => live(PLAIN, true) },
    { name: "Marked as a Swiss — every format with a table, Arena not selectable yet", render: () => live(SWISS, true) },
    { name: "A round robin", render: () => live(ROUND_ROBIN, true) },
    { name: "A team knockout (CTA-142)", render: () => live(TEAM_KNOCKOUT, true) },
    {
      name: "The games' suggested type — Apply turns the mark on with it (CTA-142)",
      render: () => live(PLAIN, true, false, ROUND_ROBIN_GUESS),
    },
    {
      name: "A collection whose games do not share one event — the switch off, with its reason",
      render: () => live(SWISS, false),
    },
    { name: "A save under way — every field off", render: () => live(SWISS, true, true) },
  ],
};

export default gallery;
