import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { Participant } from "../../../lib/tournamentParticipants";
import type { BlockFamilyId } from "../../families";
import ParticipantsTable from "./ParticipantsTable";
import { PARTICIPANTS_DEFAULT_SORT, type ParticipantsColumn } from "./participantsColumns";
import { CLUB, LONG, TEAMS } from "./fixtures";

const live = (participants: readonly Participant[], testId: string, teams = false, linked = true) => (
  <WithState<DataTableSort<ParticipantsColumn>> initial={PARTICIPANTS_DEFAULT_SORT}>
    {(sort, set) => (
      <ParticipantsTable
        participants={participants}
        sort={sort}
        onSort={(column, direction) => set({ column, direction })}
        playerLink={linked ? (player) => ({ href: `#player-${encodeURIComponent(player.name)}` }) : undefined}
        teams={teams}
        ariaLabel="Club championship — participants"
        testId={testId}
      />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "ParticipantsTable",
  demos: [
    { name: "Four players — titles, flags, an unrated player, names linked", render: () => live(CLUB, "gallery-participants") },
    { name: "A team event — each player's team", render: () => live(TEAMS, "gallery-participants-teams", true) },
    { name: "Names not linked", render: () => live(CLUB, "gallery-participants-plain", false, false) },
    { name: "A long field — 120 players", render: () => live(LONG, "gallery-participants-long") },
    { name: "No players", render: () => live([], "gallery-participants-empty") },
  ],
};

export default gallery;
